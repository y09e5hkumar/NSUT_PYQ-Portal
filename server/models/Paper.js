const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    branch: {
      type: String,
      required: true,
      enum: [
        "CSAI",
        "CSE",
        "CSDS",
        "IT",
        "ITNS",
        "MAC",
        "EIOT",
        "ECE",
        "EE",
        "ICE",
        "ME",
        "BT",
        "CSDA",
        "CIOT",
        "ECAM",
        "MEEV",
        "CE",
        "GI",
      ],
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
      required: true,
      index: true,
    },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "approved",
    },

    downloads: { type: Number, default: 0 },
  },
  { timestamps: true }
);

paperSchema.index({ subject: "text", title: "text" });
paperSchema.index({ branch: 1, semester: 1, subject: 1 });
paperSchema.index({ downloads: -1 });

// Same PDF can't be uploaded twice for the same branch,
// but CAN be shared legitimately across different branches.
paperSchema.index({ fileHash: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model("Paper", paperSchema);
