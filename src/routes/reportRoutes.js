const express = require('express');
const router = express.Router();

// นำเข้า Controller
const reportController = require('../controllers/reportController');

// ✅ นำเข้า authorize มาใช้งานแทน isAdminManager
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * [GET] /api/admin/reports/sales
 * กิจกรรม: ดูรายงานยอดขาย (รายการที่ 10 ในตารางขอบเขต)
 * สิทธิ์: ผู้ดูแลระบบ และ เจ้าของ 
 */
router.get(
    '/sales', 
    protect, 
    authorize('VIEW_SALES_REPORTS'), // ✅ ใช้สิทธิ์ตรงตามข้อ 10 ในตาราง
    reportController.getSalesReport
);

module.exports = router;