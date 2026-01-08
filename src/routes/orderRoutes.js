const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const multer = require('multer');

// ใช้ Memory Storage สำหรับรองรับการ Deploy บน Vercel
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // จำกัดขนาด 5MB
});

/**
 * ==========================================
 * 🛡️ 1. ส่วนสำหรับ Admin & Staff (Management)
 * ==========================================
 */

// ดึงรายการออเดอร์ทั้งหมด (ใช้ในหน้า Order Center)
router.get('/', protect, authorize('UPDATE_ORDER_STATUS'), orderController.getAllOrders); 

// ดึงรายชื่อบริษัทขนส่ง (สำหรับ Dropdown ตอนใส่เลขพัสดุ)
router.get('/shipping-providers', protect, authorize('UPDATE_ORDER_STATUS'), orderController.getShippingProviders); 

// ยืนยันการชำระเงิน (Verify Payment - ย้ายสถานะเป็น "กำลังดำเนินการ")
router.post('/verify-payment', protect, authorize('VERIFY_PAYMENT'), orderController.verifyPayment);

// ปฏิเสธสลิป (แจ้งลูกค้าให้ส่งสลิปใหม่ - ย้ายสถานะเป็น "รอแก้ไขสลิป")
router.patch('/:id/reject-slip', protect, authorize('VERIFY_PAYMENT'), orderController.rejectPaymentSlip);

/**
 * ==========================================
 * 👤 2. ส่วนสำหรับลูกค้า (Customer)
 * ==========================================
 */

// สร้างออเดอร์ใหม่ (ตอน Checkout ครั้งแรก)
router.post('/', protect, authorize('PLACE_ORDER'), upload.single('slip'), orderController.createOrder); 

// ดูรายการออเดอร์ของตนเอง (หน้า My Orders)
router.get('/my-orders', protect, authorize('PLACE_ORDER'), orderController.getMyOrders);

// อัปโหลดสลิปใหม่ (กรณีโดน Admin ปฏิเสธ หรือต้องการแก้ไข)
router.patch('/:id/reslip', protect, authorize('PLACE_ORDER'), upload.single('slip'), orderController.updatePaymentSlip);

/**
 * ==========================================
 * ⚙️ 3. ส่วนจัดการรายรายการ (Dynamic ID)
 * ==========================================
 */

// ดูรายละเอียดคำสั่งซื้อรายตัว (ใช้ทั้งหน้า Admin และ Customer)
router.get('/:id', protect, authorize('PLACE_ORDER'), orderController.getOrderDetail);

// อัปเดตสถานะออเดอร์ทั่วไป (เช่น กำลังจัดส่ง, สำเร็จ)
router.patch('/:id/status', protect, authorize('UPDATE_ORDER_STATUS'), orderController.updateOrderStatus);

// อัปเดตเลขพัสดุและบริษัทขนส่ง
router.patch('/:id/tracking', protect, authorize('UPDATE_ORDER_STATUS'), orderController.updateTracking);

// ยกเลิกออเดอร์ (คืนสต็อกสินค้าอัตโนมัติ)
router.patch('/:id/cancel', protect, authorize('PLACE_ORDER'), orderController.cancelOrder);

module.exports = router;