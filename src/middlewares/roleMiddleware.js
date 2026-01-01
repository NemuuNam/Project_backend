// src/middlewares/roleMiddleware.js
const prisma = require('../lib/prisma');

const authorize = (allowedLevels) => {
    return async (req, res, next) => {
        try {
            // ตรวจสอบก่อนว่า req.user ถูกตั้งค่ามาจาก protect middleware หรือยัง
            if (!req.user || !req.user.id) {
                return res.status(401).json({ message: "ไม่พบข้อมูลการเข้าสู่ระบบ" });
            }

            // ดึงข้อมูล User และ Role ตาม Schema
            const user = await prisma.users.findUnique({
                where: { user_id: req.user.id },
                include: { role: true }
            });

            if (!user || !user.role) {
                return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งานหรือบทบาทในระบบ" });
            }

            // ตรวจสอบระดับสิทธิ์ role_level
            if (!allowedLevels.includes(user.role.role_level)) {
                return res.status(403).json({ 
                    message: "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (Forbidden)" 
                });
            }

            next();
        } catch (error) {
            console.error("Auth Error:", error);
            res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" });
        }
    };
};

module.exports = { authorize };