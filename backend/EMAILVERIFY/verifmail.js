import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const verifyEmail = async (otpOrToken, email) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Check if it's a 6-digit OTP (new system) or token (legacy)
        const isOTP = /^\d{6}$/.test(otpOrToken);

        let mailOptions;
        
        if (isOTP) {
            // New OTP-based verification
            mailOptions = {
                from: `"ProductStore" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Email Verification - Your OTP",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #333;">Welcome to ProductStore!</h2>
                        <p>Your email verification code is:</p>
                        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otpOrToken}</h1>
                        </div>
                        <p>This code will expire in <strong>10 minutes</strong>.</p>
                        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
                    </div>
                `
            };
        } else {
            // Legacy token-based verification
            mailOptions = {
                from: `"ProductStore" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Email Verification",
                html: `
                    <h2>Welcome to ProductStore!</h2>
                    <p>Please verify your email by clicking the link below:</p>
                    <a href="http://localhost:3000/verify/${otpOrToken}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Verify Email
                    </a>
                    <p>Or copy this link: http://localhost:3000/verify/${otpOrToken}</p>
                    <p>This link expires in 10 minutes.</p>
                `
            };
        }

        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully!");

    } catch (error) {
        console.error("❌ Email sending failed:", error);
        throw error;
    }
};
