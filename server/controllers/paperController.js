const crypto = require("crypto");
const Paper = require("../models/Paper");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const { extractTextAndMetadata } = require("../services/ocrService");
const { extractMetadataWithGemini } = require("../services/geminiService");
const {
  normalizeText,
  computeContentHash,
  checkDuplicate,
  checkMetadataSimilarity,
} = require("../services/dedupService");
const { resolveBranch } = require("../services/branchService");
const { createReport } = require("../services/reportService");
const { saveTempFile, getTempFile, deleteTempFile } = require("../utils/tempStorage");

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "pyq-portal",
        format: "pdf",
        type: "upload",
        access_mode: "public",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const hashBuffer = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

exports.getPapers = async (req, res) => {
  const {
    branch,
    semester,
    subject,
    year,
    examType,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  // Show papers that are approved or flagged, excluding unresolved pending branch requests
  const filter = {
    status: { $in: ["approved", "flagged"] },
    branchPending: { $ne: true },
  };

  if (branch) filter.branch = branch.toUpperCase();
  if (semester) filter.semester = Number(semester);
  if (subject) filter.subject = new RegExp(subject, "i");
  if (year) filter.year = Number(year);
  if (examType) filter.examType = examType;
  if (search) filter.$text = { $search: search };

  const total = await Paper.countDocuments(filter);
  const papers = await Paper.find(filter)
    .sort({ year: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("uploadedBy", "name");

  res.json({ papers, total, pages: Math.ceil(total / limit) });
};

exports.extractPaper = async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ message: "No PDF file uploaded" });
  }

  const tempFileRef = saveTempFile(req.file.buffer);
  const { extractedText, metadata, confidence } = await extractTextAndMetadata(req.file.buffer);
  const contentHash = computeContentHash(extractedText || req.file.originalname);

  const exactDuplicate = metadata.branch ? await checkDuplicate(contentHash, metadata.branch) : null;
  const similarityCandidates = metadata.branch ? await checkMetadataSimilarity(metadata, metadata.branch) : [];

  res.json({
    tempFileRef,
    extractedText,
    metadata,
    confidence,
    contentHash,
    exactDuplicate,
    similarityCandidates,
    extractionSource: "local",
  });
};

exports.extractPaperGemini = async (req, res) => {
  const { tempFileRef } = req.body;
  if (!tempFileRef) {
    return res.status(400).json({ message: "tempFileRef is required" });
  }

  const pdfBuffer = getTempFile(tempFileRef);
  if (!pdfBuffer) {
    return res.status(400).json({ message: "Temporary file expired or not found. Please re-upload PDF." });
  }

  const result = await extractMetadataWithGemini(pdfBuffer);
  if (!result.success) {
    return res.status(400).json({ message: result.error || "Gemini extraction failed." });
  }

  const { extractedText, metadata, confidence } = result.data;
  if (metadata.branch) {
    const branchRes = await resolveBranch(metadata.branch);
    if (branchRes.matched) {
      metadata.branch = branchRes.code;
    } else {
      metadata.rawBranchText = metadata.branch;
      metadata.branch = "";
    }
  }

  const contentHash = computeContentHash(extractedText);
  const exactDuplicate = metadata.branch ? await checkDuplicate(contentHash, metadata.branch) : null;
  const similarityCandidates = metadata.branch ? await checkMetadataSimilarity(metadata, metadata.branch) : [];

  res.json({
    tempFileRef,
    extractedText,
    metadata,
    confidence,
    contentHash,
    exactDuplicate,
    similarityCandidates,
    extractionSource: "gemini",
  });
};

exports.checkDuplicateApi = async (req, res) => {
  const { contentHash, branch, metadata } = req.body;
  const exactDuplicate = branch ? await checkDuplicate(contentHash, branch) : null;
  const similarityCandidates = branch ? await checkMetadataSimilarity(metadata || {}, branch) : [];

  res.json({
    isDuplicate: !!exactDuplicate,
    exactDuplicate,
    similarityCandidates,
  });
};

exports.uploadPaper = async (req, res) => {
  const {
    title,
    branch,
    branchPending,
    pendingBranchName,
    semester,
    subject,
    year,
    examType,
    courseCode,
    courseTitle,
    degree,
    extractedText,
    extractionSource = "local",
    editedFields = [],
    confidence = {},
    tempFileRef,
  } = req.body;

  let buffer;
  if (req.file?.buffer) {
    buffer = req.file.buffer;
  } else if (tempFileRef) {
    buffer = getTempFile(tempFileRef);
  }

  if (!buffer) {
    return res.status(400).json({ message: "No PDF file or temp file provided" });
  }

  const isBranchPending =
    branchPending === true ||
    branchPending === "true" ||
    branch === "OTHER" ||
    !branch;

  const finalBranchCode = isBranchPending ? null : branch.toUpperCase();
  const finalPendingBranchName = isBranchPending
    ? pendingBranchName || "Unlisted Branch"
    : null;

  const fileHash = hashBuffer(buffer);

  // SERVER-SIDE MANDATORY DEDUP RE-CHECK
  const textForHash = extractedText && extractedText.trim().length > 10
    ? extractedText
    : title + " " + (subject || "") + " " + (courseCode || "");

  const contentHash = computeContentHash(textForHash);

  if (finalBranchCode) {
    const existingDuplicate = await checkDuplicate(contentHash, finalBranchCode);
    if (existingDuplicate) {
      if (tempFileRef) deleteTempFile(tempFileRef);
      return res.status(409).json({
        message: "This paper content has already been uploaded for this branch.",
        existingPaper: existingDuplicate,
      });
    }
  }

  let result;
  try {
    result = await uploadToCloudinary(buffer);
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    return res.status(502).json({ message: "File upload failed, please try again." });
  }

  let parsedEditedFields = editedFields;
  if (typeof editedFields === "string") {
    try {
      parsedEditedFields = JSON.parse(editedFields);
    } catch (e) {
      parsedEditedFields = [];
    }
  }

  let parsedConfidence = confidence;
  if (typeof confidence === "string") {
    try {
      parsedConfidence = JSON.parse(confidence);
    } catch (e) {
      parsedConfidence = {};
    }
  }

  try {
    const paper = await Paper.create({
      title: title || `${subject} ${examType} ${year}`,
      branch: finalBranchCode,
      branchPending: isBranchPending,
      pendingBranchName: finalPendingBranchName,
      semester: Number(semester),
      subject: subject || title,
      year: Number(year),
      examType,
      courseCode: courseCode || "",
      courseTitle: courseTitle || subject || title,
      degree: degree || "B.Tech",
      pdfUrl: result.secure_url,
      cloudinaryId: result.public_id,
      fileHash,
      contentHash,
      extractedText: extractedText || "",
      extractionSource,
      extractionConfidence: parsedConfidence,
      editedFields: parsedEditedFields,
      uploadedBy: req.user?._id,
      status: "approved", // Live post-submission!
    });

    if (tempFileRef) deleteTempFile(tempFileRef);

    res.status(201).json(paper);
  } catch (err) {
    if (err.code === 11000 && (err.keyPattern?.contentHash || err.keyPattern?.fileHash)) {
      await cloudinary.uploader.destroy(result.public_id, {
        resource_type: "raw",
      });
      if (tempFileRef) deleteTempFile(tempFileRef);
      return res.status(409).json({
        message: "This paper content has already been uploaded for this branch.",
      });
    }
    throw err;
  }
};

exports.reportPaper = async (req, res) => {
  const { reason, comment } = req.body;
  const paperId = req.params.id;

  if (!reason) {
    return res.status(400).json({ message: "Reason is required for reporting" });
  }

  try {
    const report = await createReport({
      paperId,
      userId: req.user._id,
      reason,
      comment,
    });
    res.status(201).json({ message: "Report submitted successfully. Thank you!", report });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to submit report" });
  }
};

exports.deletePaper = async (req, res) => {
  const paper = await Paper.findById(req.params.id);
  if (!paper) return res.status(404).json({ message: "Not found" });
  await cloudinary.uploader.destroy(paper.cloudinaryId, {
    resource_type: "raw",
  });
  await paper.deleteOne();
  res.json({ message: "Deleted" });
};

exports.incrementDownload = async (req, res) => {
  const paper = await Paper.findByIdAndUpdate(
    req.params.id,
    { $inc: { downloads: 1 } },
    { new: true }
  );
  res.json({ downloads: paper.downloads });
};

exports.getTrending = async (req, res) => {
  const papers = await Paper.find({ status: { $in: ["approved", "flagged"] }, branchPending: { $ne: true } })
    .sort({ downloads: -1 })
    .limit(10);
  res.json(papers);
};

exports.getPendingPapers = async (req, res) => {
  const papers = await Paper.find({ status: "flagged" }).populate(
    "uploadedBy",
    "name email"
  );
  res.json(papers);
};

exports.approvePaper = async (req, res) => {
  const paper = await Paper.findByIdAndUpdate(
    req.params.id,
    { status: "approved" },
    { new: true }
  ).populate("uploadedBy", "name email");

  if (!paper) return res.status(404).json({ message: "Not found" });
  res.json(paper);
};

exports.getStats = async (req, res) => {
  const Report = require("../models/Report");
  const [total, pendingReports, pendingBranchCount, downloads] = await Promise.all([
    Paper.countDocuments({ status: { $in: ["approved", "flagged"] }, branchPending: { $ne: true } }),
    Report.countDocuments({ status: "pending" }),
    Paper.countDocuments({ branchPending: true }),
    Paper.aggregate([{ $group: { _id: null, total: { $sum: "$downloads" } } }]),
  ]);
  const topSubjects = await Paper.aggregate([
    { $match: { status: { $in: ["approved", "flagged"] }, branchPending: { $ne: true } } },
    { $group: { _id: "$subject", downloads: { $sum: "$downloads" } } },
    { $sort: { downloads: -1 } },
    { $limit: 5 },
  ]);
  res.json({
    total,
    pending: pendingReports,
    pendingBranchCount,
    totalDownloads: downloads[0]?.total || 0,
    topSubjects,
  });
};

exports.getBranchStats = async (req, res) => {
  const stats = await Paper.aggregate([
    { $match: { status: { $in: ["approved", "flagged"] }, branchPending: { $ne: true } } },
    {
      $group: {
        _id: "$branch",
        count: { $sum: 1 },
        downloads: { $sum: "$downloads" },
      },
    },
    { $sort: { count: -1 } },
  ]);
  res.json(stats);
};
