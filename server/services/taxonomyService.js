const CourseTitle = require("../models/CourseTitle");
const CourseCode = require("../models/CourseCode");
const Paper = require("../models/Paper");

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// ─── CourseTitle ──────────────────────────────────────────────────────────────

/**
 * Returns all active course titles for a given branch, sorted alphabetically.
 */
async function getCourseTitlesForBranch(branch) {
  return CourseTitle.find({
    isActive: true,
    branch: branch.trim().toUpperCase(),
  })
    .sort({ name: 1 })
    .select("name _id semester");
}

/**
 * Checks whether a course title already exists (case-insensitive) for a branch.
 * Returns matched CourseTitle doc, or null if genuinely new.
 */
async function resolveCourseTitle(rawName, branch) {
  if (!rawName || !branch) return null;
  return CourseTitle.findOne({
    isActive: true,
    branch: branch.trim().toUpperCase(),
    name: new RegExp(`^${escapeRegex(rawName.trim())}$`, "i"),
  });
}

/**
 * Admin: Add a new canonical course title.
 */
async function addCourseTitle({ name, branch, semester }) {
  const existing = await resolveCourseTitle(name, branch);
  if (existing) return existing;

  return CourseTitle.create({
    name: name.trim(),
    branch: branch.trim().toUpperCase(),
    ...(semester ? { semester: Number(semester) } : {}),
    isActive: true,
  });
}

/**
 * Admin: Batch-resolve all papers whose pendingCourseTitleName matches rawName
 * under this branch, setting courseTitle and flipping courseTitlePending to false.
 */
async function resolvePendingCourseTitles({ pendingName, branch, canonicalName }) {
  if (!pendingName || !branch || !canonicalName) {
    throw new Error("pendingName, branch, and canonicalName are required.");
  }

  let canonical = await resolveCourseTitle(canonicalName, branch);
  if (!canonical) {
    canonical = await addCourseTitle({ name: canonicalName, branch });
  }

  const result = await Paper.updateMany(
    {
      courseTitlePending: true,
      branch: branch.trim().toUpperCase(),
      pendingCourseTitleName: new RegExp(`^${escapeRegex(pendingName.trim())}$`, "i"),
    },
    {
      $set: {
        courseTitle: canonical.name,
        courseTitlePending: false,
        pendingCourseTitleName: null,
      },
    }
  );

  return { resolvedCount: result.modifiedCount, canonicalName: canonical.name };
}

// ─── CourseCode ───────────────────────────────────────────────────────────────

/**
 * Returns all active course codes for a given courseTitleId, sorted alphabetically.
 */
async function getCourseCodesForCourseTitle(courseTitleId) {
  return CourseCode.find({
    isActive: true,
    courseTitle: courseTitleId,
  })
    .sort({ code: 1 })
    .select("code _id");
}

/**
 * Checks whether a course code already exists for a course title.
 */
async function resolveCourseCode(rawCode, courseTitleId) {
  if (!rawCode || !courseTitleId) return null;
  return CourseCode.findOne({
    isActive: true,
    courseTitle: courseTitleId,
    code: rawCode.trim().toUpperCase(),
  });
}

/**
 * Admin: Add a new canonical course code for a course title.
 */
async function addCourseCode({ code, courseTitleId }) {
  const existing = await resolveCourseCode(code, courseTitleId);
  if (existing) return existing;

  return CourseCode.create({
    code: code.trim().toUpperCase(),
    courseTitle: courseTitleId,
    isActive: true,
  });
}

/**
 * Admin: Batch-resolve code-only pending papers under a known courseTitle.
 */
async function resolvePendingCourseCodes({ pendingCode, branch, courseTitle, canonicalCode }) {
  if (!pendingCode || !branch || !canonicalCode) {
    throw new Error("pendingCode, branch, and canonicalCode are required.");
  }

  const titleDoc = courseTitle
    ? await resolveCourseTitle(courseTitle, branch)
    : null;

  if (titleDoc) {
    const existing = await resolveCourseCode(canonicalCode, titleDoc._id);
    if (!existing) {
      await addCourseCode({ code: canonicalCode, courseTitleId: titleDoc._id });
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

// ─── Paired Pending Resolution ───────────────────────────────────────────────

/**
 * Admin: Resolve paired pending CourseTitle + CourseCode entries together.
 * Supports actions:
 *   a) "approve_pair" / "approve_new": create both CourseTitle and CourseCode
 *   b) "map_title_new_code": map to existing CourseTitle, create new CourseCode
 *   c) "map_both": map to existing CourseTitle and existing CourseCode
 *   d) "reject": set status to "flagged" or remove pending flags
 */
async function resolvePendingPair({
  pendingTitle,
  pendingCode,
  branch,
  action,
  canonicalTitle,
  canonicalCode,
  existingTitleId,
  existingCode,
}) {
  if (!pendingTitle || !branch) {
    throw new Error("pendingTitle and branch are required.");
  }

  const uppercaseBranch = branch.trim().toUpperCase();
  let finalTitleName = canonicalTitle ? canonicalTitle.trim() : pendingTitle.trim();
  let finalCode = canonicalCode ? canonicalCode.trim().toUpperCase() : (pendingCode ? pendingCode.trim().toUpperCase() : "");

  if (action === "reject") {
    const result = await Paper.updateMany(
      {
        courseTitlePending: true,
        branch: uppercaseBranch,
        pendingCourseTitleName: new RegExp(`^${escapeRegex(pendingTitle.trim())}$`, "i"),
      },
      {
        $set: {
          status: "flagged",
          courseTitlePending: false,
          courseCodePending: false,
        },
      }
    );
    return { resolvedCount: result.modifiedCount, action: "rejected" };
  }

  let titleDoc = null;
  let codeDoc = null;

  if (action === "map_both") {
    if (existingTitleId) {
      titleDoc = await CourseTitle.findById(existingTitleId);
      if (titleDoc) finalTitleName = titleDoc.name;
    }
    if (existingCode) {
      finalCode = existingCode.trim().toUpperCase();
    }
  } else if (action === "map_title_new_code") {
    if (existingTitleId) {
      titleDoc = await CourseTitle.findById(existingTitleId);
      if (titleDoc) finalTitleName = titleDoc.name;
    } else {
      titleDoc = await resolveCourseTitle(finalTitleName, uppercaseBranch);
    }
    if (!titleDoc) {
      titleDoc = await addCourseTitle({ name: finalTitleName, branch: uppercaseBranch });
    }
    codeDoc = await addCourseCode({ code: finalCode, courseTitleId: titleDoc._id });
  } else {
    // "approve_pair" / "approve_new"
    titleDoc = await resolveCourseTitle(finalTitleName, uppercaseBranch);
    if (!titleDoc) {
      titleDoc = await addCourseTitle({ name: finalTitleName, branch: uppercaseBranch });
    }
    if (finalCode) {
      codeDoc = await addCourseCode({ code: finalCode, courseTitleId: titleDoc._id });
    }
  }

  const query = {
    courseTitlePending: true,
    branch: uppercaseBranch,
    pendingCourseTitleName: new RegExp(`^${escapeRegex(pendingTitle.trim())}$`, "i"),
  };

  const updateFields = {
    courseTitle: finalTitleName,
    courseTitlePending: false,
    pendingCourseTitleName: null,
    courseCodePending: false,
    pendingCourseCodeName: null,
  };
  if (finalCode) {
    updateFields.courseCode = finalCode;
  }

  const result = await Paper.updateMany(query, { $set: updateFields });

  return {
    resolvedCount: result.modifiedCount,
    canonicalTitle: finalTitleName,
    canonicalCode: finalCode,
  };
}

// ─── Pending-review aggregations ──────────────────────────────────────────────

/**
 * Returns all pending course titles grouped by (pendingCourseTitleName, pendingCourseCodeName, branch).
 */
async function getPendingCourseTitles() {
  const papers = await Paper.find({ courseTitlePending: true })
    .sort({ createdAt: -1 })
    .populate("uploadedBy", "name email")
    .select("pendingCourseTitleName pendingCourseCodeName courseTitle courseCode branch semester uploadedBy createdAt");

  const grouped = {};
  for (const paper of papers) {
    const titleKey = paper.pendingCourseTitleName || paper.courseTitle || "Unknown Title";
    const codeKey = paper.pendingCourseCodeName || paper.courseCode || "Unknown Code";
    const key = `${paper.branch}||${titleKey}||${codeKey}`;

    if (!grouped[key]) {
      grouped[key] = {
        pendingTitle: titleKey,
        pendingCode: codeKey,
        branch: paper.branch,
        semester: paper.semester,
        papers: [],
      };
    }
    grouped[key].papers.push(paper);
  }

  return Object.values(grouped).map((g) => ({ ...g, count: g.papers.length }));
}

/**
 * Returns all pending course codes (code-only pending, where course title was existing).
 */
async function getPendingCourseCodes() {
  const papers = await Paper.find({ courseCodePending: true, courseTitlePending: false })
    .sort({ createdAt: -1 })
    .populate("uploadedBy", "name email")
    .select("pendingCourseCodeName branch courseTitle uploadedBy createdAt");

  const grouped = {};
  for (const paper of papers) {
    const key = `${paper.branch}||${paper.courseTitle}||${paper.pendingCourseCodeName || "Unknown"}`;
    if (!grouped[key]) {
      grouped[key] = {
        pendingCode: paper.pendingCourseCodeName || "Unknown",
        branch: paper.branch,
        courseTitle: paper.courseTitle,
        papers: [],
      };
    }
    grouped[key].papers.push(paper);
  }

  return Object.values(grouped).map((g) => ({ ...g, count: g.papers.length }));
}

module.exports = {
  escapeRegex,
  getCourseTitlesForBranch,
  resolveCourseTitle,
  addCourseTitle,
  resolvePendingCourseTitles,
  getCourseCodesForCourseTitle,
  resolveCourseCode,
  addCourseCode,
  resolvePendingCourseCodes,
  resolvePendingPair,
  getPendingCourseTitles,
  getPendingCourseCodes,
};
