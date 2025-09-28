// server/SearchService.js
const axios = require("axios");
const pLimit = require("p-limit").default;
const NodeCache = require("node-cache");
const stringSimilarity = require("string-similarity");
const { scrapePageText } = require("./modules/scraper");
const { getEmbeddings, cosineSimilarity } = require("./modules/embeddings");
const { chunkBySentences } = require("./modules/chunker");

const CACHE_TTL = 60 * 60; // 1 hour
const cache = new NodeCache({ stdTTL: CACHE_TTL });

const SEARCH_CONCURRENCY = 3;
const SCRAPE_CONCURRENCY = 3;
const searchLimit = pLimit(SEARCH_CONCURRENCY);
const scrapeLimit = pLimit(SCRAPE_CONCURRENCY);

class SearchService {
  static async googleSearch(query) {
    const cacheKey = `gsearch:${query}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CSE_ID) {
      throw new Error("Missing Google API credentials");
    }

    const params = {
      key: process.env.GOOGLE_API_KEY,
      cx: process.env.GOOGLE_CSE_ID,
      q: query, // no extra quotes
    };

    console.log("Google search with:", {
      key: process.env.GOOGLE_API_KEY.slice(0, 8) + "...",
      cx: process.env.GOOGLE_CSE_ID,
      q: query,
    });

    try {
      const res = await axios.get(
        "https://www.googleapis.com/customsearch/v1",
        {
          params,
          timeout: 8000,
        }
      );
      const items = res.data.items || [];
      cache.set(cacheKey, items);
      return items;
    } catch (err) {
      console.error("Google search error:", err.message);
      return [];
    }
  }

  static async checkChunkAgainstWeb(chunk, options = {}) {
    const { topResults = 10, similarityThreshold = 0.8 } = options; // bumped default to 10
    const matches = [];
    const searchResults = await this.googleSearch(chunk);

    console.log(`🔍 Searching for chunk: "${chunk.slice(0, 60)}..."`);
    console.log(`   Found ${searchResults.length} search results`);

    const candidates = (searchResults || []).slice(0, topResults);

    const tasks = candidates.map((candidate) =>
      scrapeLimit(async () => {
        const url = candidate.link;
        console.log(`➡️ Checking URL: ${url}`);

        const pageText = await scrapePageText(url);
        console.log(`   Extracted ${pageText.length} chars from page`);

        if (!pageText) return null;

        const pageChunks = chunkBySentences(pageText, 600).slice(0, 20);

        // embeddings
        const chunkEmbeds = (await getEmbeddings([chunk])) || [];
        const chunkEmbedding = chunkEmbeds[0] || null;
        const pageEmbeddings = await getEmbeddings(pageChunks);

        let foundMatches = [];

        if (chunkEmbedding && pageEmbeddings) {
          for (let i = 0; i < pageEmbeddings.length; i++) {
            const emb = pageEmbeddings[i];
            if (!emb) continue;
            const similarity = cosineSimilarity(chunkEmbedding, emb);
            console.log(
              `   🔎 Similarity between chunk and page segment: ${similarity.toFixed(
                3
              )}`
            );

            if (similarity >= similarityThreshold) {
              foundMatches.push({
                source: url,
                matchedText: pageChunks[i],
                similarity: Number(similarity.toFixed(3)),
              });
            }
          }
        } else {
          // fallback string similarity
          for (const pc of pageChunks) {
            const similarity = stringSimilarity.compareTwoStrings(chunk, pc);
            console.log(`   🔎 String similarity: ${similarity.toFixed(3)}`);

            if (similarity >= similarityThreshold) {
              foundMatches.push({
                source: url,
                matchedText: pc,
                similarity: Number(similarity.toFixed(3)),
              });
            }
          }
        }

        console.log(
          `   ✅ Found ${foundMatches.length} matches above threshold at ${url}`
        );

        return foundMatches;
      })
    );

    const resolved = await Promise.all(tasks);

    // flatten and filter
    resolved.forEach((siteMatches) => {
      if (siteMatches && siteMatches.length) {
        matches.push(...siteMatches);
      }
    });

    return matches;
  }

  static async checkChunks(chunks, opts = {}) {
    const results = [];
    const tasks = chunks.map((chunk) =>
      searchLimit(async () => {
        try {
          const chunkMatches = await this.checkChunkAgainstWeb(chunk, opts);
          if (chunkMatches && chunkMatches.length) {
            chunkMatches.forEach((m) => results.push({ chunk, ...m }));
          }
        } catch (err) {
          console.error("checkChunks error:", err.message);
        }
      })
    );
    await Promise.all(tasks);
    return results;
  }
}

module.exports = SearchService;
