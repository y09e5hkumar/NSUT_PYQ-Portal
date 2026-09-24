const Paper = require("../models/Paper");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const { checkDuplicate } = require("../services/dedupService");
const { resolveBranch } = require("../services/branchService");
const { resolveCourseTitle, resolveCourseCode } = require("../services/taxonomyService");
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
    courseTitle,
    year,
    examType,
    courseCode,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  // Exclude papers with any unresolved pending flag from public listing
  const filter = {
    status: { $in: ["approved", "flagged"] },
    branchPending: false,
    courseTitlePending: false,
    courseCodePending: false,
  };

  if (branch) filter.branch = branch.toUpperCase();
  if (semester) filter.semester = Number(semester);
  if (courseTitle) filter.courseTitle = new RegExp(courseTitle, "i");
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

exports.checkDuplicateApi = async (req, res) => {
  const { branch, semester, courseTitle, courseCode, examType, year } = req.body;

  const duplicate = await checkDuplicate({
    branch,
    semester,
    courseTitle,
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
    degree = "B.Tech",
    // Branch
    branch,
    branchIsNew,
    pendingBranchName,
    // Semester / Exam
    semester,
    examType,
    year,
    // Course Title
    courseTitle,
    courseTitleIsNew,
    pendingCourseTitleName,
    // Course Code
    courseCode,
    courseCodeIsNew,
    pendingCourseCodeName,
  } = req.body;

  // ── 1. Basic required-field validation ──────────────────────────────────────
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
  const parsedCourseTitleIsNew = courseTitleIsNew === "true" || courseTitleIsNew === true;
  let parsedCourseCodeIsNew = courseCodeIsNew === "true" || courseCodeIsNew === true;

  // Key amendment rule: If Course Title is new, Course Code MUST also be provided as new paired entry
  if (parsedCourseTitleIsNew) {
    parsedCourseCodeIsNew = true;
  }

  // ── 2. Resolve Branch ───────────────────────────────────────────────────────
  let finalBranch = null;
  let isBranchPending = false;
  let finalPendingBranchName = null;

  if (parsedBranchIsNew) {
    if (!pendingBranchName || !pendingBranchName.trim()) {
      return res.status(400).json({ message: "Please specify your unlisted branch name." });
    }
    const existing = await resolveBranch(pendingBranchName.trim());
    if (existing.matched) {
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

  // ── 3 & 4. Resolve Course Title and Course Code ─────────────────────────────
  let finalCourseTitle = null;
  let isCourseTitlePending = false;
  let finalPendingCourseTitleName = null;

  let finalCourseCode = null;
  let isCourseCodePending = false;
  let finalPendingCourseCodeName = null;

  if (parsedCourseTitleIsNew) {
    // Paired entry: Both new title AND new code must be provided
    const titleInput = (pendingCourseTitleName || "").trim();
    const codeInput = (pendingCourseCodeName || "").trim().toUpperCase();

    if (!titleInput) {
      return res.status(400).json({ message: "New course title is required." });
    }
    if (!codeInput) {
      return res.status(400).json({ message: "New course code is required." });
    }

    // Check if title already exists under this branch (race-condition guard)
    const branchForCheck = finalBranch || "PENDING";
    const existingTitle = branchForCheck !== "PENDING"
      ? await resolveCourseTitle(titleInput, branchForCheck)
      : null;

    if (existingTitle) {
      finalCourseTitle = existingTitle.name;
      isCourseTitlePending = false;

      // Title existed! Now check code under existing title
      const existingCode = await resolveCourseCode(codeInput, existingTitle._id);
      if (existingCode) {
        finalCourseCode = existingCode.code;
        isCourseCodePending = false;
      } else {
        finalCourseCode = codeInput;
        isCourseCodePending = true;
        finalPendingCourseCodeName = codeInput;
      }
    } else {
      finalCourseTitle = titleInput;
      isCourseTitlePending = true;
      finalPendingCourseTitleName = titleInput;

      finalCourseCode = codeInput;
      isCourseCodePending = true;
      finalPendingCourseCodeName = codeInput;
    }
  } else {
    // Existing Course Title selected
    const titleInput = (courseTitle || "").trim();
    if (!titleInput) {
      return res.status(400).json({ message: "Course title is required." });
    }
    finalCourseTitle = titleInput;
    isCourseTitlePending = false;

    // Course code check
    const codeInput = parsedCourseCodeIsNew
      ? (pendingCourseCodeName || "").trim().toUpperCase()
      : (courseCode || "").trim().toUpperCase();

    if (!codeInput) {
      return res.status(400).json({ message: "Course code is required." });
    }

    if (parsedCourseCodeIsNew) {
      // Find course title doc to check race condition
      if (finalBranch) {
        const CourseTitleModel = require("../models/CourseTitle");
        const titleDoc = await CourseTitleModel.findOne({
          name: new RegExp(`^${finalCourseTitle}$`, "i"),
          branch: finalBranch,
          isActive: true,
        });

        const existingCode = titleDoc
          ? await resolveCourseCode(codeInput, titleDoc._id)
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
  if (!isBranchPending && !isCourseTitlePending && !isCourseCodePending) {
    const duplicate = await checkDuplicate({
      branch: finalBranch,
      semester,
      courseTitle: finalCourseTitle,
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
      degree,
      branch: finalBranch,
      branchPending: isBranchPending,
      pendingBranchName: finalPendingBranchName,
      semester: Number(semester),
      courseTitle: finalCourseTitle,
      courseTitlePending: isCourseTitlePending,
      pendingCourseTitleName: finalPendingCourseTitleName,
      courseCode: finalCourseCode,
      courseCodePending: isCourseCodePending,
      pendingCourseCodeName: finalPendingCourseCodeName,
      examType,
      year: Number(year),
      pdfUrl: cloudinaryResult.secure_url,
      cloudinaryId: cloudinaryResult.public_id,
      uploadedBy: req.user._id,
      status: "approved",
    });

    res.status(201).json(paper);
  } catch (err) {
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
    courseTitlePending: false,
    courseCodePending: false,
  })
    .sort({ downloads: -1 })
    .limit(10);
  res.json(papers);
};

// ─── GET /api/papers/pending (admin legacy) ───────────────────────────────────

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
  const [total, pendingReports, pendingBranchCount, pendingCourseTitleCount, pendingCourseCodeCount, downloads] =
    await Promise.all([
      Paper.countDocuments({
        status: { $in: ["approved", "flagged"] },
        branchPending: false,
        courseTitlePending: false,
        courseCodePending: false,
      }),
      Report.countDocuments({ status: "pending" }),
      Paper.countDocuments({ branchPending: true }),
      Paper.countDocuments({ courseTitlePending: true }),
      Paper.countDocuments({ courseCodePending: true }),
      Paper.aggregate([{ $group: { _id: null, total: { $sum: "$downloads" } } }]),
    ]);

  const topCourseTitles = await Paper.aggregate([
    {
      $match: {
        status: { $in: ["approved", "flagged"] },
        branchPending: false,
        courseTitlePending: false,
        courseCodePending: false,
      },
    },
    { $group: { _id: "$courseTitle", downloads: { $sum: "$downloads" } } },
    { $sort: { downloads: -1 } },
    { $limit: 5 },
  ]);

  const pendingReviewCount = pendingBranchCount + pendingCourseTitleCount + pendingCourseCodeCount;

  res.json({
    total,
    pending: pendingReports,
    pendingBranchCount,
    pendingCourseTitleCount,
    pendingSubjectCount: pendingCourseTitleCount, // backward compat key if needed
    pendingCourseCodeCount,
    pendingReviewCount,
    totalDownloads: downloads[0]?.total || 0,
    topSubjects: topCourseTitles, // backward compat key for admin dashboard chart
    topCourseTitles,
  });
};

// ─── GET /api/papers/branch-stats (admin) ────────────────────────────────────

exports.getBranchStats = async (req, res) => {
  const stats = await Paper.aggregate([
    {
      $match: {
        status: { $in: ["approved", "flagged"] },
        branchPending: false,
        courseTitlePending: false,
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
