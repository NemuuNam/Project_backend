// backend/src/routes/shippingRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protect, isStaff } = require('../middlewares/authMiddleware');

// API สำหรับดึงรายชื่อขนส่ง (Nim express, Fuze)
router.get('/', protect, isStaff, async (req, res) => {
    try {
        const providers = await prisma.Shipping_Providers.findMany({
            orderBy: { provider_id: 'asc' }
        });
        res.json({ success: true, data: providers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;