const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const orderController = require('../controllers/orderController');

router.get('/', async (req, res) => {
    try {
        const providers = await prisma.shipping_Providers.findMany();
        res.json({ success: true, data: providers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;