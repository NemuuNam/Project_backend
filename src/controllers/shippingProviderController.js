// src/routes/shippingProviderRoutes.js
const express = require('express');
const router = express.Router();

// ✅ นำเข้า Controller ที่เราเพิ่งสร้าง
const shippingProviderController = require('../controllers/shippingProviderController');

// ✅ นำเข้า Middleware ตรวจสอบสิทธิ์
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * Path: /api/admin/shipping-providers
 * กิจกรรม: อัปเดตสถานะคำสั่งซื้อ (รายการที่ 6 ในตารางขอบเขต)
 * สิทธิ์: ผู้ดูแลระบบ และ ผู้จัดการ
 */
router.get(
    '/', 
    protect, 
    authorize('UPDATE_ORDER_STATUS'), // ✅ ตรวจสอบสิทธิ์ตามตารางวิจัยข้อ 6
    shippingProviderController.getAllShippingProviders
);

module.exports = router;