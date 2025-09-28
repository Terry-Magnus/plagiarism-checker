const { analyzeTextAgainstWeb } = require("../PlagiarismService");

(async () => {
  const text = `Artificial intelligence is transforming the healthcare industry. It helps doctors make faster and more accurate diagnoses, while also enabling hospitals to improve efficiency and patient care.`;
  const report = await analyzeTextAgainstWeb(text, {
    chunkMaxLen: 240,
    topResults: 3,
    similarityThreshold: 0.75,
  });
  console.log(JSON.stringify(report, null, 2));
})();
