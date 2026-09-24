const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    degree: {
      type: String,
      required: true,
      enum: ["B.Tech"],
      default: "B.Tech",
    },

    branch: {
      type: String,
      uppercase: true,
      trim: true,
      // validated against active Branch collection at controller level
    },
    branchPending: { type: Boolean, default: false },
    pendingBranchName: { type: String, trim: true },

    semester: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5, 6, 7, 8],
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      // validated against active Subject collection at controller level
    },
    subjectPending: { type: Boolean, default: false },
    pendingSubjectName: { type: String, trim: true },

    courseCode: {
      type: String,
      uppercase: true,
      trim: true,
      // validated against active CourseCode collection at controller level
    },
    courseCodePending: { type: Boolean, default: false },
    pendingCourseCodeName: { type: String, trim: true },

    examType: {
      type: String,
      required: true,
      enum: ["Mid Sem", "End Sem", "Summer Sem"],
    },

    year: { type: Number, required: true },

    pdfUrl: { type: String, required: true },
    cloudinaryId: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    downloads: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["approved", "flagged", "removed"],
      default: "approved",
    },
  },
  { timestamps: true }
);

// Full-text search index
paperSchema.index({ subject: "text", title: "text", courseCode: "text" });
// Compound sort/filter index
paperSchema.index({ branch: 1, semester: 1, subject: 1 });
paperSchema.index({ downloads: -1 });

// Metadata-based deduplication — only enforced when all three pending flags are false
// (i.e., all fields resolved to canonical values)
paperSchema.index(
  { branch: 1, semester: 1, subject: 1, courseCode: 1, examType: 1, year: 1 },
  {
    unique: true,
    partialFilterExpression: {
      branchPending: false,
      subjectPending: false,
      courseCodePending: false,
    },
  }
);

module.exports = mongoose.model("Paper", paperSchema);
