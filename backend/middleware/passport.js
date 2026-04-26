import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user_model.js";
import jwt from "jsonwebtoken";

const signToken = (id) =>
    jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: "10d" });

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/api/v1/auth/google/callback",
            scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value?.toLowerCase();
                const googleId = profile.id;
                const firstname = profile.name?.givenName || profile.displayName?.split(" ")[0] || "User";
                const lastname = profile.name?.familyName || profile.displayName?.split(" ").slice(1).join(" ") || "";
                const avatar = profile.photos?.[0]?.value || "";

                if (!email) return done(null, false, { message: "No email from Google" });

                // Find or create user
                let user = await User.findOne({ $or: [{ googleId }, { email }] });

                if (user) {
                    // Link Google account to existing email user
                    if (!user.googleId) {
                        user.googleId = googleId;
                        user.isverified = true;
                        if (avatar && !user.profilePIC) user.profilePIC = avatar;
                        await user.save();
                    }
                } else {
                    // New OAuth user
                    user = await User.create({
                        firstname,
                        lastname,
                        email,
                        googleId,
                        password: `google_oauth_${googleId}_${Date.now()}`, // placeholder — never used
                        isverified: true,
                        profilePIC: avatar,
                        role: "user",
                    });
                }

                const token = signToken(user._id);
                user._jwtToken = token; // attach for callback route to read
                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

// Minimal serialize — we use JWT so sessions are optional
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select("-password");
        done(null, user);
    } catch (e) {
        done(e, null);
    }
});

export default passport;
