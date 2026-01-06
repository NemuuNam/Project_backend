const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { createLog } = require('../controllers/systemLogController'); // ✅ นำเข้าฟังก์ชันบันทึก Log
const { 
    register, 
    login, 
    forgotPassword, 
    resetPassword 
} = require('../controllers/authController');

// --- 1. Standard Auth (Email/Password) ---
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);


module.exports = router;

