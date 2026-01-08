const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middlewares/authMiddleware');

// 1. [POST] ส่งรีวิวใหม่ (ต้อง Login)
router.post('/', protect, reviewController.createReview);

// 2. [GET] ดึงรีวิวทั้งหมดแบบสุ่มสำหรับหน้า Home 
// ✅ ต้องวางไว้ "ก่อน" Route ที่มี :id หรือ :productId เสมอ
router.get('/all', reviewController.getRandomReviews);

// 3. [GET] ดึงรีวิวตามรหัสสินค้า (Dynamic Parameter)
router.get('/:productId', reviewController.getProductReviews);

module.exports = router;