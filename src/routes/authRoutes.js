const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { createLog } = require('../controllers/systemLogController'); // ✅ นำเข้าฟังก์ชันบันทึก Log
const { 
    register, 
    login, 
    forgotPassword, 
    resetPassword 
} = require('../controllers/authController');

// --- 1. Standard Auth (Email/Password) ---
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// --- 2. Google OAuth (Social Login) ---
router.get('/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: 'https://project-frontend-tan.vercel.app/login?error=auth_failed' }), 
    async (req, res) => {
        try {
            const userRoleLevel = req.user.role?.role_level || 4;

            //บันทึก Log เมื่อ Google Login สำเร็จ
            await createLog(
                req.user.user_id, 
                `Google Login: เข้าสู่ระบบสำเร็จ (สิทธิ์ระดับ: ${userRoleLevel})`
            );

            const token = jwt.sign(
                { id: req.user.user_id, email: req.user.email, role_level: userRoleLevel }, 
                process.env.JWT_SECRET || 'fallback_secret_key', 
                { expiresIn: '1d' }
            );

            // ส่งกลับไปที่ Frontend พร้อม Token
            res.redirect(`https://project-frontend-tan.vercel.app/login?token=${token}`);
        } catch (error) {
            console.error("Google Auth Callback Error:", error);
            res.redirect('https://project-frontend-tan.vercel.app/login?error=server_error');
        }
    }
);

module.exports = router;

