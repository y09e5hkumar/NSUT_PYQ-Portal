const router = require("express").Router();
const { getCourseCodesForSubject } = require("../services/taxonomyService");

/**
 * GET /api/course-codes?subjectId=...
 * Public — returns all active course codes for the selected subject.
 * Used by Upload.jsx for cascading dropdown.
 */
router.get("/", async (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) {
    return res.status(400).json({ message: "subjectId query param is required." });
  }
  const codes = await getCourseCodesForSubject(subjectId);
  res.json(codes);
});

module.exports = router;
