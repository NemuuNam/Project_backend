const express = require('express');
const router = express.Router();
const multer = require('multer');
const paymentController = require('../controllers/paymentController');
const { protect, isStaff } = require('../middlewares/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-slip', protect, upload.single('slip'), paymentController.uploadPaymentSlip);
router.put('/verify/:payment_id', protect, isStaff, paymentController.verifyPayment);

module.exports = router;