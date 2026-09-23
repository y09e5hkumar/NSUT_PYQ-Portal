const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    fullName: { type: String, required: true, trim: true },
    aliases: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index({ aliases: 1 });

module.exports = mongoose.model("Branch", branchSchema);
