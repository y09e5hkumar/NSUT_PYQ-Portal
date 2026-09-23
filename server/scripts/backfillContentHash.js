require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const axios = require("axios");
const Paper = require("../models/Paper");
const { extractTextAndMetadata } = require("../services/ocrService");
const { computeContentHash } = require("../services/dedupService");

async function backfill() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/pyqportal";
  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);

  const papers = await Paper.find({
    $or: [{ contentHash: { $exists: false } }, { contentHash: null }, { contentHash: "" }],
  });

  console.log(`Found ${papers.length} paper(s) to backfill contentHash.`);

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    console.log(`[${i + 1}/${papers.length}] Processing paper: "${paper.title}" (${paper._id})`);

    try {
      if (!paper.pdfUrl) {
        console.warn(`Skipping paper ${paper._id} - missing pdfUrl`);
        continue;
      }

      const response = await axios.get(paper.pdfUrl, { responseType: "arraybuffer" });
      const pdfBuffer = Buffer.from(response.data);

      const { extractedText, metadata } = await extractTextAndMetadata(pdfBuffer);
      const contentHash = computeContentHash(extractedText || `${paper.title} ${paper.subject} ${paper.year}`);

      paper.extractedText = extractedText;
      paper.contentHash = contentHash;
      paper.extractionSource = "local";
      if (!paper.courseTitle && paper.subject) {
        paper.courseTitle = paper.subject;
      }
      if (paper.status === "pending") {
        paper.status = "approved";
      }

      await paper.save();
      console.log(`Successfully backfilled paper ${paper._id} with contentHash: ${contentHash.substring(0, 10)}...`);
    } catch (err) {
      console.error(`Failed to backfill paper ${paper._id}:`, err.message);
    }
  }

  console.log("Backfill complete!");
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error("Backfill script error:", err);
  process.exit(1);
});
