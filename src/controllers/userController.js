const prisma = require('../lib/prisma');
const { createLog } = require('./systemLogController'); 

/**
 * 1. ดึงข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน
 */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const user = await prisma.users.findUnique({
            where: { user_id: userId },
            include: { role: true }
        });

        if (!user) return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้" });

        res.json({
            success: true,
            data: {
                user_id: user.user_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role_name: user.role?.role_name || "ผู้ใช้งาน",
                role_level: user.role?.role_level || 4 
            }
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 2. ดึงรายการผู้ใช้ทั้งหมด
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            include: { role: true },
            orderBy: { first_name: 'asc' }      
        });
        
        const summary = {
            total: users.length,
            admins: users.filter(u => u.role?.role_level === 1).length,
            staff: users.filter(u => u.role?.role_level === 2 || u.role?.role_level === 3).length,
            customers: users.filter(u => u.role?.role_level === 4).length
        };

        res.json({ success: true, data: users, summary: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้" });
    }
};

// --- ส่วนการแก้ไขสิทธิ์ ---
exports.updateUserRole = async (req, res) => {
    const { id } = req.params; 
    const { role_id } = req.body;
    try {
        const [targetUser, newRoleInfo] = await Promise.all([
            prisma.users.findUnique({ where: { user_id: id }, include: { role: true } }),
            prisma.roles.findUnique({ where: { role_id: parseInt(role_id) }, select: { role_name: true } })
        ]);

        if (!targetUser || !newRoleInfo) return res.status(404).json({ message: "ไม่พบข้อมูล" });

        const oldRole = targetUser.role?.role_name || "N/A";
        const targetFullName = `${targetUser.first_name} ${targetUser.last_name || ''}`.trim();

        await prisma.users.update({
            where: { user_id: id }, 
            data: { role_id: parseInt(role_id) }
        });

        const adminId = req.user.user_id || req.user.id; 
        if (adminId) {
            // Format สำหรับ Audit: กิจกรรม: ชื่อเป้าหมาย (จาก -> ไป)
            const auditMessage = `แก้ไขสิทธิ์: ${targetFullName} (${oldRole} ➔ ${newRoleInfo.role_name})`;
            await createLog(adminId, auditMessage.substring(0, 255));
        }
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, message: "อัปเดตสิทธิ์ล้มเหลว" });
    }
};

// --- ส่วนการลบผู้ใช้ ---
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.users.findUnique({ 
            where: { user_id: id }, 
            select: { first_name: true, last_name: true, email: true } 
        });

        if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

        const targetFullName = `${user.first_name} ${user.last_name || ''}`.trim();

        await prisma.users.delete({ where: { user_id: id } });
        
        const adminId = req.user.user_id || req.user.id; 
        if (adminId) {
            // Format สำหรับ Audit: กิจกรรม: ชื่อเป้าหมาย (Email)
            const auditMessage = `ลบผู้ใช้งาน: ${targetFullName} (Email: ${user.email})`;
            await createLog(adminId, auditMessage.substring(0, 255));
        }
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, message: "ไม่สามารถลบผู้ใช้ได้" });
    }
};