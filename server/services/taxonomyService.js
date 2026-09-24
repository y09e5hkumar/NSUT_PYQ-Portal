const Subject = require("../models/Subject");
const CourseCode = require("../models/CourseCode");
const Paper = require("../models/Paper");

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// ─── Subject ──────────────────────────────────────────────────────────────────

/**
 * Returns all active subjects for a given branch, sorted alphabetically.
 */
async function getSubjectsForBranch(branch) {
  return Subject.find({
    isActive: true,
    branch: branch.trim().toUpperCase(),
  })
    .sort({ name: 1 })
    .select("name _id semester");
}

/**
 * Checks whether a subject name already exists (case-insensitive) for a branch.
 * Used as a race-condition guard before creating a new pending entry.
 * Returns the matched Subject doc, or null if genuinely new.
 */
async function resolveSubject(rawName, branch) {
  if (!rawName || !branch) return null;
  return Subject.findOne({
    isActive: true,
    branch: branch.trim().toUpperCase(),
    name: new RegExp(`^${escapeRegex(rawName.trim())}$`, "i"),
  });
}

/**
 * Admin: Add a new canonical subject.
 * Returns the created/upserted Subject doc.
 * Throws if subject already exists under that branch (case-insensitive).
 */
async function addSubject({ name, branch, semester }) {
  const existing = await resolveSubject(name, branch);
  if (existing) return existing; // idempotent

  return Subject.create({
    name: name.trim(),
    branch: branch.trim().toUpperCase(),
    ...(semester ? { semester: Number(semester) } : {}),
    isActive: true,
  });
}

/**
 * Admin: Batch-resolve all papers whose pendingSubjectName matches rawName
 * under this branch, setting them to the canonical subject name and flipping
 * subjectPending to false.
 */
async function resolvePendingSubjects({ pendingName, branch, canonicalName }) {
  if (!pendingName || !branch || !canonicalName) {
    throw new Error("pendingName, branch, and canonicalName are required.");
  }

  // Ensure canonical subject exists
  let canonical = await resolveSubject(canonicalName, branch);
  if (!canonical) {
    canonical = await addSubject({ name: canonicalName, branch });
  }

  const result = await Paper.updateMany(
    {
      subjectPending: true,
      branch: branch.trim().toUpperCase(),
      pendingSubjectName: new RegExp(`^${escapeRegex(pendingName.trim())}$`, "i"),
    },
    {
      $set: {
        subject: canonical.name,
        subjectPending: false,
        pendingSubjectName: null,
      },
    }
  );

  return { resolvedCount: result.modifiedCount, canonicalName: canonical.name };
}

// ─── CourseCode ───────────────────────────────────────────────────────────────

/**
 * Returns all active course codes for a given subject ID, sorted alphabetically.
 */
async function getCourseCodesForSubject(subjectId) {
  return CourseCode.find({
    isActive: true,
    subject: subjectId,
  })
    .sort({ code: 1 })
    .select("code _id");
}

/**
 * Checks whether a course code already exists (exact uppercase match) for a subject.
 * Returns the matched CourseCode doc, or null if genuinely new.
 */
async function resolveCourseCode(rawCode, subjectId) {
  if (!rawCode || !subjectId) return null;
  return CourseCode.findOne({
    isActive: true,
    subject: subjectId,
    code: rawCode.trim().toUpperCase(),
  });
}

/**
 * Admin: Add a new canonical course code for a subject.
 * Returns the created CourseCode doc (idempotent on existing).
 */
async function addCourseCode({ code, subjectId }) {
  const existing = await resolveCourseCode(code, subjectId);
  if (existing) return existing;

  return CourseCode.create({
    code: code.trim().toUpperCase(),
    subject: subjectId,
    isActive: true,
  });
}

/**
 * Admin: Batch-resolve all papers whose pendingCourseCodeName matches rawCode
 * under this branch+subject, flipping courseCodePending to false.
 */
async function resolvePendingCourseCodes({ pendingCode, branch, subjectName, canonicalCode }) {
  if (!pendingCode || !branch || !canonicalCode) {
    throw new Error("pendingCode, branch, and canonicalCode are required.");
  }

  // Find the subject to get subjectId for CourseCode
  const subjectDoc = subjectName
    ? await resolveSubject(subjectName, branch)
    : null;

  // Ensure canonical course code exists (attach to subject if known)
  if (subjectDoc) {
    const existing = await resolveCourseCode(canonicalCode, subjectDoc._id);
    if (!existing) {
      await addCourseCode({ code: canonicalCode, subjectId: subjectDoc._id });
    }
  }

  const result = await Paper.updateMany(
    {
      courseCodePending: true,
      branch: branch.trim().toUpperCase(),
      pendingCourseCodeName: new RegExp(`^${escapeRegex(pendingCode.trim())}$`, "i"),
    },
    {
      $set: {
        courseCode: canonicalCode.trim().toUpperCase(),
        courseCodePending: false,
        pendingCourseCodeName: null,
      },
    }
  );

  return { resolvedCount: result.modifiedCount, canonicalCode: canonicalCode.trim().toUpperCase() };
}

// ─── Pending-review aggregation ───────────────────────────────────────────────

/**
 * Returns all pending subjects grouped by (pendingSubjectName, branch).
 */
async function getPendingSubjects() {
  const papers = await Paper.find({ subjectPending: true })
    .sort({ createdAt: -1 })
    .populate("uploadedBy", "name email")
    .select("pendingSubjectName branch semester uploadedBy createdAt title");

  const grouped = {};
  for (const paper of papers) {
    const key = `${paper.branch}||${paper.pendingSubjectName || "Unknown"}`;
    if (!grouped[key]) {
      grouped[key] = {
        pendingName: paper.pendingSubjectName || "Unknown",
        branch: paper.branch,
        papers: [],
      };
    }
    grouped[key].papers.push(paper);
  }

  return Object.values(grouped).map((g) => ({ ...g, count: g.papers.length }));
}

/**
 * Returns all pending course codes grouped by (pendingCourseCodeName, branch).
 */
async function getPendingCourseCodes() {
  const papers = await Paper.find({ courseCodePending: true })
    .sort({ createdAt: -1 })
    .populate("uploadedBy", "name email")
    .select("pendingCourseCodeName branch subject uploadedBy createdAt title");

  const grouped = {};
  for (const paper of papers) {
    const key = `${paper.branch}||${paper.subject}||${paper.pendingCourseCodeName || "Unknown"}`;
    if (!grouped[key]) {
      grouped[key] = {
        pendingCode: paper.pendingCourseCodeName || "Unknown",
        branch: paper.branch,
        subject: paper.subject,
        papers: [],
      };
    }
    grouped[key].papers.push(paper);
  }

  return Object.values(grouped).map((g) => ({ ...g, count: g.papers.length }));
}

module.exports = {
  escapeRegex,
  getSubjectsForBranch,
  resolveSubject,
  addSubject,
  resolvePendingSubjects,
  getCourseCodesForSubject,
  resolveCourseCode,
  addCourseCode,
  resolvePendingCourseCodes,
  getPendingSubjects,
  getPendingCourseCodes,
};
