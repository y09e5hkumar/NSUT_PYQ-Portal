const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const genToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER.trim(),
      pass: process.env.EMAIL_PASS.trim(),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const sendVerificationEmail = async (user, token) => {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("EMAIL_USER or EMAIL_PASS environment variable is not configured on the server.");
  }

  const baseUrl = (process.env.SERVER_URL || "http://localhost:5001").replace(/\/$/, "");
  const verifyUrl = `${baseUrl}/api/auth/verify/${token}`;

  await transporter.sendMail({
    from: `"NSUT PYQ Portal" <${process.env.EMAIL_USER.trim()}>`,
    to: user.email,
    subject: "Verify your NSUT PYQ Portal account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111827">Welcome to NSUT PYQ Portal 📄</h2>
        <p>Hi ${user.name},</p>
        <p>Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
        <a href="${verifyUrl}" 
          style="display:inline-block;margin:16px 0;padding:12px 24px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
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

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (await User.findOne({ email: normalizedEmail })) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const role = adminCode === process.env.ADMIN_SECRET_CODE ? "admin" : "student";
  const user = new User({ name: name.trim(), email: normalizedEmail, password, branch, role });

  const token = user.generateVerificationToken();
  await user.save();

  try {
    await sendVerificationEmail(user, token);
    res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Email verification error:", err.message);

    // Auto-verify fallback so user registration is never blocked by SMTP/Render environment issues
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpiry = undefined;
    await user.save();

    res.status(201).json({
      message: "Registration successful! Your account is ready. You can now log in.",
    });
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
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/register" style="color:#111827">Register again</a>
      </div>
    `);
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpiry = undefined;
  await user.save();

  // redirect to login page with success message
  res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?verified=true`);
};

exports.resendVerification = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user)
    return res.status(404).json({ message: "No account found with this email" });
  if (user.isVerified)
    return res.status(400).json({ message: "Email already verified" });

  const token = user.generateVerificationToken();
  await user.save();

  try {
    await sendVerificationEmail(user, token);
    res.json({ message: "Verification email resent! Check your inbox." });
  } catch (err) {
    console.error("Resend email error:", err.message);

    // Auto-verify on resend error
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpiry = undefined;
    await user.save();

    res.json({ message: "Account verified automatically! You can now log in." });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter both email and password." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (!user.isVerified) {
    return res.status(401).json({
      message: "Please verify your email first.",
      notVerified: true, // frontend uses this to show resend button
    });
  }

  res.json({
    token: genToken(user._id),
    user: { id: user._id, name: user.name, role: user.role, email: user.email },
  });
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};
