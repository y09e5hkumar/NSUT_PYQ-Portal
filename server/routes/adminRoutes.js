const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getReports,
  getReportById,
  resolveReportApi,
  // Branch
  createBranchApi,
  addAliasApi,
  updateBranchApi,
  getPendingBranchesApi,
  resolvePendingBranchApi,
  // CourseTitle
  createCourseTitleApi,
  getCourseTitlesApi,
  getPendingCourseTitlesApi,
  resolvePendingCourseTitlePairApi,
  // CourseCode
  createCourseCodeApi,
  getPendingCourseCodesApi,
  resolvePendingCourseCodeApi,
  // Unified pending queue
  getPendingReviewApi,
} = require("../controllers/adminController");

// ── Community Reports ──────────────────────────────────────────────────────────
router.get("/reports", protect, adminOnly, getReports);
router.get("/reports/:id", protect, adminOnly, getReportById);
router.patch("/reports/:id/resolve", protect, adminOnly, resolveReportApi);

// ── Unified Pending-Review Queue ───────────────────────────────────────────────
router.get("/pending-review", protect, adminOnly, getPendingReviewApi);

// ── Branch Taxonomy ────────────────────────────────────────────────────────────
router.post("/branches", protect, adminOnly, createBranchApi);
router.patch("/branches/:code/alias", protect, adminOnly, addAliasApi);
router.patch("/branches/:code", protect, adminOnly, updateBranchApi);
router.get("/branches/pending", protect, adminOnly, getPendingBranchesApi);
router.post("/branches/resolve-pending", protect, adminOnly, resolvePendingBranchApi);

// ── CourseTitle Taxonomy ───────────────────────────────────────────────────────
router.post("/course-titles", protect, adminOnly, createCourseTitleApi);
router.get("/course-titles", protect, adminOnly, getCourseTitlesApi);
router.get("/course-titles/pending", protect, adminOnly, getPendingCourseTitlesApi);
router.patch("/course-titles/approve-pair", protect, adminOnly, resolvePendingCourseTitlePairApi);
router.post("/course-titles/resolve-pending-pair", protect, adminOnly, resolvePendingCourseTitlePairApi);
router.post("/course-titles/resolve-pending", protect, adminOnly, resolvePendingCourseTitlePairApi);

// Aliases for /subjects backward compatibility
router.post("/subjects", protect, adminOnly, createCourseTitleApi);
router.get("/subjects", protect, adminOnly, getCourseTitlesApi);
router.get("/subjects/pending", protect, adminOnly, getPendingCourseTitlesApi);
router.post("/subjects/resolve-pending", protect, adminOnly, resolvePendingCourseTitlePairApi);

// ── CourseCode Taxonomy ────────────────────────────────────────────────────────
router.post("/course-codes", protect, adminOnly, createCourseCodeApi);
router.get("/course-codes/pending", protect, adminOnly, getPendingCourseCodesApi);
router.post("/course-codes/resolve-pending", protect, adminOnly, resolvePendingCourseCodeApi);

module.exports = router;
