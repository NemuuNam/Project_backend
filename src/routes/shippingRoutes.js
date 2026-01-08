const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * [GET] /api/admin/shipping-providers
 * กิจกรรม: ดึงรายชื่อผู้ให้บริการขนส่งเพื่อใช้ในการอัปเดตสถานะ (ข้อ 6 ในตารางขอบเขต)
 * สิทธิ์: ผู้ดูแลระบบ และ ผู้จัดการ
 */
router.get(
    '/', 
    protect, 
    authorize('UPDATE_ORDER_STATUS'), // ✅ ใช้สิทธิ์อัปเดตสถานะคำสั่งซื้อ
    async (req, res) => {
        try {
            const providers = await prisma.shipping_Providers.findMany({
                orderBy: { provider_id: 'asc' }
            });
            res.json({ success: true, data: providers });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

module.exports = router;