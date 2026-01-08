const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. ดึงรายการสินค้าที่ชอบทั้งหมดของ User คนนี้
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user.id; // ตรวจสอบว่า middleware auth ส่ง id มาเป็น String

        const wishlist = await prisma.wishlists.findMany({ // ใช้ชื่อ model ให้ตรงกับ Schema (Wishlists)
            where: { 
                user_id: userId 
            },
            include: {
                product: {
                    // หากใน model Products ของคุณไม่มี relation 'images' ให้ลบบรรทัดนี้ออก
                    include: { 
                        // ตรวจสอบชื่อ relation ใน model Products ให้ดีว่าชื่อ 'images' หรือไม่
                        images: true 
                    }
                }
            }
        });

        res.status(200).json({ success: true, data: wishlist });
    } catch (error) {
        // สำคัญมาก: พิมพ์ Error ออกมาดูที่หน้าจอ Terminal ของ VS Code เพื่อดูสาเหตุที่แท้จริง
        console.error("Prisma Error Details:", error); 
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error", 
            error: error.message 
        });
    }
};

// 2. สลับสถานะ (Add/Remove)
exports.toggleWishlist = async (req, res) => {
    try {
        const userId = req.user.id; // ดึงจาก Token (เป็น String)
        const { product_id } = req.body; // รับมาเป็น String

        // 1. ตรวจสอบว่าเคยไลก์ไว้หรือยัง
        const existing = await prisma.wishlists.findFirst({
            where: { 
                user_id: userId, 
                product_id: product_id 
            }
        });

        if (existing) {
            // 2. ถ้ามีแล้ว -> ลบออก
            await prisma.wishlists.delete({
                where: { wishlist_id: existing.wishlist_id }
            });
            return res.status(200).json({ success: true, message: "Removed from wishlist" });
        } else {
            // 3. ถ้ายังไม่มี -> เพิ่มเข้า
            const newItem = await prisma.wishlists.create({
                data: { 
                    user_id: userId, 
                    product_id: product_id 
                }
            });
            return res.status(201).json({ success: true, data: newItem, message: "Added to wishlist" });
        }
    } catch (error) {
        console.error("Wishlist Error:", error);
        res.status(500).json({ success: false, message: "Error toggling wishlist" });
    }
};