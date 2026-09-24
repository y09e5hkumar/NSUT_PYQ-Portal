const router = require("express").Router();
const { getCourseTitlesForBranch } = require("../services/taxonomyService");

/**
 * GET /api/course-titles?branch=CSE
 * Public — returns all active course titles for the selected branch.
 * Used by Upload.jsx for cascading dropdown.
 */
router.get("/", async (req, res) => {
  const { branch } = req.query;
  if (!branch) {
    return res.status(400).json({ message: "branch query param is required." });
  }
  const courseTitles = await getCourseTitlesForBranch(branch);
  res.json(courseTitles);
});

module.exports = router;
