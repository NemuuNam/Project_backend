// routes/inventoryLogRoutes.js
const express = require('express');
const router = express.Router();
const inventoryLogController = require('../controllers/inventoryLogController');

// ✅ นำเข้า authorize มาใช้งานแทน middleware ตัวเก่า
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * [DELETE] /api/admin/inv-log/clear
 * กิจกรรม: ล้างประวัติ Log ทั้งหมดในระบบ
 * สิทธิ์: ผู้ดูแลระบบเท่านั้น (เทียบเท่าการจัดการระบบในข้อ 8)
 */
router.delete(
    '/clear', 
    protect, 
    authorize('MANAGE_USERS'), // ✅ เฉพาะ SystemAdmin ที่มีสิทธิ์จัดการระบบ
    inventoryLogController.clearAllInventoryLogs
); 

/**
 * [GET] /api/admin/inv-log
 * กิจกรรม: ดูรายงานการอัปเดตสต็อก (รายการที่ 9 ในตารางขอบเขต)
 * สิทธิ์: ผู้ดูแลระบบ และ เจ้าของ
 */
router.get(
    '/', 
    protect, 
    authorize('VIEW_STOCK_REPORTS'), // ✅ ใช้สิทธิ์ตรงตามข้อ 9 ในตาราง
    inventoryLogController.getInventoryLogs
);

module.exports = router;