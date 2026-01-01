const prisma = require('../lib/prisma');

// ดึงรายการที่อยู่ทั้งหมดเฉพาะของ User ที่ล็อกอินอยู่
exports.getUserAddresses = async (req, res) => {
    // เช็กข้อมูล User จาก Middleware protect
    console.log("🔍 [Backend] req.user data:", req.user); 

    try {
        const userId = req.user.user_id || req.user.id;
        const addresses = await prisma.addresses.findMany({
            where: { user_id: userId }, // ดึงเฉพาะของ user_id นี้เท่านั้น
            orderBy: { address_id: 'desc' }
        });
        
        console.log(`✅ [Backend] Found ${addresses.length} addresses for User: ${userId}`);
        res.json({ success: true, data: addresses });
    } catch (error) {
        console.error("❌ [Backend] Database Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// บันทึกที่อยู่ใหม่ลงตาราง Addresses
exports.createAddress = async (req, res) => {
    const userId = req.user.user_id || req.user.id;
    const { recipient_name, phone_number, address_detail } = req.body;
    
    console.log("📝 [Backend] Attempting to save address for user:", userId);

    try {
        const newAddress = await prisma.addresses.create({
            data: {
                user_id: userId,
                recipient_name,
                phone_number,
                address_detail
            }
        });
        console.log("✅ [Backend] New address saved ID:", newAddress.address_id);
        res.status(201).json({ success: true, data: newAddress });
    } catch (error) {
        console.error("❌ [Backend] Create Address Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};