const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, isStaff } = require('../middlewares/authMiddleware');

router.get('/stats', protect, isStaff, dashboardController.getDashboardStats);

module.exports = router;