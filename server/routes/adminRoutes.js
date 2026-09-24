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
  // Subject
  createSubjectApi,
  getSubjectsApi,
  getPendingSubjectsApi,
  resolvePendingSubjectApi,
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

// ── Subject Taxonomy ───────────────────────────────────────────────────────────
router.post("/subjects", protect, adminOnly, createSubjectApi);
router.get("/subjects", protect, adminOnly, getSubjectsApi);
router.get("/subjects/pending", protect, adminOnly, getPendingSubjectsApi);
router.post("/subjects/resolve-pending", protect, adminOnly, resolvePendingSubjectApi);

// ── CourseCode Taxonomy ────────────────────────────────────────────────────────
router.post("/course-codes", protect, adminOnly, createCourseCodeApi);
router.get("/course-codes/pending", protect, adminOnly, getPendingCourseCodesApi);
router.post("/course-codes/resolve-pending", protect, adminOnly, resolvePendingCourseCodeApi);

module.exports = router;
