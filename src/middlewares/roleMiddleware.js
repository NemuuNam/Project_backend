const prisma = require('../lib/prisma');

/**
 * authorize: ตรวจสอบว่า User มี Permission ที่กำหนดหรือไม่
 * @param {string} requiredPermission - ชื่อ Permission เช่น 'MANAGE_PRODUCTS'
 */
const authorize = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.user_id) {
                return res.status(401).json({ message: "กรุณาเข้าสู่ระบบ" });
            }

            // ดึง User พร้อม Role และ Permissions ที่เกี่ยวข้อง
            const user = await prisma.users.findUnique({
                where: { user_id: req.user.user_id },
                include: {
                    role: {
                        include: {
                            role_permissions: {
                                include: { permission: true }
                            }
                        }
                    }
                }
            });

            if (!user || !user.role) {
                return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
            }

            // ดึงรายชื่อ Permission ทั้งหมดที่ User คนนี้มี
            const userPermissions = user.role.role_permissions.map(rp => rp.permission.permission_name);

            // ตรวจสอบว่ามีสิทธิ์ที่ต้องการหรือไม่
            if (!userPermissions.includes(requiredPermission)) {
                return res.status(403).json({ 
                    message: `คุณไม่มีสิทธิ์ในการทำรายการนี้ (${requiredPermission})` 
                });
            }

            next();
        } catch (error) {
            console.error("Permission Check Error:", error);
            res.status(500).json({ message: "ระบบตรวจสอบสิทธิ์ขัดข้อง" });
        }
    };
};

module.exports = { authorize };