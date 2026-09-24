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
    // Linked to a CourseTitle document
    courseTitle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseTitle",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CourseCodeSchema.index({ courseTitle: 1, isActive: 1 });

module.exports = mongoose.model("CourseCode", CourseCodeSchema);
