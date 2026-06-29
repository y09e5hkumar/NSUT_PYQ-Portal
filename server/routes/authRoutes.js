const router = require("express").Router();
const jwt = require("jsonwebtoken");
const passport = require("../config/passport");
const {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerification,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/verify/:token", verifyEmail);
router.post("/resend-verification", resendVerification);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google`,
  }),
  (req, res) => {
    // generate JWT and redirect to frontend
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const user = encodeURIComponent(
      JSON.stringify({
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
        avatar: req.user.avatar,
      })
    );
    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?token=${token}&user=${user}`
    );
  }
);

module.exports = router;
