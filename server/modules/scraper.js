const puppeteer = require("puppeteer");

async function scrapePageText(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-http2"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    const text = await page.evaluate(() => {
      const removeEls = [
        "script",
        "style",
        "noscript",
        "iframe",
        "header",
        "footer",
        "nav",
        "form",
      ];
      removeEls.forEach((sel) =>
        document.querySelectorAll(sel).forEach((el) => el.remove())
      );
      return document.body.innerText || "";
    });

    return text.replace(/\s+/g, " ").trim();
  } catch (err) {
    console.warn(`Skipping site (scrape failed): ${url} -> ${err.message}`);
    return ""; // 👈 ensures skipped
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = {
  scrapePageText,
};
