const express = require('express');
const router = express.Router();
const systemLogController = require('../controllers/systemLogController');
const { protect, isAdminManager , admin } = require('../middlewares/authMiddleware');

// ตัดคำว่า /system-log ออก เพราะ server.js จัดการให้แล้ว
router.delete('/clear', protect, admin, systemLogController.clearAllLogs);
router.get('/', protect, isAdminManager, systemLogController.getSystemLogs);

module.exports = router;