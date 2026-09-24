const router = require("express").Router();
const { getSubjectsForBranch } = require("../services/taxonomyService");

/**
 * GET /api/subjects?branch=CSE
 * Public — returns all active subjects for the selected branch.
 * Used by Upload.jsx for cascading dropdown.
 */
router.get("/", async (req, res) => {
  const { branch } = req.query;
  if (!branch) {
    return res.status(400).json({ message: "branch query param is required." });
  }
  const subjects = await getSubjectsForBranch(branch);
  res.json(subjects);
});

module.exports = router;
