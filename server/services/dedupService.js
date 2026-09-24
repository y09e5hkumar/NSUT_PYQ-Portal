const Paper = require("../models/Paper");

/**
 * Metadata-based duplicate check.
 * A paper is considered a duplicate when canonical fields match
 * AND none of the pending flags are set.
 *
 * Returns the matching paper document, or null if no duplicate found.
 */
async function checkDuplicate({ branch, semester, courseTitle, courseCode, examType, year }) {
  if (!branch || !semester || !courseTitle || !examType || !year) return null;

  const query = {
    branch: branch.toUpperCase(),
    semester: Number(semester),
    courseTitle: courseTitle.trim(),
    examType,
    year: Number(year),
    branchPending: false,
    courseTitlePending: false,
    courseCodePending: false,
  };

  if (courseCode && courseCode.trim()) {
    query.courseCode = courseCode.trim().toUpperCase();
  }

  return Paper.findOne(query).select(
    "branch semester courseTitle courseCode examType year status pdfUrl createdAt"
  );
}

module.exports = { checkDuplicate };
