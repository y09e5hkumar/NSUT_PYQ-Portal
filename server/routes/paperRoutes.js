const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getPapers,
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

// ── Public routes ────────────────────────────────────────────────────────────
router.get("/", getPapers);
router.get("/trending", getTrending);

// ── Student auth routes ───────────────────────────────────────────────────────
// Non-blocking duplicate pre-check (UX banner before final submit)
router.post("/check-duplicate", protect, checkDuplicateApi);

// Final submit — validates all fields, resolves pending flags, re-checks dedup,
// uploads to Cloudinary, creates Paper doc. Paper publishes immediately.
router.post("/", protect, upload.single("pdf"), uploadPaper);

// Report a paper
router.post("/:id/report", protect, reportPaper);

// Download counter
router.patch("/:id/download", incrementDownload);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get("/pending", protect, adminOnly, getPendingPapers);
router.get("/stats", protect, adminOnly, getStats);
router.get("/branch-stats", protect, adminOnly, getBranchStats);
router.patch("/:id/approve", protect, adminOnly, approvePaper);
router.delete("/:id", protect, adminOnly, deletePaper);

// ── Single paper lookup — must be last ───────────────────────────────────────
router.get("/:id", async (req, res) => {
  const Paper = require("../models/Paper");
  const paper = await Paper.findById(req.params.id).populate("uploadedBy", "name");
  if (!paper) return res.status(404).json({ message: "Not found" });
  res.json(paper);
});

module.exports = router;
