const Report = require("../models/Report");
const Paper = require("../models/Paper");
const CourseTitle = require("../models/CourseTitle");
const CourseCode = require("../models/CourseCode");
const Branch = require("../models/Branch");
const { resolveReport } = require("../services/reportService");
const {
  addBranch,
  addAlias,
  resolvePendingBranches,
} = require("../services/branchService");
const {
  addCourseTitle,
  resolvePendingCourseTitles,
  addCourseCode,
  resolvePendingCourseCodes,
  resolvePendingPair,
  getPendingCourseTitles,
  getPendingCourseCodes,
} = require("../services/taxonomyService");

// ─── Community Reports ────────────────────────────────────────────────────────

exports.getReports = async (req, res) => {
  const { status = "pending" } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const reports = await Report.find(filter)
    .sort({ createdAt: -1 })
    .populate("paper")
    .populate("reportedBy", "name email");

  res.json(reports);
};

exports.getReportById = async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate("paper")
    .populate("reportedBy", "name email")
    .populate("resolvedBy", "name email");

  if (!report) {
    return res.status(404).json({ message: "Report not found" });
  }

  res.json({ report });
};

exports.resolveReportApi = async (req, res) => {
  const { resolution, updatedMetadata } = req.body;
  const reportId = req.params.id;

  if (
    !resolution ||
    !["dismissed", "metadata_corrected", "paper_removed"].includes(resolution)
  ) {
    return res.status(400).json({ message: "Valid resolution is required" });
  }

  try {
    const report = await resolveReport({
      reportId,
      adminId: req.user._id,
      resolution,
      updatedMetadata,
    });
    res.json({ message: "Report resolved successfully", report });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to resolve report" });
  }
};

// ─── Branch Taxonomy Management ───────────────────────────────────────────────

exports.createBranchApi = async (req, res) => {
  const { code, fullName, aliases } = req.body;
  if (!code || !fullName) {
    return res.status(400).json({ message: "Branch code and full name are required." });
  }

  try {
    const branch = await addBranch({ code, fullName, aliases });
    res.status(201).json({ message: "Branch created successfully", branch });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create branch." });
  }
};

exports.addAliasApi = async (req, res) => {
  const { code } = req.params;
  const { alias } = req.body;
  if (!alias) {
    return res.status(400).json({ message: "Alias string is required." });
  }

  try {
    const branch = await addAlias(code, alias);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }
    res.json({ message: "Alias added successfully", branch });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to add alias." });
  }
};

exports.updateBranchApi = async (req, res) => {
  const { code } = req.params;
  const { fullName, isActive, aliases } = req.body;

  try {
    const update = {};
    if (fullName) update.fullName = fullName.trim();
    if (isActive !== undefined) update.isActive = isActive;
    if (Array.isArray(aliases)) update.aliases = aliases;

    const branch = await Branch.findOneAndUpdate(
      { code: code.toUpperCase() },
      update,
      { new: true }
    );
    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }
    res.json({ message: "Branch updated successfully", branch });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update branch." });
  }
};

exports.getPendingBranchesApi = async (req, res) => {
  try {
    const pendingPapers = await Paper.find({ branchPending: true })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name email");

    const grouped = {};
    for (const paper of pendingPapers) {
      const name = paper.pendingBranchName || "Unlisted Branch";
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(paper);
    }

    const result = Object.entries(grouped).map(([pendingName, papers]) => ({
      pendingName,
      count: papers.length,
      papers,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch pending branch requests." });
  }
};

exports.resolvePendingBranchApi = async (req, res) => {
  const { pendingName, action, targetCode, newBranchData } = req.body;

  if (!pendingName || !action || !["create_new", "map_existing"].includes(action)) {
    return res.status(400).json({ message: "Valid pendingName and action are required." });
  }

  try {
    const result = await resolvePendingBranches({ pendingName, action, targetCode, newBranchData });
    res.json({
      message: `Resolved ${result.resolvedCount} paper(s) to branch code ${result.canonicalCode}`,
      result,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to resolve pending branch." });
  }
};

// ─── CourseTitle Taxonomy Management ─────────────────────────────────────────

exports.getPendingCourseTitlesApi = async (req, res) => {
  try {
    const result = await getPendingCourseTitles();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch pending course titles." });
  }
};

/**
 * Paired Approval Route (Section 4a, 4b, 4c, 4d)
 */
exports.resolvePendingCourseTitlePairApi = async (req, res) => {
  const {
    pendingTitle,
    pendingCode,
    branch,
    action,
    canonicalTitle,
    canonicalCode,
    existingTitleId,
    existingCode,
  } = req.body;

  if (!pendingTitle || !branch || !action) {
    return res.status(400).json({ message: "pendingTitle, branch, and action are required." });
  }

  try {
    const result = await resolvePendingPair({
      pendingTitle,
      pendingCode,
      branch,
      action,
      canonicalTitle,
      canonicalCode,
      existingTitleId,
      existingCode,
    });

    res.json({
      message: `Resolved ${result.resolvedCount} paper(s).`,
      result,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to resolve pending course title pair." });
  }
};

exports.createCourseTitleApi = async (req, res) => {
  const { name, branch, semester } = req.body;
  if (!name || !branch) {
    return res.status(400).json({ message: "name and branch are required." });
  }

  try {
    const courseTitle = await addCourseTitle({ name, branch, semester });
    res.status(201).json({ message: "Course title created", courseTitle });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create course title." });
  }
};

exports.getCourseTitlesApi = async (req, res) => {
  const { branch } = req.query;
  const filter = { isActive: true };
  if (branch) filter.branch = branch.toUpperCase();

  const courseTitles = await CourseTitle.find(filter).sort({ branch: 1, name: 1 });
  res.json(courseTitles);
};

// ─── CourseCode Taxonomy Management ──────────────────────────────────────────

exports.getPendingCourseCodesApi = async (req, res) => {
  try {
    const result = await getPendingCourseCodes();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch pending course codes." });
  }
};

exports.resolvePendingCourseCodeApi = async (req, res) => {
  const { pendingCode, branch, courseTitle, action, canonicalCode } = req.body;

  if (!pendingCode || !branch || !action || !["create_new", "map_existing"].includes(action)) {
    return res.status(400).json({ message: "pendingCode, branch, and action are required." });
  }
  if (!canonicalCode) {
    return res.status(400).json({ message: "canonicalCode is required." });
  }

  try {
    const result = await resolvePendingCourseCodes({
      pendingCode,
      branch,
      courseTitle,
      canonicalCode,
    });
    res.json({
      message: `Resolved ${result.resolvedCount} paper(s) to course code "${result.canonicalCode}"`,
      result,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to resolve pending course code." });
  }
};

exports.createCourseCodeApi = async (req, res) => {
  const { code, courseTitleId } = req.body;
  if (!code || !courseTitleId) {
    return res.status(400).json({ message: "code and courseTitleId are required." });
  }

  try {
    const cc = await addCourseCode({ code, courseTitleId });
    res.status(201).json({ message: "Course code created", courseCode: cc });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create course code." });
  }
};

// ─── Unified Pending-Review Queue ─────────────────────────────────────────────

exports.getPendingReviewApi = async (req, res) => {
  try {
    const [branches, courseTitles, courseCodes] = await Promise.all([
      (async () => {
        const papers = await Paper.find({ branchPending: true })
          .sort({ createdAt: -1 })
          .populate("uploadedBy", "name email");
        const grouped = {};
        for (const paper of papers) {
          const name = paper.pendingBranchName || "Unlisted Branch";
          if (!grouped[name]) grouped[name] = [];
          grouped[name].push(paper);
        }
        return Object.entries(grouped).map(([pendingName, papers]) => ({
          pendingName,
          count: papers.length,
          papers,
        }));
      })(),
      getPendingCourseTitles(),
      getPendingCourseCodes(),
    ]);

    res.json({ branches, courseTitles, subjects: courseTitles, courseCodes });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch pending review queue." });
  }
};
