const { chromium } = require('playwright');
const path = require('path');

const [, , url, outPath] = process.argv;

if (!url || !outPath) {
  console.error('Usage: node screenshot_gfw.js <url> <output_path>');
  process.exit(1);
}

(async () => {
  const proxyUrl =
    process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.HTTP_PROXY;

  const launchOptions = { headless: true };
  if (proxyUrl) {
    launchOptions.proxy = { server: proxyUrl };
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  try {
    await page.goto(url + '&screenshotMode=true', {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
    await page.waitForTimeout(5000);
    const resolvedPath = path.resolve(outPath);
    await page.screenshot({ path: resolvedPath, fullPage: false });
    console.log(`Saved: ${resolvedPath}`);
  } catch (e) {
    console.error(`Failed: ${e.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
