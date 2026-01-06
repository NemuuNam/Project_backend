const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, isStaff } = require('../middlewares/authMiddleware'); 
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// ✅ 1. ดึงข้อมูลทั่วไป (Static)
router.get('/shipping-providers', protect, isStaff, orderController.getShippingProviders); 
router.get('/', protect, isStaff, orderController.getAllOrders); 
router.post('/verify-payment', protect, isStaff, orderController.verifyPayment);

// ✅ 2. ลูกค้า
router.post('/', protect, upload.single('slip'), orderController.createOrder); 
router.get('/my-orders', protect, orderController.getMyOrders);

// ✅ 3. จัดการผ่าน ID (Dynamic)
router.get('/:id', protect, orderController.getOrderDetail);
router.patch('/:id/status', protect, isStaff, orderController.updateOrderStatus);
router.patch('/:id/slip', protect, isStaff, upload.single('slip'), orderController.updatePaymentSlip);
router.patch('/:id/amount', protect, isStaff, orderController.updateOrderAmount);
router.patch('/:id/cancel', protect, isStaff, orderController.cancelOrder);
router.patch('/:id/tracking', protect, isStaff, orderController.updateTracking);

module.exports = router;