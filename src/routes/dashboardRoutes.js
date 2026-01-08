const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// ✅ นำเข้า authorize เข้ามาแทน isStaff
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * [GET] /api/admin/dashboard/stats
 * สิทธิ์: ผู้ดูแลระบบ, เจ้าของ, ผู้จัดการ (สอดคล้องกับข้อ 10 ในตารางขอบเขต)
 */
router.get(
    '/stats', 
    protect, 
    authorize('VIEW_SALES_REPORTS'), // ✅ ใช้ Permission 'VIEW_SALES_REPORTS'
    dashboardController.getDashboardStats
);

module.exports = router;