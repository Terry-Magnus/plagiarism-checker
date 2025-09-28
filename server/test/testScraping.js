const { scrapePageText } = require("../modules/scraper");

(async () => {
  const url = "https://en.wikipedia.org/wiki/Eiffel_Tower";
  const text = await scrapePageText(url);
  console.log("length:", text.length);
  console.log("preview:", text.slice(0, 500));
})();
