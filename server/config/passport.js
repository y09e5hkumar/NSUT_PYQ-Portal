require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) return done(null, user);

        // check if email already registered normally
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // link Google to existing account
          user.googleId = profile.id;
          user.avatar = profile.photos[0]?.value;
          user.isVerified = true;
          await user.save();
          return done(null, user);
        }

        // create new user
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          avatar: profile.photos[0]?.value,
          isVerified: true, // Google already verified the email
          role: "student",
        });

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

module.exports = passport;
