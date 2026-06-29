const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // optional for Google users
    role: { type: String, enum: ["student", "admin"], default: "student" },
    branch: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    googleId: { type: String }, // stores Google user ID
    avatar: { type: String }, // stores Google profile photo
    verificationToken: { type: String },
    verificationExpiry: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.verificationToken = token;
  this.verificationExpiry = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

module.exports = mongoose.model("User", userSchema);
