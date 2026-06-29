const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getPapers,
  uploadPaper,
  deletePaper,
  incrementDownload,
  getTrending,
  getPendingPapers,
  approvePaper,
  getStats,
  getBranchStats,
} = require("../controllers/paperController");

// public routes
router.get("/", getPapers);
router.get("/trending", getTrending);

// admin only — all before /:id
router.get("/pending", protect, adminOnly, getPendingPapers);
router.get("/stats", protect, adminOnly, getStats);
router.get("/branch-stats", protect, adminOnly, getBranchStats);
router.patch("/:id/approve", protect, adminOnly, approvePaper);
router.delete("/:id", protect, adminOnly, deletePaper);

// student upload
router.post("/", protect, upload.single("pdf"), uploadPaper);

// download counter
router.patch("/:id/download", incrementDownload);

// single paper — must be last
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
