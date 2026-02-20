import express from "express"
import { login, register, reVerify, verify, verifyOTP, makeAdmin, initializeFirstAdmin, forgotPassword, resetPassword, testEmail } from "../controllers/user_controller.js"
import { isAuthenticated } from "../middleware/auth_middleware.js"

const router=express.Router()

router.post("/register",register)
router.post("/verify",verify)
router.post("/verify-otp", verifyOTP) // 🔒 New OTP verification endpoint
router.post("/reverify",reVerify)
router.post("/login",login)
router.post("/forgot-password", forgotPassword) // 📧 Forgot password endpoint
router.post("/reset-password", resetPassword) // 🔐 Reset password endpoint
router.get("/test-email", testEmail) // 🧪 Test email endpoint (temp)
router.post("/initialize-admin", initializeFirstAdmin) // 🔐 Protected by secret key
router.post("/make-admin", isAuthenticated, makeAdmin) // 🔒 Protected by authentication
export default router