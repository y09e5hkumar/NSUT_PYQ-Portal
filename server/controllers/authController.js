const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const genToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${process.env.SERVER_URL}/api/auth/verify/${token}`;
  await transporter.sendMail({
    from: `"NSUT PYQ Portal" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Verify your NSUT PYQ Portal account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111827">Welcome to NSUT PYQ Portal 📄</h2>
        <p>Hi ${user.name},</p>
        <p>Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
        <a href="${verifyUrl}" 
          style="display:inline-block;margin:16px 0;padding:12px 24px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:12px;">If you didn't create an account, ignore this email.</p>
        <p style="color:#6b7280;font-size:12px;">Or copy this link: ${verifyUrl}</p>
      </div>
    `,
  });
};

exports.register = async (req, res) => {
  const { name, email, password, branch, adminCode } = req.body;

  if (await User.findOne({ email }))
    return res.status(400).json({ message: "Email already registered" });

  const role =
    adminCode === process.env.ADMIN_SECRET_CODE ? "admin" : "student";
  const user = new User({ name, email, password, branch, role });

  const token = user.generateVerificationToken();
  await user.save();

  try {
    await sendVerificationEmail(user, token);
    res.status(201).json({
      message:
        "Registration successful! Please check your email to verify your account.",
    });
  } catch (err) {
    // if email fails, delete user and return error
    await User.findByIdAndDelete(user._id);
    console.error("Email error:", err.message);
    res
      .status(500)
      .json({ message: "Failed to send verification email. Try again." });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    verificationToken: token,
    verificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).send(`
      <div style="font-family:sans-serif;text-align:center;padding:60px 20px;">
        <h2 style="color:#ef4444">Link expired or invalid</h2>
        <p>This verification link has expired or already been used.</p>
        <a href="${process.env.CLIENT_URL}/register" style="color:#111827">Register again</a>
      </div>
    `);
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpiry = undefined;
  await user.save();

  // redirect to login page with success message
  res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);
};

exports.resendVerification = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user)
    return res
      .status(404)
      .json({ message: "No account found with this email" });
  if (user.isVerified)
    return res.status(400).json({ message: "Email already verified" });

  const token = user.generateVerificationToken();
  await user.save();

  await sendVerificationEmail(user, token);
  res.json({ message: "Verification email resent!" });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ message: "Invalid credentials" });

  if (!user.isVerified)
    return res.status(401).json({
      message: "Please verify your email first.",
      notVerified: true, // frontend uses this to show resend button
    });

  res.json({
    token: genToken(user._id),
    user: { id: user._id, name: user.name, role: user.role },
  });
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};
