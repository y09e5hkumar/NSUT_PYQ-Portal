const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paper",
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "wrong_metadata",
        "duplicate",
        "wrong_file",
        "poor_quality",
        "other",
      ],
      required: true,
    },
    comment: { type: String, maxlength: 500 },
    status: { type: String, enum: ["pending", "resolved"], default: "pending" },
    resolution: {
      type: String,
      enum: ["dismissed", "metadata_corrected", "paper_removed"],
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// Prevent duplicate reports from the same user on the same paper
reportSchema.index({ paper: 1, reportedBy: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
