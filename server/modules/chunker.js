// server/chunker.js

module.exports.chunkBySentences = function chunkBySentences(
  text,
  maxLen = 300
) {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = "";

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((current + " " + trimmed).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = trimmed;
    } else {
      current = (current + " " + trimmed).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};
