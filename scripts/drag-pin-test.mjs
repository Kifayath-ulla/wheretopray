import { chromium, devices } from 'playwright';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core'), 'utf8');
const OUT = path.join(process.env.HOME, 'Projects/wheretopray-shots/drag-pin');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:3010';
const fails = [];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('wtp-theme', t); } catch {}
  }, theme);
}

const browser = await chromium.launch({ headless: true });
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13'].userAgent,
    colorScheme: theme,
    geolocation: { latitude: 12.9716, longitude: 77.5946, accuracy: 9 },
    permissions: ['geolocation'],
  });
  await ctx.addInitScript((t) => {
    localStorage.setItem('wtp-theme', t);
    sessionStorage.setItem('wtp-loc', JSON.stringify({ lat: 12.9716, lng: 77.5946, acc: 9, t: Date.now(), label: 'Bengaluru' }));
  }, theme);
  const page = await ctx.newPage();
  const tag = `add-390-${theme}`;
  let posted = null;
  await page.route('**/api/submissions', async (route) => {
    if (route.request().method() === 'POST') {
      posted = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 'test-drag-pin' }) });
    } else await route.continue();
  });
  await page.goto(BASE + '/add', { waitUntil: 'networkidle', timeout: 90000 });
  await setTheme(page, theme);
  await page.waitForSelector('[data-testid="pin-picker"]', { timeout: 30000 });
  await page.waitForTimeout(1500);

  const overflow = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  if (overflow.sw > overflow.cw + 1) fails.push(`${tag} horizontal overflow ${overflow.sw}>${overflow.cw}`);

  const before = await page.evaluate(() => {
    const s = document.querySelector('[data-testid="pin-status"]')?.textContent || '';
    return s;
  });
  if (!/Pin set/i.test(before)) fails.push(`${tag} missing pin status: ${before}`);

  // Nudge east — coordinates in parent state should change and show up on submit.
  const east = page.getByTestId('nudge-e');
  const box = await east.boundingBox();
  if (!box || box.height < 44 || box.width < 44) fails.push(`${tag} nudge E target too small ${JSON.stringify(box)}`);
  await east.click();
  await page.waitForTimeout(400);
  await east.click();
  await page.waitForTimeout(400);

  // Drag the map (pan) with touch.
  const map = page.getByTestId('pin-map');
  const mb = await map.boundingBox();
  if (mb) {
    await page.touchscreen.tap(mb.x + mb.width * 0.5, mb.y + mb.height * 0.5);
    await page.waitForTimeout(200);
    // drag from center toward left (pan map right / pin relative west)
    await page.mouse.move(mb.x + mb.width * 0.6, mb.y + mb.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(mb.x + mb.width * 0.3, mb.y + mb.height * 0.5, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(600);
  } else fails.push(`${tag} no map box`);

  await page.getByPlaceholder(/Masjid-e-Noor/i).fill('Test Masjid Drag Pin');
  // Ensure city for validation if reverse failed
  const details = page.locator('details').filter({ hasText: /Address/i }).first();
  await details.evaluate((el) => { el.open = true; });
  const city = page.getByLabel(/^City$/i);
  if (await city.count()) {
    const v = await city.inputValue();
    if (!v) await city.fill('Bengaluru');
  }
  // Wait past MIN_FILL_MS
  await page.waitForTimeout(3200);
  await page.getByRole('button', { name: /Add this place/i }).click();
  await page.waitForTimeout(800);

  if (!posted) fails.push(`${tag} no mocked POST`);
  else {
    const lat = Number(posted.payload?.lat), lng = Number(posted.payload?.lng);
    if (!isFinite(lat) || !isFinite(lng)) fails.push(`${tag} missing lat/lng in payload`);
    // Should have moved from exact BLR default after nudges/drag
    if (Math.abs(lng - 77.5946) < 1e-7 && Math.abs(lat - 12.9716) < 1e-7) {
      fails.push(`${tag} coordinates did not change after nudge/drag`);
    }
    if (!/pin adjusted by user|Quick add/i.test(posted.payload?.notes || '')) {
      fails.push(`${tag} notes missing: ${posted.payload?.notes}`);
    }
    console.log(tag, 'payload coords', lat, lng, 'notes', posted.payload?.notes);
  }

  // Clear sticky :hover from prior taps (iOS/mobile emulation) before contrast checks.
  await page.evaluate(() => document.body.focus?.());
  await page.mouse.move(0, 0);
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, {
      runOnly: ['color-contrast'],
      exclude: [['.maplibregl-ctrl-attrib'], ['.maplibregl-ctrl-group'], ['.maplibregl-canvas'], ['.maplibregl-map'], ['.maplibregl-marker'], ['[class*="maplibre"]']],
    });
    return r.violations.map((v) => `${v.id}:${v.nodes.length}:${JSON.stringify(v.nodes[0]?.target)}`);
  });
  if (violations.length) fails.push(`${tag} contrast ${violations.join('; ')}`);

  await page.screenshot({ path: path.join(OUT, `${tag}.png`), fullPage: true });
  await ctx.close();
}
await browser.close();
if (fails.length) {
  console.error('FAILS:\n' + fails.join('\n'));
  process.exit(1);
}
console.log('drag-pin tests OK');
