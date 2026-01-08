const express = require('express');
const router = express.Router();
const systemLogController = require('../controllers/systemLogController');

// ✅ นำเข้า authorize มาใช้งาน
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * [DELETE] /api/admin/system-log/clear
 * กิจกรรม: ล้างประวัติ Log ทั้งหมดของระบบ
 * สิทธิ์: ผู้ดูแลระบบเท่านั้น (สอดคล้องกับกิจกรรมข้อ 8 ในตารางขอบเขต)
 */
router.delete(
    '/clear', 
    protect, 
    authorize('MANAGE_USERS'), // ✅ ใช้สิทธิ์จัดการระบบสูงสุด
    systemLogController.clearAllLogs
);

/**
 * [GET] /api/admin/system-log
 * กิจกรรม: ดูประวัติการทำงานของระบบ (System Logs)
 * สิทธิ์: ผู้ดูแลระบบเท่านั้น (สอดคล้องกับกิจกรรมข้อ 8 ในตารางขอบเขต)
 */
router.get(
    '/', 
    protect, 
    authorize('MANAGE_USERS'), // ✅ ตรวจสอบสิทธิ์รายกิจกรรมแทน isAdminManager
    systemLogController.getSystemLogs
);

module.exports = router;