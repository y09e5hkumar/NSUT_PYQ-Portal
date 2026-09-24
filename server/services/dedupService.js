const Paper = require("../models/Paper");

/**
 * Metadata-based duplicate check.
 * A paper is considered a duplicate when all six canonical fields match
 * AND none of the three pending flags are set (i.e., all values are canonical).
 *
 * Returns the matching paper document, or null if no duplicate found.
 */
async function checkDuplicate({ branch, semester, subject, courseCode, examType, year }) {
  if (!branch || !semester || !subject || !examType || !year) return null;

  const query = {
    branch: branch.toUpperCase(),
    semester: Number(semester),
    subject,
    examType,
    year: Number(year),
    branchPending: false,
    subjectPending: false,
    courseCodePending: false,
  };

  // courseCode is optional in the form but if provided must match
  if (courseCode && courseCode.trim()) {
    query.courseCode = courseCode.trim().toUpperCase();
  }

  return Paper.findOne(query).select(
    "title branch semester subject courseCode examType year status pdfUrl createdAt"
  );
}

module.exports = { checkDuplicate };
