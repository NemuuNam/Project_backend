const prisma = require('../lib/prisma');
const { subDays, startOfMonth, startOfYear, format, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth } = require('date-fns');

exports.getSalesReport = async (req, res) => {
    try {
        const { type } = req.query; // daily, monthly, yearly
        let startDate;
        let interval;

        // กำหนดช่วงเวลา (Interval) เพื่อสร้างจุดบนกราฟให้ครบ
        if (type === 'daily') {
            startDate = subDays(new Date(), 6); // 7 วันล่าสุด
            interval = eachDayOfInterval({ start: startDate, end: new Date() });
        } else if (type === 'yearly') {
            startDate = startOfYear(subDays(new Date(), 365 * 2)); // 3 ปีล่าสุด
        } else {
            startDate = startOfMonth(startOfYear(new Date())); // รายเดือนของปีนี้
            interval = eachMonthOfInterval({ start: startDate, end: new Date() });
        }

        // 1. ดึงเฉพาะออเดอร์ที่ "สำเร็จ"
        const orders = await prisma.orders.findMany({
            where: { status: 'สำเร็จ', created_at: { gte: startDate } },
            include: { items: { include: { product: { include: { images: true } } } } }
        });

        // 2. คำนวณสรุป Stat Cards
        const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // 3. เตรียมข้อมูลกราฟ (สร้างให้มีหลายจุดเพื่อให้เส้นกราฟขึ้น)
        let chartData = [];
        if (type === 'yearly') {
            const yearlyMap = {};
            orders.forEach(o => {
                const year = format(o.created_at, 'yyyy');
                yearlyMap[year] = (yearlyMap[year] || 0) + o.total_amount;
            });
            chartData = Object.keys(yearlyMap).map(yr => ({ label: yr, amount: yearlyMap[yr] }));
        } else {
            chartData = interval.map(date => {
                const amount = orders
                    .filter(o => type === 'daily' ? isSameDay(o.created_at, date) : isSameMonth(o.created_at, date))
                    .reduce((sum, o) => sum + o.total_amount, 0);
                return { label: format(date, type === 'daily' ? 'dd MMM' : 'MMM'), amount };
            });
        }

        // 4. สินค้าขายดี + รูปภาพ
        const productMap = {};
        orders.forEach(o => o.items.forEach(item => {
            const pId = item.product_id;
            if (!productMap[pId]) {
                productMap[pId] = { product_name: item.product.product_name, total_qty: 0, total_sales: 0, product: item.product };
            }
            productMap[pId].total_qty += item.quantity;
            productMap[pId].total_sales += item.price_at_order * item.quantity;
        }));

        const topProducts = Object.values(productMap).sort((a, b) => b.total_sales - a.total_sales).slice(0, 5);

        res.json({ success: true, data: { summary: { totalRevenue, totalOrders, avgOrderValue }, chartData, topProducts } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};