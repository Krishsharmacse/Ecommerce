import { User } from "../models/user_model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { verifyEmail } from "../EMAILVERIFY/verifmail.js";
import { Session } from "../models/sessionModel.js";

export const register = async (req, res) => {
    try {
        const { firstname, lastname, email, password } = req.body;

        // 1️⃣ Validate input
        if (!firstname || !lastname || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // 2️⃣ Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        // 3️⃣ Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4️⃣ Create user instance
        const newUser = new User({
            firstname,
            lastname,
            email,
            password: hashedPassword
        });

        // 5️⃣ Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        newUser.otp = otp;
        newUser.otpExpiry = otpExpiry;

        // 6️⃣ Save user first (important before sending email)
        await newUser.save();

        // 7️⃣ Generate JWT token for login purposes
        const token = jwt.sign(
            { id: newUser._id },
            process.env.SECRET_KEY,
            { expiresIn: "10d" }
        );

        // 8️⃣ Send verification email with OTP (non-blocking - don't wait for it)
        verifyEmail(otp, email).catch((err) => {
            console.error("Email verification failed, but registration succeeded:", err.message);
        });

        // 9️⃣ Respond to client
        return res.status(201).json({
            success: true,
            message: "User registered successfully. Check your email for the 6-digit OTP!",
            user: {
                id: newUser._id,
                firstname: newUser.firstname,
                lastname: newUser.lastname,
                email: newUser.email,
                role: newUser.role
            },
            token: token
        });

    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if OTP matches and hasn't expired
        if (user.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        // Mark as verified and clear OTP
        user.isverified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Email verified successfully!",
            user: {
                id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const verify = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(400).json({
                success: false,
                message: "Authorization token missing or invalid"
            });
        }

        const token = authHeader.split(" ")[1];

        let decoded;

        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(400).json({
                    success: false,
                    message: "The registered token has expired"
                });
            }

            return res.status(400).json({
                success: false,
                message: "Token verification failed"
            });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        user.token = null;
        user.isverified = true;

        await user.save();
        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
            user: {
                id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const reVerify = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        // Send OTP via email
        verifyEmail(otp, email);
        
        return res.status(200).json({
            success: true,
            message: "Verification OTP sent successfully to your email"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password"
            });
        }

        const existingUser = await User.findOne({ email });

        if (!existingUser) {
            return res.status(400).json({
                success: false,
                message: "User does not exist, register first"
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            existingUser.password
        );

        // ✅ FIXED variable name
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        if (!existingUser.isverified) {
            const accessToken = jwt.sign(
                { id: existingUser._id },
                process.env.SECRET_KEY,
                { expiresIn: "10d" }
            );

            const refreshToken = jwt.sign(
                { id: existingUser._id },
                process.env.SECRET_KEY,
                { expiresIn: "30d" }
            );
            
            return res.status(200).json({
                success: true,
                message: "Please verify your email to unlock all features. You can login now.",
                user: {
                    id: existingUser._id,
                    firstname: existingUser.firstname,
                    email: existingUser.email,
                    role: existingUser.role,
                    isverified: existingUser.isverified
                },
                token: accessToken,
                accessToken,
                refreshToken
            });
        }

        const accessToken = jwt.sign(
            { id: existingUser._id },
            process.env.SECRET_KEY,
            { expiresIn: "10d" }
        );

        const refreshToken = jwt.sign(
            { id: existingUser._id },
            process.env.SECRET_KEY,
            { expiresIn: "30d" }
        );

        existingUser.isloggedin = true;
        await existingUser.save();

        const existingSession = await Session.findOne({
            userId: existingUser._id
        });

        if (existingSession) {
            await Session.deleteOne({ userId: existingUser._id });
        }

        await Session.create({ userId: existingUser._id });

        return res.status(200).json({
            success: true,
            message: `Welcome back ${existingUser.firstname}`,
            user: {
                id: existingUser._id,
                firstname: existingUser.firstname,
                email: existingUser.email,
                role: existingUser.role,
                isverified: existingUser.isverified
            },
            token: accessToken,
            accessToken,
            refreshToken
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const makeAdmin = async (req, res) => {
    try {
        // 🔒 SECURITY: Only existing admins can make other users admins
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to make admin"
            });
        }

        const token = authHeader.split(" ")[1];
        let decoded;

        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Check if requester is an admin
        const requestingUser = await User.findById(decoded.id);
        if (!requestingUser || requestingUser.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can assign admin role"
            });
        }

        // Now make the target user admin
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const targetUser = await User.findOne({ email });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (targetUser.role === "admin") {
            return res.status(400).json({
                success: false,
                message: "User is already an admin"
            });
        }

        targetUser.role = "admin";
        await targetUser.save();

        console.log(`✅ Admin ${requestingUser.email} promoted ${email} to admin role`);

        return res.status(200).json({
            success: true,
            message: `${email} is now an admin!`,
            user: {
                id: targetUser._id,
                firstname: targetUser.firstname,
                email: targetUser.email,
                role: targetUser.role
            }
        });

    } catch (error) {
        console.error("Make admin error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 🔒 SECURE: Special endpoint for initializing the FIRST admin only
// Can only be called if no admins exist in the database
export const initializeFirstAdmin = async (req, res) => {
    try {
        const { email, adminSecret } = req.body;

        // 🔐 Require a special admin secret key from environment
        if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({
                success: false,
                message: "Invalid admin secret key"
            });
        }

        // Check if any admin already exists
        const existingAdmin = await User.findOne({ role: "admin" });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "An admin already exists. Use the admin dashboard to assign more admins."
            });
        }

        // Find and promote user to admin
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.role = "admin";
        await user.save();

        console.log(`✅ First admin initialized: ${email}`);

        return res.status(200).json({
            success: true,
            message: `${email} is now the first admin!`,
            user: {
                id: user._id,
                firstname: user.firstname,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Initialize first admin error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 📧 FORGOT PASSWORD: Send reset token via email
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Generate reset token (32 bytes = 64 character hex string)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        user.resetToken = resetTokenHash;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // Create reset password link
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        // Send email with reset link
        try {
            await sendPasswordResetEmail(email, resetLink, user.firstname);
            console.log(`✅ Password reset email sent to: ${email}`);
        } catch (emailError) {
            console.error("❌ Email sending failed:", emailError.message);
            return res.status(500).json({
                success: false,
                message: `Email Error: ${emailError.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: "Password reset link sent to your email. Link expires in 15 minutes."
        });

    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 🔐 RESET PASSWORD: Verify token and update password
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Token and passwords are required"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        // Hash the token to compare with stored hash
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid reset token
        const user = await User.findOne({
            resetToken: resetTokenHash,
            resetTokenExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        console.log(`✅ Password reset successfully for: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: "Password reset successfully! You can now login with your new password."
        });

    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 📨 Helper function to send password reset email
const sendPasswordResetEmail = async (email, resetLink, firstName) => {
    try {
        console.log('🔧 Email config:', {
            user: process.env.EMAIL_USER,
            hasPassword: !!process.env.EMAIL_PASS,
            frontendUrl: process.env.FRONTEND_URL
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP Server connected');

        const mailOptions = {
            from: `"ProductStore" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request - ProductStore',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f7f7f7; padding: 20px; border-radius: 5px;">
                        <h2 style="color: #333;">Password Reset Request</h2>
                        <p>Hello <strong>${firstName}</strong>,</p>
                        <p>You requested to reset your password. Click the button below to reset it:</p>
                        <div style="margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                                Reset Password
                            </a>
                        </div>
                        <p>Or copy and paste this link in your browser:</p>
                        <p style="background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; word-break: break-all;">
                            ${resetLink}
                        </p>
                        <p><strong>⏱️ This link will expire in 15 minutes.</strong></p>
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">If you did not request a password reset, please ignore this email or contact support.</p>
                        <p style="color: #666; font-size: 12px;">Best regards,<br><strong>ProductStore Team</strong></p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', result.messageId);
        return result;
        
    } catch (error) {
        console.error('❌ Email sending error:', {
            message: error.message,
            code: error.code,
            response: error.response
        });
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// 🧪 TEST EMAIL - Temporary endpoint to test email configuration
export const testEmail = async (req, res) => {
    try {
        console.log('🧪 Testing email configuration...');
        console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
        console.log('🔐 EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ Set' : '✗ Not set');
        console.log('🌐 FRONTEND_URL:', process.env.FRONTEND_URL);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP Server verified and connected');

        // Send test email
        const testResult = await transporter.sendMail({
            from: `"ProductStore" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'Test Email - ProductStore',
            html: '<h2>Test Email</h2><p>If you see this, email configuration is working!</p>'
        });

        console.log('✅ Test email sent:', testResult.messageId);

        return res.status(200).json({
            success: true,
            message: 'Test email sent successfully!',
            details: {
                messageId: testResult.messageId,
                emailUser: process.env.EMAIL_USER
            }
        });

    } catch (error) {
        console.error('❌ Email test failed:', {
            message: error.message,
            code: error.code,
            response: error.response
        });

        return res.status(500).json({
            success: false,
            message: `Email configuration error: ${error.message}`,
            code: error.code
        });
    }
};
