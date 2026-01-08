const express = require('express');
const router = express.Router();
const addressesController = require('../controllers/addressesController');

// ✅ นำเข้า protect และ authorize มาใช้งาน
const { protect, authorize } = require('../middlewares/authMiddleware');

// 1. ตรวจสอบการเข้าสู่ระบบ (Identity)
router.use(protect);

// 2. ตรวจสอบสิทธิ์รายกิจกรรม (Permission) 
router.use(authorize('PLACE_ORDER'));

// --- เส้นทางจัดการที่อยู่ ---
router.get('/', addressesController.getUserAddresses);     // ดึงที่อยู่ทั้งหมด
router.post('/', addressesController.createAddress);       // เพิ่มที่อยู่ใหม่
router.put('/:id', addressesController.updateAddress);    // แก้ไขที่อยู่
router.delete('/:id', addressesController.deleteAddress); // ลบที่อยู่

module.exports = router;