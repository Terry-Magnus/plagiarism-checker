// server/testGoogle.js
require("dotenv").config();

const axios = require("axios");

(async () => {
  const KEY = process.env.GOOGLE_API_KEY;
  const CSE = process.env.GOOGLE_CSE_ID;

  const q = `"The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France."`;
  if (!KEY || !CSE) {
    console.error("Missing env GOOGLE_API_KEY or GOOGLE_CSE_ID");
    process.exit(1);
  }
  try {
    const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key: KEY, cx: CSE, q },
      timeout: 10000,
    });
    console.log("status:", res.status);
    console.log("items:", (res.data.items || []).length);
    console.log(
      "first item (title/snippet):",
      res.data.items &&
        res.data.items[0] && {
          title: res.data.items[0].title,
          snippet: res.data.items[0].snippet,
          link: res.data.items[0].link,
        }
    );
  } catch (err) {
    console.error(
      "Google search error:",
      err.response && err.response.data ? err.response.data : err.message
    );
  }
})();
