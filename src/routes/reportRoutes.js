const express = require('express');
const router = express.Router();

// นำเข้า Controller ที่เราเพิ่งแก้ไข (ต้องมั่นใจว่าชื่อไฟล์ตรงกัน)
const reportController = require('../controllers/reportController');

// นำเข้า Middleware ตรวจสอบสิทธิ์
const { protect, isAdminManager } = require('../middlewares/authMiddleware');

// กำหนด Route ไปที่ /sales
router.get('/sales', protect, isAdminManager, reportController.getSalesReport);

module.exports = router;