const mongoose = require("mongoose");

const CourseCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    // Linked to a Subject document
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CourseCodeSchema.index({ subject: 1, isActive: 1 });

module.exports = mongoose.model("CourseCode", CourseCodeSchema);
