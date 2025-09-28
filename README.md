# Plagiarism Checker

A server-side plagiarism detection service that searches the web for likely sources of copied text, scrapes page text with a headless browser, and compares text semantically using local embeddings (with a string-similarity fallback). Designed to handle both short essays and large documents (e.g., multi-page PDFs).

---

## Table of contents

- Overview
- Initial system (original) vs Current system (what we have now) — detailed comparison
- Architecture & module breakdown (in-depth explanations)
- Installation & configuration (summary)
- How it works step-by-step (runtime flow)
- Interpreting and tuning similarity results
- Troubleshooting (common failure modes and fixes)
- Security & sanitization notes
- Performance, scaling and production guidance
- Future improvements & checklist for next steps

---

# Overview

This project detects plagiarism by:

1. Accepting user text or uploaded files.
2. Splitting the input into sentence-aware chunks.
3. Searching the web using Google Custom Search to find candidate pages.
4. Scraping full page text with Puppeteer (headless Chromium).
5. Converting text chunks to embeddings (local model `all-MiniLM-L6-v2` via `@xenova/transformers`) and comparing them with cosine similarity.
6. Falling back to a string-similarity comparison if the embedding model is unavailable.
7. Returning matched source(s), matched text snippets, similarity scores and an overall plagiarism percentage. Optionally generate a PDF report.

# Initial system (original) vs Current system — detailed comparison

### Initial (original) implementation — what you started with

- **Search approach:** Each input chunk was wrapped in quotes and passed directly to Google Custom Search. The system compared the input chunk **only to the Google snippet** returned for each search result.
- **Similarity method:** Character/string-based comparison (e.g., `string-similarity.compareTwoStrings`), typically good for near-exact matches.
- **Scraping:** _None._ The system used only the snippet text that Google returned.
- **Pros**

  - Fast (no full-page fetching).
  - Low resource usage (no headless browser, no embedding model).
  - Simple to implement.

- **Cons**

  - Snippets are short, trimmed and often paraphrased; high false negatives for paraphrase and partial matches.
  - Very brittle — small changes in phrasing drop scores drastically.
  - Limited context — snippet may not contain the sentence/paragraph you’re testing.
  - Lacks capacity to handle paraphrasing or semantic similarity.

### Current (improved) implementation — what we have now

- **Search approach:** Google Custom Search for candidate URLs, then fetch **full page text**.
- **Scraping:** Use **Puppeteer** to load pages and extract `document.body.innerText`, removing headers/footers/scripts/etc., so we compare against the actual web content (not just snippets).
- **Similarity method:** Prefer **semantic embeddings** (MiniLM L6) and **cosine similarity** for comparison. If the embedding model cannot be loaded (e.g., blocked downloads), fall back to `string-similarity`.
- **Chunking:** Both the input and scraped pages are split into sentence-aware chunks so we compare semantically similar windows of text.
- **Pros**

  - Much better detection of paraphrase and semantic similarity.
  - Full context -> better and clearer matches for reporting.
  - Returns the exact matched passage from the source for manual review.

- **Cons**

  - Heavier: scraping and embedding generation take time and CPU.
  - Scraper can be blocked on some sites (skip those and continue).
  - Google quota limitations become more salient — you’ll want caching and batching.

**Why this change?**
Because snippet-only comparison produced many missed cases (false negatives) — the primary objective of plagiarism detection is to catch paraphrasing and non-exact reuses, which semantic embeddings accomplish far better than literal string matching.

---

# Architecture & module breakdown (in-depth)

Below are the modules in your repo and their roles, plus the decision rationale for each.

### `chunker.js` (module)

**What it does**

- Sentence-aware chunking: breaks any input text into a list of chunks, aiming for a maximum length (default ~300 chars for input chunks; your scraped pages are chunked at ~600 chars).
- Keeps sentence boundaries where possible to preserve semantic meaning.

**Why it’s used**

- Embeddings work best on reasonably-sized text spans. If you embed huge documents wholesale the vector dilutes; if you embed single words you lose context.
- Chunking creates comparable units between user text and scraped page segments.

**Notes / tuning**

- You can tune maxLen (300–600 chars) depending on typical paragraph size.
- Smaller chunks increase recall but produce more comparisons (more compute).

---

### `embeddings.js` (module)

**What it does**

- Attempts to dynamically import `@xenova/transformers` and instantiate a feature-extraction pipeline (MiniLM L6).
- Exposes `getEmbeddings(texts[])` which returns vectors for each text, and `cosineSimilarity(vecA, vecB)` to compute similarity scores.
- If `@xenova/transformers` cannot be loaded, the module returns `null` and the caller is expected to fallback to string-similarity.

**Why it’s used**

- Embeddings capture semantic meaning and are robust to rewording. They make paraphrase detection feasible.
- Running locally removes reliance on a paid external API; but the dynamic import gracefully handles unavailable models.

**Notes**

- Model download can be blocked in some network environments — have a plan (pre-download models in CI, or allow fallback).
- MiniLM gives ~384-dim vectors — good speed/accuracy tradeoff for this use case.

---

### `scraper.js` (module)

**What it does**

- Uses **Puppeteer** to open the page, waits for DOM to be available, removes noise elements (`script`, `style`, `noscript`, `iframe`, `header`, `footer`, `nav`, `form`) and returns normalized `document.body.innerText`.
- Returns an empty string on failure instead of throwing — the system skips blocked sites gracefully.

**Why Puppeteer (and not Cheerio)**

- Puppeteer renders the page like a real browser — necessary for JavaScript-heavy sites and pages that dynamically load content.
- Cheerio + axios is quicker and lighter but only works for static HTML pages. Since the search results include modern JS-heavy sites, Puppeteer gives better coverage and more reliable text extraction.

**Trade-offs**

- Puppeteer consumes more memory/CPU and is slower than axios+cheerio.
- Many sites run anti-bot protections. The scraper logs and skips such sites rather than blocking the whole process.

---

### `SearchService.js` (service)

**What it does**

- Accepts a chunk, queries Google Custom Search for candidate URLs, caches results, iterates over the top N URLs, calls the scraper to extract page text, chunks the page text, gets embeddings for the input chunk and page segments, computes cosine similarity (or string-similarity fallback), collects _all_ page segments above threshold, and returns matches in the form: `{ chunk, matchedText, source, similarity }`.

**Why it’s separate**

- Encapsulates search- and web-facing logic.
- Central place to implement caching, throttling, retry logic and logging.
- Keeps PlagiarismService cleaner (which focuses on orchestration and reporting).

**Important implementation details**

- Caching (in-memory TTL) for Google results and scraped pages to save Google quota and avoid re-scraping.
- Concurrency limits (`p-limit`) to avoid overloading the Google API or spawning too many Puppeteer instances.
- Query generation: avoid over-quoting very long chunks — try shorter n-grams and unquoted queries when needed (to increase recall).
- Returns multiple matches per chunk (not just top one).

---

### `PlagiarismService.js` (service)

**What it does**

- Orchestrates the flow: accepts user text, runs chunker, delegates chunk comparisons to `SearchService.checkChunks`, deduplicates results, computes plagiarism percentage (unique matched chunks / total chunks \* 100), and formats the result object for the client.

**Why it’s separate**

- Keeps the high-level policy (how we count plagiarism, dedup rules, thresholds) in one place, isolated from the mechanical search/scrape/compare logic.

---

### Routes & PDF generation (API)

- **`POST /check-plagiarism`** — accepts `text` in JSON or a `file` upload (PDF/TXT). The route sanitizes input (using your reusable sanitizer), extracts text from PDFs (via `pdf-parse`), calls `PlagiarismService.analyzeTextAgainstWeb()` and returns the JSON report.
- **`POST /generate-report`** — accepts `{ text, results, plagiarismPercentage }` and streams a PDF back to the client (via `pdfkit`). The PDF includes both the input chunk and the matched text from the source, plus similarity scores and clickable source URLs.

**Notes**

- For PDF safety you strip non-printable characters and optionally sanitize HTML before embedding text in the PDF.

---

### Utilities and supporting libraries

- `node-cache` — in-memory caching for search results and scraped pages (1h TTL recommended).
- `p-limit` — concurrency control; **note**: in CommonJS with `p-limit` v4+ you must import `.default` (`require('p-limit').default`) or use `p-limit@3`.
- `sanitize-html` — sanitize user-submitted HTML to plain text at the API boundary (recommended).
- `string-similarity` — fallback similarity method if embeddings are unavailable.
- `pdf-parse`, `multer` — handling file uploads and converting PDFs to text on the server.

---

# Installation & configuration (summary)

**Prereqs**

- Node 16+ (matching your environment).
- `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` configured in `.env`.
- Optional: `@xenova/transformers` installed for embeddings (if you want local embeddings).

**Quick steps**

1. `git clone ... && cd server`
2. `npm install` (include puppeteer, @xenova/transformers if you want embeddings, pdf-parse, sanitize-html, pdfkit, p-limit, node-cache, string-similarity, etc.)
3. Add `.env`:

   ```
   PORT=5000
   GOOGLE_API_KEY=...
   GOOGLE_CSE_ID=...
   ```

4. Ensure your server entry point calls `require('dotenv').config()` before other modules.
5. `node server.js` (or use nodemon).

**Notes**

- If you plan to run Puppeteer in a container, pass `--no-sandbox --disable-setuid-sandbox`.
- If `@xenova/transformers` is blocked by network policy, the system falls back to string similarity; decide whether you require the model to be pre-downloaded in CI for production.

---

# How it works — runtime flow (step-by-step)

1. **Receive & sanitize input**: the route first sanitizes input (strip tags via `sanitize-html` and remove non-printable chars) to avoid XSS and PDF rendering issues.
2. **Extract text from files (if any)**: PDFs are parsed with `pdf-parse`.
3. **Chunk input**: call `chunker.chunkBySentences(text, 300)` to produce input chunks.
4. **For each chunk**:

   - `SearchService.googleSearch(chunk)` fetches top N candidate URLs (cached).
   - For each candidate:

     - `scraper.scrapePageText(url)` fetches rendered text with Puppeteer. If the scraper returns empty, skip.
     - `chunkBySentences` splits the page text into page segments (600 chars).
     - `getEmbeddings([chunk])` and `getEmbeddings(pageSegments)` produce vectors (or return null when model unavailable).
     - Compute cosine similarity for each page segment vs chunk (or use string similarity fallback).
     - Collect matches with `similarity >= threshold`.

5. **Aggregate**: deduplicate matches and calculate plagiarism percentage.
6. **Return JSON**: include the original text, results array (each item has chunk, matchedText, source, similarity), and plagiarismPercentage.
7. **PDF (optional)**: `/generate-report` consumes the JSON result and renders a PDF showing both the input and matched text side-by-side.

---

# Interpreting and tuning similarity results

- **Similarity metric**: cosine similarity on embeddings returns values typically 0.0–1.0 (near 1.0 = very similar). For string-similarity, values are 0–1 similarly.
- **Suggested thresholds**

  - `>= 0.80` — very likely near-verbatim or strong match.
  - `0.65–0.80` — probable paraphrase or partial overlap (good default to flag for human review).
  - `< 0.60` — weak match; consider lowering only for exploratory checks.

- **Recommendation**: set default `similarityThreshold` ≈ `0.65` to capture paraphrase while avoiding too many false positives. Log “near matches” (e.g., `>= 0.55 && < threshold`) for reviewer visibility.
- **Exact-match detection**: if you need to guarantee 100% on verbatim text, run a string equality / normalized-string comparison in addition to embeddings.

---

# Troubleshooting — common situations & fixes

**0 results (plagiarismPercentage = 0)**

- Check Google search results for the chunk. If `searchResults.length === 0`, change your query generation (try an unquoted or shorter n-gram).
- If there are search results but scraped pages are empty → scraper is failing (site blocked). Check logs for Puppeteer errors.
- If scraped text exists but similarities are all below threshold → lower the threshold to ~0.65 or log similarity distribution to see near-misses.

**403/429 from Google**

- Ensure `process.env.GOOGLE_API_KEY` and `GOOGLE_CSE_ID` are present at runtime (call `console.log(process.env.GOOGLE_API_KEY?.slice(0,8))` to verify).
- Check Google cloud quota and billing.
- Use caching & batching to reduce calls; consider self-hosted SearxNG for heavy usage.

**Embedding model unavailable**

- If `@xenova/transformers` cannot be imported (firewalls), the module returns `null` and code falls back to `string-similarity`. For production, pre-download model weights or host a small embedding service.

**Puppeteer failures**

- Some sites have aggressive anti-bot measures. Strategy:

  - Skip sites that fail and continue.
  - Optionally use a scraping API or rotate proxies.
  - Add realistic user-agent and extra HTTP headers (already done).

**p-limit**

- If you get `pLimit is not a function`, either `require("p-limit").default` (for v4+) or install `p-limit@3` and `require("p-limit")` normally.

---

# Security & sanitization

- **Sanitize all user input** at API boundary. Use `sanitize-html` with `allowedTags: []` to strip HTML, then remove non-printable characters via regex before any processing or PDF writing.
- **Never expose API keys to the browser** — all Google calls must be server-side.
- **PDF safe text**: strip non-printable control characters (regex: `/[^\x09\x0A\x0D\x20-\x7E]/g`) to avoid PDF rendering issues.
