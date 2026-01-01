const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopSettingController');
const { protect, isAdminManager } = require('../middlewares/authMiddleware'); // ใช้ isAdminManager ให้เลเวล 1,2 แก้ได้
const multer = require('multer');

// ตั้งค่า Multer สำหรับรับไฟล์รูปภาพ
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Path: /api/admin/shop-settings
 */

// --- ส่วนจัดการหน้าแรก (Hero Section) ---
// [GET] ดึงข้อมูลมาโชว์ที่หน้า Home
router.get('/home', shopController.getHomeSettings);

// [PUT] แก้ไขข้อความและอัปโหลดรูป (นี่คือจุดที่ 404 หากไม่มีบรรทัดนี้)
router.put('/home', protect, isAdminManager, upload.single('image'), shopController.updateHomeSettings);

// --- ส่วนจัดการร้านค้าทั่วไป ---
router.put('/update-social', protect, isAdminManager, shopController.updateSocialSettings);
router.get('/public', shopController.getPublicSettings);
router.get('/', shopController.getSettings);
router.put('/', protect, isAdminManager, shopController.updateSettings);

// ส่วนขนส่งและธนาคาร
router.get('/providers', shopController.getShippingProviders);
router.post('/providers', protect, isAdminManager, shopController.createShippingProvider);
router.delete('/providers/:id', protect, isAdminManager, shopController.deleteShippingProvider);

router.get('/payments', shopController.getPaymentMethods);
router.post('/payments', protect, isAdminManager, shopController.createPaymentMethod);
router.delete('/payments/:id', protect, isAdminManager, shopController.deletePaymentMethod);

module.exports = router;