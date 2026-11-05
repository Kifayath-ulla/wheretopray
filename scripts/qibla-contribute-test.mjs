import { chromium, devices } from 'playwright';
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const axe = fs.readFileSync(require.resolve('axe-core'), 'utf8');
const OUT = process.env.HOME + '/Projects/wheretopray-shots/qibla'; fs.mkdirSync(OUT, { recursive: true });
const B = 'http://127.0.0.1:3010';
const pages = ['/qibla', '/contribute', '/share', '/about', '/', '/add', '/directory', '/bengaluru/gaps', '/place/khang-h-sh-h-n-r-jam-l-gn-10304233'];
const fails = [];
const b = await chromium.launch();
for (const [w, h] of [[375, 667], [390, 844], [430, 932]]) for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent, colorScheme: theme });
  await ctx.addInitScript((t) => { localStorage.setItem('wtp-theme', t); sessionStorage.setItem('wtp-loc', JSON.stringify({ lat: 12.97, lng: 77.59, label: 'Bengaluru' })); }, theme);
  const p = await ctx.newPage();
  for (const path of pages) {
    await p.goto(B + path, { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(path === '/qibla' ? 3500 : 800);
    const tag = path.replace(/\W+/g, '_') + '-' + w + '-' + theme;
    const r = await p.evaluate(() => {
      const over = document.documentElement.scrollWidth > innerWidth + 1;
      window.scrollTo(0, document.body.scrollHeight);
      return { over };
    });
    await p.waitForTimeout(300);
    const cover = await p.evaluate(() => {
      const tb = document.querySelector('nav.tabbar')?.getBoundingClientRect();
      if (!tb) return null;
      const els = [...document.querySelectorAll('main button, main input, main a, main textarea')].filter((e) => e.offsetParent && !e.closest('[aria-hidden=true], details:not([open])'));
      const last = els.at(-1); if (!last) return null;
      const lr = last.getBoundingClientRect();
      return lr.bottom > tb.top + 1 ? (last.outerHTML.slice(0, 80)) : null;
    });
    if (r.over) fails.push(tag + ' horizontal overflow');
    if (cover && path !== '/') fails.push(tag + ' last control under tabbar: ' + cover);
    await p.addScriptTag({ content: axe });
    const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ['color-contrast'] })).violations.map((x) => x.nodes.length + ' ' + x.nodes[0].target));
    if (v.length) fails.push(tag + ' contrast ' + v.join(';'));
    if (w === 390) { await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: OUT + '/' + tag + '.png' }); }
  }
  await ctx.close();
}
// Qibla live: simulate iOS compass heading to the bearing -> Facing Qibla
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
await ctx.addInitScript(() => { localStorage.setItem('wtp-theme', 'dark'); sessionStorage.setItem('wtp-loc', JSON.stringify({ lat: 12.97, lng: 77.59, label: 'Bengaluru' })); });
const p = await ctx.newPage();
await p.goto(B + '/qibla', { waitUntil: 'networkidle' });
const brg = await p.evaluate(() => parseFloat(document.querySelector('[data-testid=bearing] .text-5xl').textContent));
await p.evaluate((hd) => { const e = new Event('deviceorientation'); Object.assign(e, { alpha: 0, webkitCompassHeading: hd }); dispatchEvent(e); }, brg);
await p.waitForTimeout(400);
const facing = await p.locator('[data-testid=facing]').count();
if (!facing) fails.push('Facing Qibla state did not show');
await p.screenshot({ path: OUT + '/qibla-facing-dark.png' });
await p.evaluate((hd) => { const e = new Event('deviceorientation'); Object.assign(e, { alpha: 0, webkitCompassHeading: hd }); dispatchEvent(e); }, brg - 40);
await p.waitForTimeout(400);
console.log('turn hint:', await p.locator('text=/Turn right/').count());
await p.screenshot({ path: OUT + '/qibla-turn-dark.png' });
await b.close();
console.log(fails.length ? fails.join('\n') : 'ALL PASS');
