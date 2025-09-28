// server/embeddings.js
// Tries to dynamically import @xenova/transformers. If that fails, returns null to signal fallback.
let embedder = null;

async function initEmbedder() {
  if (embedder) return embedder;
  try {
    // dynamic import works in CommonJS
    const mod = await import("@xenova/transformers");
    // pipeline is exported from the package
    embedder = await mod.pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    return embedder;
  } catch (err) {
    console.warn(
      "Could not load @xenova/transformers (embeddings disabled):",
      err.message
    );
    embedder = null;
    return null;
  }
}

async function getEmbeddings(texts = []) {
  if (!texts || texts.length === 0) return [];
  const model = await initEmbedder();
  if (!model) return null; // signal fallback to caller
  const embeddings = [];
  for (const t of texts) {
    try {
      const out = await model(t, { pooling: "mean", normalize: true });
      // out.data is usually a Float32Array
      embeddings.push(Array.from(out.data));
    } catch (err) {
      console.warn("Embedding failed for one item:", err.message);
      embeddings.push(null);
    }
  }
  return embeddings;
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    na += vecA[i] * vecA[i];
    nb += vecB[i] * vecB[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

module.exports = {
  getEmbeddings,
  cosineSimilarity,
  initEmbedder,
};
