// routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, wishlistController.getWishlist);
router.post('/toggle', protect, wishlistController.toggleWishlist);

module.exports = router;
