const mongoose = require("mongoose");

const CourseTitleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    branch: { type: String, required: true, uppercase: true, trim: true },
    semester: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CourseTitleSchema.index({ name: 1, branch: 1 }, { unique: true });
CourseTitleSchema.index({ branch: 1, isActive: 1 });

module.exports = mongoose.model("CourseTitle", CourseTitleSchema);
