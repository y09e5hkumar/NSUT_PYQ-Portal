const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    branch: {
      type: String,
      uppercase: true,
      trim: true,
    },

    branchPending: {
      type: Boolean,
      default: false,
    },

    pendingBranchName: {
      type: String,
      trim: true,
    },

    semester: { type: Number, required: true, min: 1, max: 8 },

    subject: { type: String, required: true },

    year: { type: Number, required: true },

    examType: {
      type: String,
      required: true,
      enum: ["Mid Sem", "End Sem", "Summer Sem"],
    },

    pdfUrl: { type: String, required: true },

    cloudinaryId: { type: String, required: true },

    // SHA-256 hex digest of the uploaded PDF's bytes.
    // Used to detect duplicate file uploads regardless of filename/title.
    // NOT unique on its own — the same PDF can legitimately be shared
    // across different branches (e.g. a common Maths paper for CSE + ECE).
    // Uniqueness is enforced per-branch via the compound index below.
    fileHash: {
      type: String,
    },

    contentHash: {
      type: String,
      index: true,
    },

    extractedText: {
      type: String,
    },

    extractionSource: {
      type: String,
      enum: ["local", "gemini"],
      default: "local",
    },

    extractionConfidence: {
      type: Object,
      default: {},
    },

    editedFields: {
      type: [String],
      default: [],
    },

    courseCode: { type: String },
    courseTitle: { type: String },
    degree: { type: String, default: "B.Tech" },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: {
      type: String,
      enum: ["approved", "flagged", "removed"],
      default: "approved",
    },

    downloads: { type: Number, default: 0 },
  },
  { timestamps: true }
);

paperSchema.index({ subject: "text", title: "text", courseTitle: "text" });
paperSchema.index({ branch: 1, semester: 1, subject: 1 });
paperSchema.index({ downloads: -1 });

// Content-based deduplication per branch
paperSchema.index({ contentHash: 1, branch: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Paper", paperSchema);
