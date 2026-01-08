const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { register, login, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');

// ✅ นำเข้า authorize เข้ามาใช้งานร่วมกับ protect
const { protect, authorize } = require('../middlewares/authMiddleware');

// --- 1. Public Auth (ใครก็เข้าถึงได้ตามข้อ 2 ในตาราง) ---
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// --- 2. Protected Auth (ต้อง Login และมีสิทธิ์ AUTH_ACCESS) ---
// ใช้ authorize('AUTH_ACCESS') เพื่อเช็คสิทธิ์ "สมัครสมาชิกและเข้าสู่ระบบ"
router.get('/profile', protect, authorize('AUTH_ACCESS'), userController.getProfile);
router.put('/profile', protect, authorize('AUTH_ACCESS'), userController.updateProfile);
router.put('/change-password', protect, authorize('AUTH_ACCESS'), changePassword);

module.exports = router;