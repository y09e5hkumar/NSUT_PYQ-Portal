const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getReports,
  getReportById,
  resolveReportApi,
  createBranchApi,
  addAliasApi,
  updateBranchApi,
  getPendingBranchesApi,
  resolvePendingBranchApi,
} = require("../controllers/adminController");

// Community Reports
router.get("/reports", protect, adminOnly, getReports);
router.get("/reports/:id", protect, adminOnly, getReportById);
router.patch("/reports/:id/resolve", protect, adminOnly, resolveReportApi);

// Branch Taxonomy & Request Queue Management
router.post("/branches", protect, adminOnly, createBranchApi);
router.patch("/branches/:code/alias", protect, adminOnly, addAliasApi);
router.patch("/branches/:code", protect, adminOnly, updateBranchApi);
router.get("/branches/pending", protect, adminOnly, getPendingBranchesApi);
router.post("/branches/resolve-pending", protect, adminOnly, resolvePendingBranchApi);

module.exports = router;
