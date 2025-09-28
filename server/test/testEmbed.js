const { getEmbeddings } = require("../modules/embeddings");

(async () => {
  const out = await getEmbeddings([
    "Artificial intelligence is transforming the healthcare industry.",
  ]);
  if (out === null) {
    console.log("Embeddings UNAVAILABLE (falling back to string-similarity).");
  } else {
    console.log("Embeddings length:", out[0].length);
    console.log("first 5 dims:", out[0].slice(0, 5));
  }
})();
