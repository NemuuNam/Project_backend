const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');


const { protect, authorize } = require('../middlewares/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. หมวดหมู่สินค้า (Categories)
// ==========================================

/** ดึงข้อมูลหมวดหมู่ (Public: ตามข้อ 1 ในตารางขอบเขต) */
router.get('/categories', productController.getAllCategories);

/** เพิ่มหมวดหมู่ใหม่ (สิทธิ์ MANAGE_PRODUCTS) */
router.post(
    '/categories',
    protect,
    authorize('MANAGE_PRODUCTS'),
    productController.createCategory
);

/** ลบหมวดหมู่ (สิทธิ์ MANAGE_PRODUCTS) */
router.delete(
    '/categories/:id',
    protect,
    authorize('MANAGE_PRODUCTS'),
    productController.deleteCategory
);


// ==========================================
// 2. รายการสินค้า (Products) - ตารางข้อ 7
// ==========================================

/** ดึงข้อมูลสินค้าทั้งหมด (Public: ใครก็เข้าชมได้ตามข้อ 1 ในตาราง) */
router.get('/', productController.getAllProducts);

/** Sync ข้อมูลสินค้าในตะกร้า (Public) */
router.post('/sync-cart', productController.syncCartItems);

/** * เพิ่มสินค้าใหม่ (สิทธิ์ MANAGE_PRODUCTS) 
 * สอดคล้องกับกิจกรรมข้อ 7: จัดการสินค้า
 */
router.post(
    '/',
    protect,
    authorize('MANAGE_PRODUCTS'),
    upload.single('image'),
    productController.createProduct
);

/** ดึงรีวิวสินค้า (Public) - สอดคล้องกับขอบเขตข้อ 2 */
router.get(
    '/reviews/public/all', 
    productController.getProductReviews
);


router.post(
    '/:id/view', 
    productController.trackProductView
);

/** * ปรับปรุงสต็อกสินค้า (สิทธิ์ MANAGE_PRODUCTS) 
 * เพิ่มเข้าไปเพื่อให้รองรับ URL /:id/stock
 */
router.patch(
    '/:id/stock', 
    protect, 
    authorize('MANAGE_PRODUCTS'), 
    productController.updateStock 
);

/** * แก้ไขข้อมูลสินค้า (สิทธิ์ MANAGE_PRODUCTS) 
 * สอดคล้องกับกิจกรรมข้อ 7: จัดการสินค้า
 */
router.patch(
    '/:id',
    protect,
    authorize('MANAGE_PRODUCTS'),
    upload.single('image'),
    productController.updateProduct
);

/** * ลบสินค้า (สิทธิ์ MANAGE_PRODUCTS) 
 * สอดคล้องกับกิจกรรมข้อ 7: จัดการสินค้า
 */
router.delete(
    '/:id',
    protect,
    authorize('MANAGE_PRODUCTS'),
    productController.deleteProduct
);

module.exports = router;