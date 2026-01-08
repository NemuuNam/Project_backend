const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// ✅ นำเข้า authorize เข้ามาใช้งานแทนการเช็กระดับเลเวล (isAdminManager)
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * Path: /api/admin/users
 */

// 1. ดึงรายการผู้ใช้ทั้งหมด
// กิจกรรม: จัดการผู้ใช้งาน (รายการที่ 8 ในตารางขอบเขต)
// สิทธิ์: ผู้ดูแลระบบเท่านั้น
router.get(
    '/', 
    protect, 
    authorize('MANAGE_USERS'), // ✅ ตรวจสอบสิทธิ์รายกิจกรรม
    userController.getAllUsers
);

// 2. เปลี่ยนบทบาท/สิทธิ์ของผู้ใช้งาน
// กิจกรรม: จัดการผู้ใช้งาน (รายการที่ 8 ในตารางขอบเขต)
router.patch(
    '/:id/role', 
    protect, 
    authorize('MANAGE_USERS'), 
    userController.updateUserRole
);

// 3. ลบผู้ใช้งานออกจากระบบ
// กิจกรรม: จัดการผู้ใช้งาน (รายการที่ 8 ในตารางขอบเขต)
router.delete(
    '/:id', 
    protect, 
    authorize('MANAGE_USERS'), 
    userController.deleteUser
);

module.exports = router;