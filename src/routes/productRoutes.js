const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');
const { protect, isStaff, isAdminManager } = require('../middlewares/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. หมวดหมู่สินค้า (Categories) - ตาราง D6
// ==========================================

/** ดึงข้อมูลหมวดหมู่ (Public: ลูกค้าทุกคนเข้าถึงได้เพื่อใช้กรองสินค้า) */
router.get('/categories', productController.getAllCategories);

/** เพิ่มหมวดหมู่ใหม่ (Staff/Admin เท่านั้น) */
router.post('/categories', protect, isStaff, productController.createCategory);

/** ลบหมวดหมู่ (เฉพาะ Admin/Manager เท่านั้น) */
router.delete('/categories/:id', protect, isAdminManager, productController.deleteCategory);


// ==========================================
// 2. รายการสินค้า (Products) - ตาราง D7, D8
// ==========================================

/** ดึงข้อมูลสินค้าทั้งหมด (Public: สำหรับหน้า Home และหน้า Products) */
router.get('/', productController.getAllProducts);

/**Sync ข้อมูลสินค้าในตะกร้า (Public: ใช้ดึงราคาและรูปล่าสุดจาก DB) */
// ต้องเพิ่มฟังก์ชัน syncCartItems ใน productController.js ด้วย
router.post('/sync-cart', productController.syncCartItems);

/** เพิ่มสินค้าใหม่ (Staff ทำได้) */
router.post('/', protect, isStaff, upload.single('image'), productController.createProduct);

/** แก้ไขข้อมูลสินค้า (Staff ทำได้) */
router.patch('/:id', protect, isStaff, upload.single('image'), productController.updateProduct);

/** ลบสินค้า (เฉพาะ Admin/Manager เท่านั้น) */
router.delete('/:id', protect, isAdminManager, productController.deleteProduct);

module.exports = router;