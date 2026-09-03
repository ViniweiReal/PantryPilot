const path = require('path');
const { chromium } = require('C:\\Users\\Vinni\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright');

(async () => {
  const output = __dirname;
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  const brand = page.locator('header .brand');
  await brand.waitFor({ state: 'visible' });
  if (await brand.locator('.brand__flame').count() !== 1) throw new Error('Flame mark is missing');
  if (await brand.locator('.brand__word').innerText() !== 'PantryPilot') throw new Error('Wordmark is incorrect');
  const box = await brand.boundingBox();
  if (!box || box.width < 120 || box.height < 35) throw new Error('Desktop logo is too small');
  await brand.screenshot({ path: path.join(output, 'site-logo-desktop.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const mobileBrand = page.locator('header .brand');
  if (!(await mobileBrand.isVisible())) throw new Error('Mobile logo is not visible');
  await mobileBrand.screenshot({ path: path.join(output, 'site-logo-mobile.png') });
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  await browser.close();
})();
