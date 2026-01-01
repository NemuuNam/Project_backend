const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, isAdminManager } = require('../middlewares/authMiddleware');

// 1. ย้าย /profile มาไว้บนสุดของไฟล์ (ก่อน Route ที่มี /:id อื่นๆ)
router.get('/profile', protect, userController.getProfile);

// 2. ตามด้วย Route อื่นๆ ที่ต้องเช็คสิทธิ์แอดมิน
router.get('/', protect, isAdminManager, userController.getAllUsers);
router.patch('/:id/role', protect, isAdminManager, userController.updateUserRole);
router.delete('/:id', protect, isAdminManager, userController.deleteUser);

module.exports = router;