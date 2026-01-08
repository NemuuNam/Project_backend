const prisma = require('../lib/prisma');

// 1. ดึงรายการที่อยู่ทั้งหมดเฉพาะของ User ที่ล็อกอินอยู่
exports.getUserAddresses = async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const addresses = await prisma.addresses.findMany({
            where: { user_id: userId },
            orderBy: { address_id: 'desc' }
        });
        res.json({ success: true, data: addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. บันทึกที่อยู่ใหม่ (Create)
// src/controllers/addressesController.js

exports.createAddress = async (req, res) => {
    const { recipient_name, phone_number, address_detail } = req.body;

    try {
        // 1. ✨ ตรวจสอบ user_id จาก req.user (ที่ได้มาจาก authMiddleware)
        // ลองเช็คทั้งสองแบบ เพราะบางครั้งเราตั้งชื่อฟิลด์ใน Token ต่างกัน
        const userId = req.user?.user_id || req.user?.id;

        // 2. 🛡️ ป้องกันกรณี userId ไม่มีค่า (เช่น Token ผิดพลาด หรือลืมใส่ Middleware)
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่" 
            });
        }

        const cleanedPhone = phone_number.replace(/\D/g, '');

        // 3. ✨ ส่งค่าเข้าไปบันทึก
        const newAddress = await prisma.addresses.create({
            data: {
                recipient_name: recipient_name.trim(),
                phone_number: cleanedPhone,
                address_detail: address_detail.trim(),
                user_id: userId // มั่นใจว่าตรงนี้ไม่เป็น undefined แล้ว
            }
        });

        res.status(201).json({ success: true, data: newAddress });

    } catch (error) {
        console.error("Create Address Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกที่อยู่" });
    }
};

// 3. แก้ไขข้อมูลที่อยู่ (Update)
exports.updateAddress = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id || req.user.id;
    const { recipient_name, phone_number, address_detail } = req.body;

    try {
        const updatedAddress = await prisma.addresses.update({
            where: { 
                address_id: parseInt(id),
                user_id: userId 
            },
            data: { 
                recipient_name, 
                phone_number, 
                address_detail 
            }
        });

        res.json({ success: true, data: updatedAddress });
    } catch (error) {
        console.error("Update Address Error:", error);
        res.status(400).json({ success: false, message: "แก้ไขที่อยู่ล้มเหลว" });
    }
};

// 4. ลบข้อมูลที่อยู่ (Delete)
exports.deleteAddress = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id || req.user.id;

    try {
        await prisma.addresses.delete({
            where: { 
                address_id: parseInt(id),
                user_id: userId 
            }
        });

        res.json({ success: true, message: "ลบที่อยู่สำเร็จ" });
    } catch (error) {
        res.status(400).json({ success: false, message: "ไม่สามารถลบที่อยู่ได้" });
    }
};