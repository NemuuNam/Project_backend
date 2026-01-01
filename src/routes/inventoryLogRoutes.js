// routes/inventoryLogRoutes.js
const express = require('express');
const router = express.Router();
const inventoryLogController = require('../controllers/inventoryLogController');
const { protect, admin , isAdminManager } = require('../middlewares/authMiddleware');


// Path จริงจะกลายเป็น /api/admin/inv-log/clear
router.delete('/clear', protect, admin, inventoryLogController.clearAllInventoryLogs); 

router.get('/', protect, isAdminManager, inventoryLogController.getInventoryLogs);

module.exports = router;