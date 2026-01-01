const jwt = require('jsonwebtoken');

/**
 * 1. ระบบตรวจสอบการเข้าสู่ระบบ (Token Validation)
 */
const protect = (req, res, next) => {
    let token = req.headers.authorization;

    // DEBUG: ตรวจสอบ Header ที่ส่งมาจาก Frontend
    console.log('--- [DEBUG: protect] ---');
    console.log('Header Authorization:', token);

    if (token && token.startsWith('Bearer')) {
        try {
            token = token.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // เก็บข้อมูล User ไว้ใน req
            req.user = decoded; 
            
            // DEBUG: ดูว่าใน Token มีข้อมูลอะไรบ้าง (ต้องมี role_level)
            console.log('Decoded Token Payload:', decoded);
            
            next();
        } catch (error) {
            console.error('JWT Error:', error.message);
            res.status(401).json({ message: "Token ไม่ถูกต้องหรือหมดอายุ" });
        }
    } else {
        console.warn('No token provided');
        res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });
    }
};

/**
 * 2. สำหรับพนักงาน (ID: 1, 2, 3)
 */
const isStaff = (req, res, next) => {
    console.log('--- [DEBUG: isStaff Check] ---');
    console.log('User Role ID:', req.user?.role_level);

    if (req.user && [1, 2, 3].includes(req.user.role_level)) {
        console.log('Access Granted: Staff Level');
        next();
    } else {
        console.warn('Access Denied: Not a staff member');
        res.status(403).json({ 
            message: "สงวนสิทธิ์เฉพาะพนักงานร้านเท่านั้น",
            debug_role: req.user ? req.user.role_level : 'No User'
        });
    }
};

/**
 * 3. สำหรับผู้ดูแลระบบ (ID: 1, 2)
 */
const isAdminManager = (req, res, next) => {
    console.log('--- [DEBUG: isAdminManager Check] ---');
    console.log('User Role ID:', req.user?.role_level);

    if (req.user && [1, 2].includes(req.user.role_level)) {
        console.log('Access Granted: Owner/Admin Level');
        next();
    } else {
        console.error('Access Denied: Insufficient Role ID');
        res.status(403).json({ 
            message: "เฉพาะผู้บริหารหรือแอดมินเท่านั้น",
            current_role_level: req.user ? req.user.role_level : 'undefined' 
        });
    }
};

/**
 * 4. สำหรับผู้บริหาร (ID: 1)
 */
const admin = (req, res, next) => {
    if (req.user && req.user.role_level === 1) {
        next();
    } else {
        res.status(403).json({ message: "เฉพาะผู้บริหารเท่านั้น" });
    }
};

// *** ต้อง Export ออกไปแบบ Object ให้ครบทุกตัว ***
module.exports = { 
    protect, 
    isStaff, 
    isAdminManager, 
    admin 
};