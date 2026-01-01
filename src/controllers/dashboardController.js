const prisma = require('../lib/prisma');

/**
 * ดึงข้อมูลสถิติและภาพรวมสำหรับหน้า Dashboard Admin
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // 1. ดึงข้อมูลสถิติพื้นฐานพร้อมกันด้วย $transaction
        const [salesAgg, orderCount, stockAgg, customerCount] = await prisma.$transaction([
            // ยอดขายรวม (สำเร็จแล้ว)
            prisma.orders.aggregate({
                _sum: { total_amount: true },
                where: { status: 'สำเร็จ' }
            }),
            // จำนวนออเดอร์ทั้งหมด
            prisma.orders.count(),
            // รวมจำนวนสินค้าในคลัง
            prisma.products.aggregate({
                _sum: { stock_quantity: true }
            }),
            // จำนวนลูกค้า (role_id: 4)
            prisma.users.count({
                where: { role_id: 4 }
            })
        ]);

        // 2. ดึงรายการคำสั่งซื้อล่าสุด 7 รายการ (เพิ่มเป็น 7 เพื่อความสวยงามของตาราง)
        const recentOrdersRaw = await prisma.orders.findMany({
            take: 7,
            orderBy: { order_id: 'desc' },
            include: {
                user: {
                    select: { first_name: true, last_name: true }
                }
            }
        });

        // 3. ดึงสินค้าขายดี 5 อันดับ (คำนวณจากจำนวนชิ้นที่ขายได้ใน Order_Items)
        const topSellingItems = await prisma.order_Items.groupBy({
            by: ['product_id'],
            _sum: { quantity: true },
            orderBy: {
                _sum: { quantity: 'desc' }
            },
            take: 5
        });

        // ดึงรายละเอียดชื่อและรูปภาพของสินค้าขายดีเหล่านั้น
        const topProducts = await Promise.all(
            topSellingItems.map(async (item) => {
                const details = await prisma.products.findUnique({
                    where: { product_id: item.product_id },
                    include: {
                        images: { where: { is_main: true }, take: 1 }
                    }
                });
                return {
                    product_id: item.product_id,
                    name: details?.product_name || 'ไม่พบชื่อสินค้า',
                    price: details?.unit_price || 0,
                    total_sold: item._sum.quantity, // จำนวนที่ขายได้จริง
                    image: details?.images[0]?.image_url || null
                };
            })
        );

        // 4. ส่งข้อมูลกลับไปยัง Frontend
        res.json({
            success: true,
            data: {
                totalSales: salesAgg._sum.total_amount || 0,
                orderCount: orderCount || 0,
                totalStock: stockAgg._sum.stock_quantity || 0,
                customerCount: customerCount || 0,
                
                // แปลงข้อมูล Order ให้ Frontend ใช้ง่าย
                recentOrders: recentOrdersRaw.map(order => ({
                    order_id: order.order_id,
                    customer_name: order.user 
                        ? `${order.user.first_name} ${order.user.last_name}` 
                        : 'ลูกค้าทั่วไป',
                    total: order.total_amount,
                    status: order.status,
                    //จัดรูปแบบวันที่
                    date: new Date().toLocaleDateString('th-TH') 
                })),

                topProducts: topProducts
            }
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลสรุปผล" 
        });
    }
};