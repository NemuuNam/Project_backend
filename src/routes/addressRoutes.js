const express = require('express');
const router = express.Router();
const addressesController = require('../controllers/addressesController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, addressesController.getUserAddresses);
router.post('/', protect, addressesController.createAddress);

module.exports = router;