const prisma = require('../lib/prisma');

// 1. บันทึกรีวิวใหม่
exports.createReview = async (req, res) => {
    try {
        const { product_id, rating_score, comment } = req.body;
        const user_id = req.user.id; // ดึงจาก Token

        // ✅ Software Dev Logic: ตรวจสอบว่าเคยซื้อสินค้านี้และออเดอร์ "สำเร็จ" หรือยัง
        const hasPurchased = await prisma.orders.findFirst({
            where: {
                user_id: user_id,
                status: 'สำเร็จ',
                items: {
                    some: { product_id: product_id }
                }
            }
        });

        if (!hasPurchased) {
            return res.status(403).json({ 
                success: false, 
                message: "คุณสามารถรีวิวได้เฉพาะสินค้าที่สั่งซื้อสำเร็จแล้วเท่านั้น" 
            });
        }

        // บันทึกลงตาราง Product_Reviews
        const review = await prisma.product_Reviews.create({
            data: {
                product_id,
                user_id,
                rating_score: parseInt(rating_score),
                comment
            }
        });

        res.status(201).json({ success: true, data: review, message: "ขอบคุณสำหรับรีวิวครับ" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 2. ดึงรีวิวของสินค้าตัวนั้นๆ (ใช้แสดงในหน้า Product Detail)
exports.getProductReviews = async (req, res) => {
    try {
        const { id } = req.params; // product_id
        const reviews = await prisma.product_Reviews.findMany({
            where: { product_id: id },
            include: {
                user: {
                    select: { first_name: true } // ดึงเฉพาะชื่อมาโชว์เพื่อความเป็นส่วนตัว
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.status(200).json({ success: true, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching reviews" });
    }
};

/** ✅ ดึงรีวิวทั้งหมดแบบสุ่ม (สำหรับหน้า Home) */
exports.getRandomReviews = async (req, res) => {
    try {
        const reviews = await prisma.product_Reviews.findMany({
            // ดึงมา 10 รายการล่าสุดเพื่อความรวดเร็ว แล้วค่อยไปสุ่มที่หน้าบ้าน
            take: 10, 
            include: {
                user: {
                    select: { first_name: true, last_name: true }
                },
                product: {
                    select: { product_name: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error("Get Random Reviews Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};