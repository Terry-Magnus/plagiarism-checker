const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { analyzeTextAgainstWeb } = require("../PlagiarismService");
const PDFDocument = require("pdfkit");
const { sanitizeInput } = require("../utils");

const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, "..", "uploads"),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

async function parseUploadedFile(file) {
  if (!file) return "";
  const ext = path.extname(file.originalname).toLowerCase();
  try {
    if (ext === ".pdf" || file.mimetype === "application/pdf") {
      const data = fs.readFileSync(file.path);
      const pdf = await pdfParse(data);
      return pdf.text || "";
    } else {
      // treat as text file
      const txt = fs.readFileSync(file.path, "utf8");
      return txt || "";
    }
  } finally {
    // cleanup file
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      /* ignore */
    }
  }
}

// check-plagiarism route
router.post("/check-plagiarism", upload.single("file"), async (req, res) => {
  try {
    let text = req.body && req.body.text ? req.body.text : "";

    const sanitizedText = sanitizeInput(text);

    if (!sanitizedText && req.file) {
      text = await parseUploadedFile(req.file);
    }

    if (!sanitizedText || !text.trim()) {
      return res
        .status(400)
        .json({ error: "No text provided (body.text or file required)" });
    }

    const report = await analyzeTextAgainstWeb(sanitizedText, {
      chunkMaxLen: 300,
      topResults: 3,
      similarityThreshold: 0.65,
    });

    res.json(report);
  } catch (err) {
    console.error("Route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// download-report route
router.post("/generate-report", async (req, res) => {
  try {
    const { text, results, plagiarismPercentage } = req.body;
    if (!text || !results || plagiarismPercentage === undefined) {
      return res.status(400).json({ error: "Missing required data" });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=plagiarism_report.pdf"
    );
    doc.pipe(res);

    // Title
    doc.font("Times-Bold").fontSize(18).text("Plagiarism Check Report", {
      align: "center",
    });
    doc.moveDown(0.5);
    doc
      .font("Times-Roman")
      .fontSize(12)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);

    // Summary
    doc.font("Times-Bold").fontSize(14).text("Summary");
    doc
      .font("Times-Roman")
      .fontSize(12)
      .text(`Plagiarism Percentage: ${plagiarismPercentage.toFixed(2)}%`, {
        align: "left",
      });
    doc.moveDown(1.5);

    // Matched Sections
    if (results.length > 0) {
      doc.font("Times-Bold").fontSize(14).text("Matched Sections");
      doc.moveDown(0.5);

      results.forEach((r, i) => {
        doc
          .fontSize(12)
          .text(
            `Text ${i + 1} (Similarity: ${(r.similarity * 100).toFixed(2)}%):`
          );

        doc.font("Times-Bold").text("Input Chunk:");
        doc.font("Times-Italic").text(`"${cleanText(r.chunk)}"`);
        doc.moveDown(0.5);

        doc.font("Times-Bold").text("Matched Text:");
        doc.font("Times-Italic").text(`"${cleanText(r.matchedText)}"`);
        doc.moveDown(0.5);

        doc.font("Times-Roman").text(`Source: ${r.source}`);
        doc.moveDown();
      });
    } else {
      doc.font("Times-Roman").fontSize(12).text("No plagiarism detected.");
      doc.moveDown(1.5);
    }

    // Original Text
    doc.font("Times-Bold").fontSize(14).text("Original Text");
    doc.moveDown(0.5);
    doc
      .font("Times-Roman")
      .fontSize(10)
      .text(sanitizeInput(text), { paragraphGap: 5 });

    doc.end();
  } catch (error) {
    console.error("PDF generation failed:", error.message);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

module.exports = router;
