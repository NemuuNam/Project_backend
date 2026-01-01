const prisma = require('../lib/prisma');
// ตรวจสอบว่าได้รัน npm install date-fns หรือยัง
const { subDays, format } = require('date-fns');

exports.getSalesReport = async (req, res) => {
    try {
        const { range } = req.query;
        let startDate = subDays(new Date(), 30); // เริ่มต้นย้อนหลัง 30 วัน

        if (range === '7') startDate = subDays(new Date(), 7);
        else if (range === 'all') startDate = new Date(0);

        // 1. ดึงข้อมูลออเดอร์ (ปรับสถานะให้ตรงกับหน้า UI ของคุณ)
        const orders = await prisma.orders.findMany({
            where: {
                // กรองเฉพาะออเดอร์ที่สถานะคือ "สำเร็จ" ตามรูปหน้าจัดการออเดอร์
                status: 'สำเร็จ', 
            },
            include: {
                items: { // ใช้ชื่อฟิลด์ relation ตาม Schema D12
                    include: { 
                        product: { include: { category: true } } 
                    }
                }
            },
            orderBy: { order_id: 'desc' }
        });

        // 2. คำนวณสรุปยอด (ใช้ total_amount จาก Schema D12)
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // 3. เตรียมข้อมูลกราฟ (Mock วันที่เพื่อให้เห็นผลลัพธ์ทันที)
        // หมายเหตุ: เนื่องจาก Schema Orders ของคุณไม่มีฟิลด์วันที่สร้าง 
        // แนะนำให้เพิ่ม created_at DateTime @default(now()) ในภายหลัง
        const chartData = [
            { date: format(new Date(), 'dd/MM'), amount: totalRevenue }
        ];

        // 4. จัดอันดับสินค้าขายดี (ดึงจาก Items ใน Orders)
        const productMap = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const pId = item.product_id;
                if (!productMap[pId]) {
                    productMap[pId] = {
                        product_name: item.product.product_name,
                        category: item.product.category?.category_name || 'ทั่วไป',
                        total_sales: 0,
                        total_qty: 0
                    };
                }
                productMap[pId].total_sales += Number(item.price_at_order) * item.quantity;
                productMap[pId].total_qty += item.quantity;
            });
        });

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.total_sales - a.total_sales)
            .slice(0, 5);

        // ส่งข้อมูลกลับไปยัง Frontend
        res.json({
            success: true,
            data: {
                summary: { totalRevenue, totalOrders, avgOrderValue },
                chartData,
                topProducts
            }
        });
    } catch (error) {
        console.error("SalesReport Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};