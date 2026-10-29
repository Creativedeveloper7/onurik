// Renders x-awareness-poster.html to PNG (1600×900) and a sharper 2× JPG for upload.
// Usage: node marketing/render-poster.cjs   (needs Playwright + Chromium)
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const src = "file://" + path.join(__dirname, "x-awareness-poster.html");
  const browser = await chromium.launch();
  for (const scale of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: scale });
    await page.goto(src, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const out = scale === 1 ? "x-awareness-poster-1600x900.png" : "x-awareness-poster-3200x1800.jpg";
    await page.screenshot(
      scale === 1
        ? { path: path.join(__dirname, out) }
        : { path: path.join(__dirname, out), type: "jpeg", quality: 92 },
    );
    await page.close();
    console.log("wrote", out);
  }
  await browser.close();
})();
