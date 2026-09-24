const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Scoped per branch — "Data Structures" under CSE vs IT could differ
    branch: { type: String, required: true, uppercase: true, trim: true },
    // Optional — some subjects are semester-specific
    semester: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique per (name, branch) — case-insensitive enforced at service level
SubjectSchema.index({ name: 1, branch: 1 }, { unique: true });
SubjectSchema.index({ branch: 1, isActive: 1 });

module.exports = mongoose.model("Subject", SubjectSchema);
