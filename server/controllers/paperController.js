const Paper = require("../models/Paper");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const { checkDuplicate } = require("../services/dedupService");
const { resolveBranch } = require("../services/branchService");
const { resolveSubject, resolveCourseCode } = require("../services/taxonomyService");
const { createReport } = require("../services/reportService");

// ─── Cloudinary helper ────────────────────────────────────────────────────────

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

// ─── GET /api/papers ──────────────────────────────────────────────────────────

exports.getPapers = async (req, res) => {
  const {
    branch,
    semester,
    subject,
    year,
    examType,
    courseCode,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  // Exclude all papers with any unresolved pending flag from default results.
  // This prevents half-resolved papers appearing with blank/unlisted field values.
  const filter = {
    status: { $in: ["approved", "flagged"] },
    branchPending: false,
    subjectPending: false,
    courseCodePending: false,
  };

  if (branch) filter.branch = branch.toUpperCase();
  if (semester) filter.semester = Number(semester);
  if (subject) filter.subject = new RegExp(subject, "i");
  if (year) filter.year = Number(year);
  if (examType) filter.examType = examType;
  if (courseCode) filter.courseCode = courseCode.toUpperCase();
  if (search) filter.$text = { $search: search };

  const total = await Paper.countDocuments(filter);
  const papers = await Paper.find(filter)
    .sort({ year: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("uploadedBy", "name");

  res.json({ papers, total, pages: Math.ceil(total / limit) });
};

// ─── POST /api/papers/check-duplicate ────────────────────────────────────────
// Non-blocking pre-check shown as a UX banner before final submit.
// Server re-runs this on actual submit too — never trust the client check alone.

exports.checkDuplicateApi = async (req, res) => {
  const { branch, semester, subject, courseCode, examType, year } = req.body;

  const duplicate = await checkDuplicate({
    branch,
    semester,
    subject,
    courseCode,
    examType,
    year,
  });

  res.json({
    isDuplicate: !!duplicate,
    existingPaper: duplicate || null,
  });
};

// ─── POST /api/papers ─────────────────────────────────────────────────────────

exports.uploadPaper = async (req, res) => {
  const {
    title,
    degree = "B.Tech",
    // Branch
    branch,
    branchIsNew,            // "true" | "false" — did the student select "Not listed"?
    pendingBranchName,
    // Semester / Exam
    semester,
    examType,
    year,
    // Subject
    subject,
    subjectIsNew,           // "true" | "false"
    pendingSubjectName,
    // Course code
    courseCode,
    courseCodeIsNew,        // "true" | "false"
    pendingCourseCodeName,
  } = req.body;

  // ── 1. Basic required-field validation ──────────────────────────────────────
  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Paper title is required." });
  }
  if (!semester) {
    return res.status(400).json({ message: "Semester is required." });
  }
  if (!examType) {
    return res.status(400).json({ message: "Exam type is required." });
  }
  if (!year) {
    return res.status(400).json({ message: "Year is required." });
  }

  const parsedBranchIsNew = branchIsNew === "true" || branchIsNew === true;
  const parsedSubjectIsNew = subjectIsNew === "true" || subjectIsNew === true;
  const parsedCourseCodeIsNew = courseCodeIsNew === "true" || courseCodeIsNew === true;

  // ── 2. Resolve Branch ───────────────────────────────────────────────────────
  let finalBranch = null;
  let isBranchPending = false;
  let finalPendingBranchName = null;

  if (parsedBranchIsNew) {
    // Student typed a new branch name
    if (!pendingBranchName || !pendingBranchName.trim()) {
      return res.status(400).json({ message: "Please specify your unlisted branch name." });
    }
    // Race-condition guard: check it doesn't already exist
    const existing = await resolveBranch(pendingBranchName.trim());
    if (existing.matched) {
      // It matched an alias — use the canonical code instead
      finalBranch = existing.code;
      isBranchPending = false;
    } else {
      finalBranch = null;
      isBranchPending = true;
      finalPendingBranchName = pendingBranchName.trim();
    }
  } else {
    if (!branch || !branch.trim()) {
      return res.status(400).json({ message: "Branch is required." });
    }
    finalBranch = branch.trim().toUpperCase();
    isBranchPending = false;
  }

  // ── 3. Resolve Subject ──────────────────────────────────────────────────────
  let finalSubject = null;
  let isSubjectPending = false;
  let finalPendingSubjectName = null;

  const subjectInput = parsedSubjectIsNew ? (pendingSubjectName || "").trim() : (subject || "").trim();

  if (!subjectInput) {
    return res.status(400).json({ message: "Subject is required." });
  }

  if (parsedSubjectIsNew) {
    // Race-condition guard: check it doesn't already exist under this branch
    const branchForCheck = finalBranch || (finalPendingBranchName ? "PENDING" : null);
    const existingSubject = branchForCheck && branchForCheck !== "PENDING"
      ? await resolveSubject(subjectInput, branchForCheck)
      : null;

    if (existingSubject) {
      // Snapped to existing canonical subject
      finalSubject = existingSubject.name;
      isSubjectPending = false;
    } else {
      finalSubject = subjectInput;
      isSubjectPending = true;
      finalPendingSubjectName = subjectInput;
    }
  } else {
    finalSubject = subjectInput;
    isSubjectPending = false;
  }

  // ── 4. Resolve CourseCode ───────────────────────────────────────────────────
  let finalCourseCode = null;
  let isCourseCodePending = false;
  let finalPendingCourseCodeName = null;

  const codeInput = parsedCourseCodeIsNew
    ? (pendingCourseCodeName || "").trim().toUpperCase()
    : (courseCode || "").trim().toUpperCase();

  if (codeInput) {
    if (parsedCourseCodeIsNew) {
      // Pending: subject itself may also be pending, skip canonical lookup in that case
      if (!isSubjectPending && finalBranch) {
        // Try to find subject doc
        const SubjectModel = require("../models/Subject");
        const subjectDoc = await SubjectModel.findOne({
          name: new RegExp(`^${finalSubject}$`, "i"),
          branch: finalBranch,
          isActive: true,
        });
        const existingCode = subjectDoc
          ? await resolveCourseCode(codeInput, subjectDoc._id)
          : null;

        if (existingCode) {
          finalCourseCode = existingCode.code;
          isCourseCodePending = false;
        } else {
          finalCourseCode = codeInput;
          isCourseCodePending = true;
          finalPendingCourseCodeName = codeInput;
        }
      } else {
        // Subject is also pending — just flag course code as pending too
        finalCourseCode = codeInput;
        isCourseCodePending = true;
        finalPendingCourseCodeName = codeInput;
      }
    } else {
      finalCourseCode = codeInput;
      isCourseCodePending = false;
    }
  }

  // ── 5. Server-side duplicate re-check ───────────────────────────────────────
  // Only applicable when all three fields are canonical (not pending)
  if (!isBranchPending && !isSubjectPending && !isCourseCodePending) {
    const duplicate = await checkDuplicate({
      branch: finalBranch,
      semester,
      subject: finalSubject,
      courseCode: finalCourseCode,
      examType,
      year,
    });

    if (duplicate) {
      return res.status(409).json({
        message: "This paper has already been uploaded.",
        existingPaper: duplicate,
      });
    }
  }

  // ── 6. Require PDF ──────────────────────────────────────────────────────────
  if (!req.file?.buffer) {
    return res.status(400).json({ message: "No PDF file uploaded." });
  }

  // ── 7. Upload to Cloudinary ─────────────────────────────────────────────────
  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadToCloudinary(req.file.buffer);
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    return res.status(502).json({ message: "File upload failed, please try again." });
  }

  // ── 8. Create Paper document ────────────────────────────────────────────────
  try {
    const paper = await Paper.create({
      title: title.trim(),
      degree,
      branch: finalBranch,
      branchPending: isBranchPending,
      pendingBranchName: finalPendingBranchName,
      semester: Number(semester),
      subject: finalSubject,
      subjectPending: isSubjectPending,
      pendingSubjectName: finalPendingSubjectName,
      courseCode: finalCourseCode,
      courseCodePending: isCourseCodePending,
      pendingCourseCodeName: finalPendingCourseCodeName,
      examType,
      year: Number(year),
      pdfUrl: cloudinaryResult.secure_url,
      cloudinaryId: cloudinaryResult.public_id,
      uploadedBy: req.user._id,
      status: "approved", // Publish immediately; pending flags handle admin queue
    });

    res.status(201).json(paper);
  } catch (err) {
    // Metadata uniqueness constraint violation (race condition on concurrent submits)
    if (err.code === 11000) {
      await cloudinary.uploader.destroy(cloudinaryResult.public_id, {
        resource_type: "raw",
      });
      return res.status(409).json({
        message: "This paper has already been uploaded.",
      });
    }
    throw err;
  }
};

// ─── POST /api/papers/:id/report ─────────────────────────────────────────────

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

// ─── DELETE /api/papers/:id ───────────────────────────────────────────────────

exports.deletePaper = async (req, res) => {
  const paper = await Paper.findById(req.params.id);
  if (!paper) return res.status(404).json({ message: "Not found" });
  await cloudinary.uploader.destroy(paper.cloudinaryId, { resource_type: "raw" });
  await paper.deleteOne();
  res.json({ message: "Deleted" });
};

// ─── PATCH /api/papers/:id/download ──────────────────────────────────────────

exports.incrementDownload = async (req, res) => {
  const paper = await Paper.findByIdAndUpdate(
    req.params.id,
    { $inc: { downloads: 1 } },
    { new: true }
  );
  res.json({ downloads: paper.downloads });
};

// ─── GET /api/papers/trending ─────────────────────────────────────────────────

exports.getTrending = async (req, res) => {
  const papers = await Paper.find({
    status: { $in: ["approved", "flagged"] },
    branchPending: false,
    subjectPending: false,
    courseCodePending: false,
  })
    .sort({ downloads: -1 })
    .limit(10);
  res.json(papers);
};

// ─── GET /api/papers/pending (admin) ─────────────────────────────────────────
// Legacy — papers with status 'flagged'. Kept for backward compatibility.

exports.getPendingPapers = async (req, res) => {
  const papers = await Paper.find({ status: "flagged" }).populate(
    "uploadedBy",
    "name email"
  );
  res.json(papers);
};

// ─── PATCH /api/papers/:id/approve (admin) ───────────────────────────────────

exports.approvePaper = async (req, res) => {
  const paper = await Paper.findByIdAndUpdate(
    req.params.id,
    { status: "approved" },
    { new: true }
  ).populate("uploadedBy", "name email");

  if (!paper) return res.status(404).json({ message: "Not found" });
  res.json(paper);
};

// ─── GET /api/papers/stats (admin) ───────────────────────────────────────────

exports.getStats = async (req, res) => {
  const Report = require("../models/Report");
  const [total, pendingReports, pendingBranchCount, pendingSubjectCount, pendingCourseCodeCount, downloads] =
    await Promise.all([
      Paper.countDocuments({
        status: { $in: ["approved", "flagged"] },
        branchPending: false,
        subjectPending: false,
        courseCodePending: false,
      }),
      Report.countDocuments({ status: "pending" }),
      Paper.countDocuments({ branchPending: true }),
      Paper.countDocuments({ subjectPending: true }),
      Paper.countDocuments({ courseCodePending: true }),
      Paper.aggregate([{ $group: { _id: null, total: { $sum: "$downloads" } } }]),
    ]);

  const topSubjects = await Paper.aggregate([
    {
      $match: {
        status: { $in: ["approved", "flagged"] },
        branchPending: false,
        subjectPending: false,
        courseCodePending: false,
      },
    },
    { $group: { _id: "$subject", downloads: { $sum: "$downloads" } } },
    { $sort: { downloads: -1 } },
    { $limit: 5 },
  ]);

  const pendingReviewCount = pendingBranchCount + pendingSubjectCount + pendingCourseCodeCount;

  res.json({
    total,
    pending: pendingReports,
    pendingBranchCount,
    pendingSubjectCount,
    pendingCourseCodeCount,
    pendingReviewCount,
    totalDownloads: downloads[0]?.total || 0,
    topSubjects,
  });
};

// ─── GET /api/papers/branch-stats (admin) ────────────────────────────────────

exports.getBranchStats = async (req, res) => {
  const stats = await Paper.aggregate([
    {
      $match: {
        status: { $in: ["approved", "flagged"] },
        branchPending: false,
        subjectPending: false,
        courseCodePending: false,
      },
    },
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
