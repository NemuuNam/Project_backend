const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, isStaff } = require('../middlewares/authMiddleware'); 
const multer = require('multer');

const storage = multer.memoryStorage(); // เก็บไฟล์ใน RAM ชั่วคราวแทนการเขียนลง disk
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // จำกัดขนาดไฟล์ไม่เกิน 5MB (ปรับแต่งได้)
    }
});

// Customer
router.post('/', protect, upload.single('slip'), orderController.createOrder); 
router.get('/my-orders', protect, orderController.getMyOrders);
router.get('/:id', protect, orderController.getOrderDetail);

// Admin
router.get('/', protect, isStaff, orderController.getAllOrders); 
router.post('/verify-payment', protect, isStaff, orderController.verifyPayment);
router.patch('/:id/status', protect, isStaff, orderController.updateOrderStatus); // ✅ จัดการสถานะทั่วไป + คืนสต็อก
router.patch('/:id/tracking', protect, isStaff, orderController.updateTracking); // ✅ จัดการ Tracking + Tags

module.exports = router;