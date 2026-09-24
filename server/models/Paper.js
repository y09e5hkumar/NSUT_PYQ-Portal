const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema(
  {
    degree: {
      type: String,
      required: true,
      enum: ["B.Tech"],
      default: "B.Tech",
    },

    branch: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    branchPending: { type: Boolean, default: false },
    pendingBranchName: { type: String, trim: true },

    semester: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5, 6, 7, 8],
    },

    // REPLACES subject + title
    courseTitle: { type: String, required: true, trim: true },
    courseTitlePending: { type: Boolean, default: false },
    pendingCourseTitleName: { type: String, trim: true },

    courseCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
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

// Search and filter indexes
paperSchema.index({ courseTitle: "text", courseCode: "text" });
paperSchema.index({ branch: 1, semester: 1, courseTitle: 1 });
paperSchema.index({ downloads: -1 });

// Metadata-based deduplication — only enforced when all pending flags are false
paperSchema.index(
  { branch: 1, semester: 1, courseTitle: 1, courseCode: 1, examType: 1, year: 1 },
  {
    unique: true,
    partialFilterExpression: {
      branchPending: false,
      courseTitlePending: false,
      courseCodePending: false,
    },
  }
);

module.exports = mongoose.model("Paper", paperSchema);
