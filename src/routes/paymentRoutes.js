const express = require('express');
const router = express.Router();
const multer = require('multer');
const paymentController = require('../controllers/paymentController');

// ✅ นำเข้า authorize เข้ามาใช้งานแทน isStaff
const { protect, authorize } = require('../middlewares/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

/**
 * [POST] /api/payments/upload-slip
 * กิจกรรม: อัปโหลดหลักฐานการโอนเงิน (สอดคล้องกับกิจกรรมข้อ 4: สั่งซื้อสินค้า)
 * สิทธิ์: ผู้ดูแลระบบ, ผู้จัดการ, ลูกค้า
 */
router.post(
    '/upload-slip', 
    protect, 
    authorize('PLACE_ORDER'), // ✅ ใช้สิทธิ์สั่งซื้อสินค้า
    upload.single('slip'), 
    paymentController.uploadPaymentSlip
);

/**
 * [PUT] /api/payments/verify/:payment_id
 * กิจกรรม: ตรวจสอบการชำระเงิน (สอดคล้องกับกิจกรรมข้อ 5: ตรวจสอบคำสั่งซื้อสินค้า)
 * สิทธิ์: ผู้ดูแลระบบ และ ผู้จัดการ เท่านั้น
 */
router.put(
    '/verify/:payment_id', 
    protect, 
    authorize('VERIFY_PAYMENT'), // ✅ ใช้สิทธิ์ตรวจสอบการชำระเงิน
    paymentController.verifyPayment
);

module.exports = router;