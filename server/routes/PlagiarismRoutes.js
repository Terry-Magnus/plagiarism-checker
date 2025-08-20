const express = require("express");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const PlagiarismService = require("../PlagiarismService");
const SearchService = require("../SearchService");
const { sanitizeInput } = require("../utils");
const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST /check-plagiarism
router.post("/check-plagiarism", upload.single("file"), async (req, res) => {
  try {
    const text = await PlagiarismService.parseInput({
      text: req.body.text,
      file: req.file,
    });
    const chunks = PlagiarismService.splitIntoChunks(text);
    const results = await SearchService.checkPlagiarism(chunks);
    const plagiarismPercentage = (results.length / chunks.length) * 100;

    res.json({ text, results, plagiarismPercentage });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /generate-report
router.post("/generate-report", async (req, res) => {
  try {
    const { text, results, plagiarismPercentage } = req.body;
    if (!text || !results || plagiarismPercentage === undefined) {
      return res.status(400).json({ error: "Missing required data" });
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=plagiarism_report.pdf"
    );
    doc.pipe(res);

    doc
      .font("Times-Roman")
      .fontSize(16)
      .text("Plagiarism Check Report", { align: "center" });
    doc
      .fontSize(12)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text("Summary");
    doc
      .fontSize(12)
      .text(`Plagiarism Percentage: ${plagiarismPercentage.toFixed(2)}%`, {
        align: "left",
      });
    doc.moveDown();

    if (results.length > 0) {
      doc.fontSize(14).text("Matched Sections");
      results.forEach((r, i) => {
        doc
          .fontSize(12)
          .text(
            `Text ${i + 1} (Similarity: ${(r.similarity * 100).toFixed(2)}%):`
          );
        doc.font("Times-Italic").text(`"${sanitizeInput(r.chunk)}"`);
        doc.font("Times-Roman").text(`Source: ${r.source}`);
        doc.moveDown();
      });
    } else {
      doc.text("No plagiarism detected.");
    }

    doc.moveDown();
    doc.fontSize(14).text("Original Text");
    doc.fontSize(10).text(sanitizeInput(text), { paragraphGap: 5 });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: "Failed to generate report" });
  }
});

module.exports = router;
