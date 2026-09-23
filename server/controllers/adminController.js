const Report = require("../models/Report");
const Paper = require("../models/Paper");
const { resolveReport } = require("../services/reportService");
const { checkDuplicate, checkMetadataSimilarity } = require("../services/dedupService");
const {
  addBranch,
  addAlias,
  resolvePendingBranches,
  getAllActiveBranches,
} = require("../services/branchService");
const Branch = require("../models/Branch");

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

  let dedupCheck = null;
  if (report.paper && report.paper.contentHash && report.paper.branch) {
    const exactDuplicate = await checkDuplicate(report.paper.contentHash, report.paper.branch);
    const similarityCandidates = await checkMetadataSimilarity(
      {
        courseCode: report.paper.courseCode,
        subject: report.paper.subject,
        semester: report.paper.semester,
      },
      report.paper.branch
    );
    dedupCheck = { exactDuplicate, similarityCandidates };
  }

  res.json({ report, dedupCheck });
};

exports.resolveReportApi = async (req, res) => {
  const { resolution, updatedMetadata } = req.body;
  const reportId = req.params.id;

  if (!resolution || !["dismissed", "metadata_corrected", "paper_removed"].includes(resolution)) {
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

// Branch Management APIs
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

    const branch = await Branch.findOneAndUpdate({ code: code.toUpperCase() }, update, { new: true });
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

    // Group papers by pendingBranchName
    const grouped = {};
    for (const paper of pendingPapers) {
      const name = paper.pendingBranchName || "Unlisted Branch";
      if (!grouped[name]) {
        grouped[name] = [];
      }
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
    const result = await resolvePendingBranches({
      pendingName,
      action,
      targetCode,
      newBranchData,
    });
    res.json({
      message: `Resolved ${result.resolvedCount} paper(s) to branch code ${result.canonicalCode}`,
      result,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to resolve pending branch." });
  }
};
