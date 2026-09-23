const crypto = require("crypto");
const Paper = require("../models/Paper");

/**
 * Normalizes raw extracted text for content-based hashing.
 * Lowercase, strips non-alphanumeric characters, collapses all whitespace.
 */
function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // remove punctuation & special chars
    .replace(/\s+/g, " ")    // collapse multiple spaces/newlines to single space
    .trim();
}

/**
 * Computes SHA-256 hex hash of normalized text string.
 */
function computeContentHash(text) {
  const normalized = normalizeText(text);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Exact content hash duplicate check for a specific branch.
 */
async function checkDuplicate(contentHash, branch) {
  if (!contentHash || !branch) return null;
  return await Paper.findOne({ contentHash, branch }).select(
    "title branch semester subject year examType status createdAt pdfUrl courseCode courseTitle"
  );
}

/**
 * Fast metadata similarity pre-check.
 * Queries papers with matching branch + semester + (courseCode or subject).
 * Returns non-blocking similarity candidates.
 */
async function checkMetadataSimilarity(metadata, branch) {
  if (!branch) return [];

  const query = {
    branch,
    status: { $ne: "removed" },
  };

  if (metadata.semester) {
    query.semester = Number(metadata.semester);
  }

  const conditions = [];
  if (metadata.courseCode && metadata.courseCode.trim()) {
    conditions.push({ courseCode: new RegExp(`^${metadata.courseCode.trim()}$`, "i") });
  }
  if (metadata.subject && metadata.subject.trim()) {
    conditions.push({ subject: new RegExp(metadata.subject.trim(), "i") });
    conditions.push({ title: new RegExp(metadata.subject.trim(), "i") });
  }

  if (conditions.length > 0) {
    query.$or = conditions;
  }

  const candidates = await Paper.find(query)
    .limit(5)
    .select("title branch semester subject year examType courseCode pdfUrl createdAt");

  return candidates;
}

module.exports = {
  normalizeText,
  computeContentHash,
  checkDuplicate,
  checkMetadataSimilarity,
};
