const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopSettingController');
const { protect, authorize } = require('../middlewares/authMiddleware'); 
const multer = require('multer');

// ตั้งค่า Multer ให้เก็บไฟล์ในหน่วยความจำก่อนส่งไป Supabase
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // จำกัดไฟล์ละไม่เกิน 5MB
    }
});

/**
 * Path: /api/admin/shop-settings
 */

// --- 1. ส่วนจัดการหน้าแรก (Hero & Story Section) ---

// [GET] ดึงข้อมูลมาโชว์ที่หน้า Home (สาธารณะ)
router.get('/home', shopController.getHomeSettings);

// [PUT] แก้ไขข้อความและอัปโหลดรูปภาพหลายจุด
// ✅ เปลี่ยนจาก .single('image') เป็น .fields() เพื่อรับรูปแยกตามฟิลด์ที่กำหนด
router.put(
    '/home', 
    protect, 
    authorize('MANAGE_PRODUCTS'), 
    upload.fields([
        { name: 'hero_image_url', maxCount: 10 }, // รูปหลักของร้าน
        { name: 'story_image_1', maxCount: 1 },  // รูปประกอบเรื่องราว 1
        { name: 'story_image_2', maxCount: 1 }   // รูปประกอบเรื่องราว 2
    ]), 
    shopController.updateHomeSettings
);

// --- 2. ส่วนจัดการร้านค้าทั่วไป (Social & Settings) ---

// แก้ไขโซเชียลมีเดีย (Facebook, IG, Line)
router.put('/update-social', protect, authorize('MANAGE_PRODUCTS'), shopController.updateSocialSettings);

// [GET] ดึงข้อมูลสาธารณะ (ชื่อร้าน, เบอร์โทร สำหรับ Header/Footer)
router.get('/public', shopController.getPublicSettings);

// [GET] ดึงการตั้งค่าทั้งหมด (รวมถึงค่าขนส่งที่ตั้งไว้)
router.get('/', protect, authorize('MANAGE_PRODUCTS'), shopController.getSettings);

// [PUT] อัปเดตการตั้งค่าทั่วไป (เช่น ค่าธรรมเนียมการจัดส่ง)
router.put('/', protect, authorize('MANAGE_PRODUCTS'), shopController.updateSettings);

// --- 3. ส่วนขนส่งและธนาคาร (Logistics & Finance) ---

// จัดการผู้ให้บริการขนส่ง (ใช้สิทธิ์อัปเดตสถานะออเดอร์)
router.get('/providers', shopController.getShippingProviders);
router.post('/providers', protect, authorize('UPDATE_ORDER_STATUS'), shopController.createShippingProvider);
router.delete('/providers/:id', protect, authorize('UPDATE_ORDER_STATUS'), shopController.deleteShippingProvider);

// จัดการช่องทางการชำระเงิน (ระบบอัปโหลดสลิปที่ต้องการความปลอดภัย)
router.get('/payments', shopController.getPaymentMethods);
router.post('/payments', protect, authorize('VERIFY_PAYMENT'), shopController.createPaymentMethod);
router.delete('/payments/:id', protect, authorize('VERIFY_PAYMENT'), shopController.deletePaymentMethod);

module.exports = router;