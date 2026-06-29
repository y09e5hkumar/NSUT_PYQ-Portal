const crypto = require("crypto");
const Paper = require("../models/Paper");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const nodemailer = require("nodemailer");

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

// Computes a SHA-256 hex digest of the file's raw bytes.
// Same PDF bytes -> same hash, regardless of filename/title/uploader.
const hashBuffer = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
  const filter = { status: "approved" };

  if (branch) filter.branch = branch;
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

exports.uploadPaper = async (req, res) => {
  const { title, branch, semester, subject, year, examType } = req.body;
  const isAdmin = req.user?.role === "admin";

  if (!req.file?.buffer) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // 1. Hash the file BEFORE touching Cloudinary — no point uploading
  //    a file we're about to reject.
  const fileHash = hashBuffer(req.file.buffer);

  // 2. Check if this exact PDF already exists FOR THIS BRANCH.
  //    The same paper can legitimately be shared across different
  //    branches (e.g. a common Maths paper for CSE + ECE), so the
  //    duplicate check is scoped to { fileHash, branch }, not just fileHash.
  const existing = await Paper.findOne({ fileHash, branch }).select(
    "title branch semester subject year examType status createdAt"
  );

  if (existing) {
    return res.status(409).json({
      message: "This PDF has already been uploaded for this branch.",
      existingPaper: existing,
    });
  }

  // 3. Safe to upload — no duplicate found.
  let result;
  try {
    result = await uploadToCloudinary(req.file.buffer);
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    return res
      .status(502)
      .json({ message: "File upload failed, please try again." });
  }

  try {
    const paper = await Paper.create({
      title,
      branch,
      semester: Number(semester),
      subject,
      year: Number(year),
      examType,
      pdfUrl: result.secure_url,
      cloudinaryId: result.public_id,
      fileHash,
      uploadedBy: req.user?._id,
      status: isAdmin ? "approved" : "pending",
    });

    res.status(201).json(paper);
  } catch (err) {
    // Race condition safety net: two identical uploads for the same
    // branch landed at the same instant and both passed the findOne
    // check above. The unique compound index on {fileHash, branch}
    // will make the second .create() throw E11000 here.
    if (err.code === 11000 && err.keyPattern?.fileHash) {
      // Clean up the now-orphaned Cloudinary file since we're not saving it.
      await cloudinary.uploader.destroy(result.public_id, {
        resource_type: "raw",
      });
      return res
        .status(409)
        .json({
          message: "This PDF has already been uploaded for this branch.",
        });
    }
    throw err;
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
  const papers = await Paper.find({ status: "approved" })
    .sort({ downloads: -1 })
    .limit(10);
  res.json(papers);
};

exports.getPendingPapers = async (req, res) => {
  const papers = await Paper.find({ status: "pending" }).populate(
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

  if (paper.uploadedBy?.email) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: paper.uploadedBy.email,
        subject: `Your paper "${paper.title}" has been approved!`,
        html: `
          <h2>Your paper was approved 🎉</h2>
          <p>Hi ${paper.uploadedBy.name},</p>
          <p>Your submission <strong>${paper.title}</strong> has been approved and is now live on PYQ Portal.</p>
          <p>Thank you for contributing!</p>
        `,
      });
    } catch (err) {
      console.error("Email failed:", err.message);
    }
  }

  res.json(paper);
};

exports.getStats = async (req, res) => {
  const [total, pending, downloads] = await Promise.all([
    Paper.countDocuments({ status: "approved" }),
    Paper.countDocuments({ status: "pending" }),
    Paper.aggregate([{ $group: { _id: null, total: { $sum: "$downloads" } } }]),
  ]);
  const topSubjects = await Paper.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: "$subject", downloads: { $sum: "$downloads" } } },
    { $sort: { downloads: -1 } },
    { $limit: 5 },
  ]);
  res.json({
    total,
    pending,
    totalDownloads: downloads[0]?.total || 0,
    topSubjects,
  });
};

exports.getBranchStats = async (req, res) => {
  const stats = await Paper.aggregate([
    { $match: { status: "approved" } },
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
