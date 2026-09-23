const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getPapers,
  extractPaper,
  extractPaperGemini,
  checkDuplicateApi,
  uploadPaper,
  reportPaper,
  deletePaper,
  incrementDownload,
  getTrending,
  getPendingPapers,
  approvePaper,
  getStats,
  getBranchStats,
} = require("../controllers/paperController");

// Public routes
router.get("/", getPapers);
router.get("/trending", getTrending);

// Extraction & Dedup routes (Student Auth)
router.post("/extract", protect, upload.single("pdf"), extractPaper);
router.post("/extract/gemini", protect, extractPaperGemini);
router.post("/check-duplicate", protect, checkDuplicateApi);

// Student upload
router.post("/", protect, upload.single("pdf"), uploadPaper);

// Report a paper (Student Auth)
router.post("/:id/report", protect, reportPaper);

// Download counter
router.patch("/:id/download", incrementDownload);

// Admin routes
router.get("/pending", protect, adminOnly, getPendingPapers);
router.get("/stats", protect, adminOnly, getStats);
router.get("/branch-stats", protect, adminOnly, getBranchStats);
router.patch("/:id/approve", protect, adminOnly, approvePaper);
router.delete("/:id", protect, adminOnly, deletePaper);

// Single paper — must be last
router.get("/:id", async (req, res) => {
  const Paper = require("../models/Paper");
  const paper = await Paper.findById(req.params.id).populate(
    "uploadedBy",
    "name"
  );
  if (!paper) return res.status(404).json({ message: "Not found" });
  res.json(paper);
});

module.exports = router;
