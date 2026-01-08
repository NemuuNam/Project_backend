const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma'); // เพิ่มการดึง prisma มาใช้งาน

/**
 * 1. ระบบตรวจสอบการเข้าสู่ระบบ (Token Validation)
 */
const protect = (req, res, next) => {
    let token = req.headers.authorization;

    if (token && token.startsWith('Bearer')) {
        try {
            token = token.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // เก็บข้อมูล User ไว้ใน req (ตรวจสอบว่าใช้ user_id หรือ id ให้ตรงกัน)
            req.user = decoded; 
            next();
        } catch (error) {
            res.status(401).json({ message: "Token ไม่ถูกต้องหรือหมดอายุ" });
        }
    } else {
        res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });
    }
};

/**
 * 2. ระบบตรวจสอบสิทธิ์รายกิจกรรม (Permission-Based)
 */
const authorize = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.user_id || req.user.id;

            const user = await prisma.users.findUnique({
                where: { user_id: userId },
                include: {
                    role: {
                        include: {
                            // ✅ แก้จาก role_permissions เป็น permissions ให้ตรงกับ Schema
                            permissions: { 
                                include: { permission: true }
                            }
                        }
                    }
                }
            });

            if (!user || !user.role) return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });

            // ✅ แก้จาก user.role.role_permissions เป็น user.role.permissions
            const userPermissions = user.role.permissions.map(rp => rp.permission.permission_name);

            if (!userPermissions.includes(requiredPermission)) {
                return res.status(403).json({ 
                    message: `คุณไม่มีสิทธิ์ทำรายการนี้ (ต้องการ: ${requiredPermission})` 
                });
            }

            next();
        } catch (error) {
            console.error("Authorization Middleware Error:", error); // เพิ่ม Log เพื่อดู Error จริงใน Terminal
            res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" });
        }
    };
};

/**
 * 3. ตัวช่วยเช็กกลุ่ม Staff (สั้นๆ สำหรับหน้าบ้าน)
 */
const isStaff = async (req, res, next) => {
    // เปลี่ยนจากเช็กเลข 1,2,3 เป็นการเช็กว่า "ไม่ใช่ Customer" แทน เพื่อความยืดหยุ่น
    if (req.user && req.user.role_level < 4) {
        next();
    } else {
        res.status(403).json({ message: "สงวนสิทธิ์เฉพาะพนักงาน" });
    }
};

module.exports = { 
    protect, 
    authorize, // ✅ เพิ่มตัวนี้เพื่อใช้เช็กสิทธิ์ตามรูปตารางขอบเขตโครงการ
    isStaff 
};