const fs = require("fs").promises;
const pdfParse = require("pdf-parse");
const compromise = require("compromise");
const { sanitizeInput } = require("./utils");

class PlagiarismService {
  static async parseInput({ text, file }) {
    let extractedText = sanitizeInput(text) || "";

    if (file) {
      const validTypes = ["application/pdf", "text/plain"];
      if (!validTypes.includes(file.mimetype)) {
        throw new Error("Unsupported file type. Use PDF or TXT.");
      }

      if (file.mimetype === "application/pdf") {
        const dataBuffer = await fs.readFile(file.path);
        const data = await pdfParse(dataBuffer);
        extractedText = sanitizeInput(data.text);
        await fs.unlink(file.path);
      } else if (file.mimetype === "text/plain") {
        extractedText = sanitizeInput(await fs.readFile(file.path, "utf-8"));
        await fs.unlink(file.path);
      }
    }

    if (!extractedText.trim()) {
      throw new Error("No valid text provided or extracted");
    }

    return extractedText;
  }

  static splitIntoChunks(text) {
    // using natural language processing for better chunking
    const doc = compromise(text);
    const sentences = doc
      .sentences()
      .out("array")
      .filter((s) => s.length > 50);
    return sentences.length > 0 ? sentences : [text];
  }

  // static splitIntoChunks(text) { using regex for simplicity
  //   const threshold = text.length > 1000 ? 75 : 50; // Stricter for long texts
  //   const sentences = text
  //     .split(/(?<=[.!?])\s+/)
  //     .filter((s) => s.length > threshold);
  //   console.log("Chunks:", sentences.length > 0 ? sentences : [text]);
  //   return sentences.length > 0 ? sentences : [text];
  // }
}

module.exports = PlagiarismService;
