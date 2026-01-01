const prisma = require('../lib/prisma');

/**
 * 1. ฟังก์ชันบันทึกกิจกรรม (Internal Utility)
 * บันทึกกิจกรรมสำคัญลงฐานข้อมูล โดยมีการควบคุมความยาวสตริงไม่ให้เกิน VarChar(255)
 */
exports.createLog = async (userId, actionDetails) => {
    try {
        if (!userId) return;

        // ป้องกัน Error จากฐานข้อมูลกรณีข้อมูลยาวเกิน 255 ตัวอักษร (ตาม Schema)
        // หากยาวเกินจะตัดให้เหลือ 252 แล้วเติม ... ต่อท้าย
        const safeDetails = actionDetails && actionDetails.length > 255 
            ? actionDetails.substring(0, 252) + "..." 
            : actionDetails;

        await prisma.system_Logs.create({
            data: {
                user_id: userId,
                action_details: safeDetails
            }
        });
    } catch (error) {
        console.error("Create Log Error:", error.message);
        // หมายเหตุ: ไม่ทำการ throw error เพื่อให้ฟังก์ชันหลัก (เช่น การเปลี่ยนสิทธิ์) ทำงานต่อไปได้
    }
};

/**
 * 2. [GET] ดึงรายการประวัติกิจกรรม
 * มาพร้อมระบบ Data Retention (ลบข้อมูลที่เก่ากว่า 7 วันอัตโนมัติ)
 */
exports.getSystemLogs = async (req, res) => {
    try {
        // --- ส่วนที่ 1: ลบข้อมูลที่เก่ากว่า 7 วัน (Automatic Cleanup) ---
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        await prisma.system_Logs.deleteMany({
            where: {
                created_at: { lt: sevenDaysAgo }
            }
        });

        // --- ส่วนที่ 2: ดึงข้อมูล Log พร้อมข้อมูล Admin (Executor) ---
        const logs = await prisma.system_Logs.findMany({
            include: {
                user: { 
                    select: { 
                        first_name: true, 
                        last_name: true 
                    } 
                }
            },
            orderBy: { created_at: 'desc' }
        });

        // --- ส่วนที่ 3: ปรับ Format ข้อมูลเพื่อให้ Audit และแสดงผลที่ Frontend ได้ง่าย ---
        const formattedLogs = logs.map(log => ({
            ...log,
            // รวมชื่อ-นามสกุล Admin ให้พร้อมใช้งาน
            admin_full_name: `${log.user?.first_name} ${log.user?.last_name || ''}`.trim(),
            // แมปชื่อ Action ให้ตรงกับที่ Frontend รอรับ
            action: log.action_details,
            details: "" 
        }));

        res.json({ success: true, data: formattedLogs });
    } catch (error) {
        console.error("Get Logs Error:", error.message);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล Log" });
    }
};

exports.clearAllLogs = async (req, res) => {
    // 1. ดึง ID ของ Admin จาก Token (Middleware 'protect' ส่งมาให้)
    const adminId = req.user.user_id || req.user.id; 

    try {
        // 2. ดึงชื่อ Admin เพื่อบันทึกประวัติก่อนลบ (Audit Requirement)
        const admin = await prisma.users.findUnique({
            where: { user_id: adminId },
            select: { first_name: true, last_name: true }
        });
        const adminName = `${admin.first_name} ${admin.last_name || ''}`.trim();

        // 3. ลบข้อมูลทั้งหมดออกจากตาราง System_Logs
        await prisma.system_Logs.deleteMany({}); 

        // 4. บันทึกกิจกรรมใหม่: ระบุชัดเจนว่าใครเป็นคนล้างประวัติ
        // ข้อมูลนี้จะเหลือเป็นรายการเดียวในตาราง ให้คน Audit เห็นทันที
        await exports.createLog(adminId, `ล้างประวัติกิจกรรม: ดำเนินการโดย ${adminName} (Wiped all system logs)`);

        res.json({ 
            success: true, 
            message: "ล้างประวัติกิจกรรมทั้งหมดเรียบร้อยแล้ว" 
        });
    } catch (error) {
        console.error("Clear Logs Error:", error.message);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการล้างข้อมูล" });
    }
};