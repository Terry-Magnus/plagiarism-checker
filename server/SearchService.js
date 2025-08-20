const axios = require("axios");
const stringSimilarity = require("string-similarity");

class SearchService {
  static async checkPlagiarism(chunks) {
    const results = [];
    for (const chunk of chunks) {
      try {
        const response = await axios.get(
          "https://www.googleapis.com/customsearch/v1",
          {
            params: {
              key: process.env.GOOGLE_API_KEY,
              cx: process.env.GOOGLE_CSE_ID,
              q: `"${chunk}"`,
            },
          }
        );
        const matches = response.data.items || [];
        if (matches.length > 0) {
          const topMatch = matches[0].snippet;
          const similarity = stringSimilarity.compareTwoStrings(
            chunk,
            topMatch
          );
          if (similarity > 0.8) {
            results.push({ chunk, source: matches[0].link, similarity });
          }
        }
      } catch (error) {
        console.error(`Search error for chunk: ${chunk}`, error.message);
      }
    }
    return results;
  }
}

module.exports = SearchService;
