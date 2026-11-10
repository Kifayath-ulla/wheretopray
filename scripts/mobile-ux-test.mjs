import { chromium, devices } from 'playwright';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core'), 'utf8');

const OUT = path.join(process.env.HOME, 'Projects/wheretopray-shots/mobile-ux');
fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x740', width: 360, height: 740 },
];
const themes = ['light', 'dark'];
const BASE = 'http://127.0.0.1:3010/';
const results = [];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('wtp-theme', t); } catch {}
  }, theme);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  for (const vp of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: true,
        hasTouch: true,
        geolocation: { latitude: 12.9716, longitude: 77.5946, accuracy: 20 },
        permissions: ["geolocation"],
        userAgent: devices['iPhone 12'].userAgent,
        colorScheme: theme === 'dark' ? 'dark' : 'light',
      });
      const page = await context.newPage();
      const label = `${vp.name}-${theme}`;
      const note = { label, ok: true, issues: [] };
      try {
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
        await setTheme(page, theme);
        await page.waitForTimeout(600);

        const locate = page.getByRole('button', { name: /Use my location/i });
        const search = page.getByLabel(/Search mosques, areas or pincode/i);
        if (!(await locate.isVisible())) note.issues.push('Use my location not visible');
        if (!(await search.isVisible())) note.issues.push('search not visible');

        const searchBox = await search.boundingBox();
        if (!searchBox || searchBox.y < 0 || searchBox.y > vp.height * 0.85) {
          note.issues.push(`search y out of reach: ${searchBox && searchBox.y}`);
        }
        const fontSize = await search.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        if (fontSize < 16) note.issues.push(`search font ${fontSize}px < 16`);

        const locateBox = await locate.boundingBox();
        if (!locateBox || locateBox.height < 44) note.issues.push(`Use my location height ${locateBox && locateBox.height}`);

        const overflowX = await page.evaluate(() => {
          const doc = document.documentElement;
          return { sw: doc.scrollWidth, cw: doc.clientWidth, body: document.body.scrollWidth };
        });
        if (overflowX.sw > overflowX.cw + 1 || overflowX.body > overflowX.cw + 1) {
          note.issues.push(`horizontal overflow sw=${overflowX.sw} cw=${overflowX.cw}`);
        }

        // Sticky controls: scroll the single list scroller; search stays in view.
        const scroller = page.locator('.sheet-scroll').first();
        await scroller.evaluate((el) => { el.scrollTop = 900; });
        await page.waitForTimeout(350);
        if (!(await search.isVisible())) note.issues.push('search lost after scroll');
        const searchAfter = await search.boundingBox();
        if (!searchAfter || searchAfter.y < 0 || searchAfter.y > vp.height * 0.6) {
          note.issues.push(`search not sticky after scroll y=${searchAfter && searchAfter.y}`);
        }

        const filters = page.getByRole('button', { name: /^Filters/ });
        if (await filters.count()) {
          await filters.click();
          await page.waitForTimeout(300);
          const women = page.getByRole('button', { name: /Women'?s area/i });
          if (!(await women.first().isVisible())) note.issues.push('filters panel chips not visible');
          await filters.click();
        } else {
          note.issues.push('Filters button missing on mobile');
        }

        const mapBtn = page.getByRole('button', { name: /^Map$/ });
        if (!(await mapBtn.count())) note.issues.push('Map toggle missing');

        // Tabs
        for (const tab of ['Explore', 'Qibla', 'Add', 'Directory']) {
          const t = page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: tab });
          if (!(await t.count())) note.issues.push(`tab missing: ${tab}`);
        }

        // Qibla page Kaaba marker
        await page.goto(BASE + 'qibla', { waitUntil: 'networkidle', timeout: 60000 });
        await setTheme(page, theme);
        await page.waitForTimeout(400);
        await page.getByRole('button', { name: /Use my location/i }).waitFor({ timeout: 15000 }).catch(() => {});
        const kaaba = page.locator('[data-testid="kaaba"]');
        try { await kaaba.first().waitFor({ state: 'attached', timeout: 10000 }); } catch {}
        if (!(await kaaba.count())) note.issues.push('Kaaba marker missing on Qibla');

        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await setTheme(page, theme);
        await page.waitForTimeout(400);

        await page.addScriptTag({ content: axeSource });
        await page.waitForTimeout(400);
        const axe = await page.evaluate(async () => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const run = () => window.axe.run(document.body, {
            runOnly: { type: 'rule', values: ['color-contrast'] },
            exclude: [['.maplibregl-ctrl-attrib'], ['.maplibregl-ctrl-group'], ['.maplibregl-canvas'], ['.maplibregl-map'], ['.maplibregl-marker'], ['[class*="maplibre"]']],
          });
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          let r = await run();
          if (r.violations.length) { await new Promise((res) => setTimeout(res, 400)); r = await run(); }
          return { violations: r.violations.map((v) => ({ id: v.id, nodes: v.nodes.length, help: v.help, samples: v.nodes.slice(0, 2).map((n) => ({ t: n.target, h: n.html.slice(0, 120) })) })) };
        });
        note.axe = axe;
        if (axe.violations.length) note.issues.push(`axe contrast: ${JSON.stringify(axe.violations)}`);

        await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: false });
      } catch (e) {
        note.ok = false;
        note.issues.push(String(e && e.stack || e));
      }
      if (note.issues.length) note.ok = false;
      results.push(note);
      await context.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
  if (failed.length) process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
