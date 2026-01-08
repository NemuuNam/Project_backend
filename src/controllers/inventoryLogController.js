const prisma = require('../lib/prisma');
// นำเข้า createLog จาก Controller ที่ดูแล System Logs โดยตรง
const { createLog } = require('./systemLogController'); 

/** 1. ดึงรายการ Log และลบส่วนที่เกิน 100 รายการ (Auto-Cleanup) */
exports.getInventoryLogs = async (req, res) => {
    try {
        const logCount = await prisma.inventory_Logs.count();

        if (logCount > 100) {
            const thresholdLogs = await prisma.inventory_Logs.findMany({
                orderBy: { created_at: 'desc' }, // เปลี่ยนเป็นเรียงตามเวลา
                skip: 99,
                take: 1
            });

            if (thresholdLogs.length > 0) {
                const thresholdDate = thresholdLogs[0].created_at;
                await prisma.inventory_Logs.deleteMany({
                    where: { created_at: { lt: thresholdDate } } // ลบรายการที่เก่ากว่าวันที่กำหนด
                });
            }
        }

        const logs = await prisma.inventory_Logs.findMany({
            include: {
                product: { select: { product_name: true } },
                user: { select: { first_name: true, last_name: true } }
            },
            orderBy: { created_at: 'desc' }, 
            take: 100 
        });

        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลประวัติได้" });
    }
};

/** 2. บันทึก Log ใหม่ (จากกิจกรรมใน Product Controller) */
exports.createInventoryLog = async (userId, productId, changeQty, reason) => {
    try {
        await prisma.inventory_Logs.create({
            data: {
                user_id: userId,
                product_id: productId,
                change_qty: parseInt(changeQty) || 0,
                reason: reason
            }
        });
    } catch (error) {
        console.error("D9 Log Error:", error.message);
    }
};

/** ล้างประวัติสต็อกสินค้า และบันทึกหลักฐานลง System Log */
exports.clearAllInventoryLogs = async (req, res) => {
    const adminId = req.user?.user_id || req.user?.id;
    
    try {
        const admin = await prisma.users.findUnique({
            where: { user_id: adminId },
            select: { first_name: true, last_name: true }
        });

        const adminName = `${admin.first_name} ${admin.last_name || ''}`.trim();

        await prisma.$transaction(async (tx) => {
            // 1. ลบข้อมูลใน Inventory_Logs (D9) ทั้งหมด
            await tx.inventory_Logs.deleteMany({});

            // 2. บันทึก "หลักฐานการลบ" ลงใน System_Logs (D5)
            await createLog(adminId, `ล้างประวัติสต็อกสินค้า: ดำเนินการโดย ${adminName} (Wiped all inventory logs)`);
        });

        res.json({ success: true, message: "ล้างประวัติสต็อกสินค้าเรียบร้อยแล้ว" });
    } catch (error) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
    }
};