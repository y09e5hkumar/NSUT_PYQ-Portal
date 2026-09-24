const router = require("express").Router();
const { getCourseCodesForCourseTitle } = require("../services/taxonomyService");

/**
 * GET /api/course-codes?courseTitleId=...
 * Public — returns all active course codes for the selected course title.
 * Used by Upload.jsx for cascading dropdown.
 */
router.get("/", async (req, res) => {
  const courseTitleId = req.query.courseTitleId || req.query.subjectId;
  if (!courseTitleId) {
    return res.status(400).json({ message: "courseTitleId query param is required." });
  }
  const codes = await getCourseCodesForCourseTitle(courseTitleId);
  res.json(codes);
});

module.exports = router;
