const { chromium } = require('playwright');
const path = require('path');

let [, , url, outPath] = process.argv;

if (!url || !outPath) {
  console.error('Usage: node screenshot_gfw.js <url> <output_path>');
  process.exit(1);
}
url = url.replace('reportLoadVessels=true', 'reportLoadVessels=false');

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

  const start = Date.now();
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  async function waitForFullIdle() {
    let newRequestFired;
    do {
      newRequestFired = false;
      const onRequest = () => {
        newRequestFired = true;
      };
      page.on('request', onRequest);
      await page.waitForLoadState('networkidle');
      page.off('request', onRequest);
      if (!newRequestFired) {
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestIdleCallback(resolve, { timeout: 10000 }),
            ),
        );
        await page.waitForTimeout(1000);
      }
    } while (newRequestFired);
  }

  try {
    await page.goto(url + '&screenshotMode=true', {
      waitUntil: 'networkidle',
      timeout: 180000,
    });
    await waitForFullIdle();
    const resolvedPath = path.resolve(outPath);
    await page.screenshot({
      path: resolvedPath,
      fullPage: false,
      timeout: 180000,
    });
    console.log(
      `Saved: ${resolvedPath} (${((Date.now() - start) / 1000).toFixed(1)}s)`,
    );
  } catch (e) {
    console.error(`Failed: ${e.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
