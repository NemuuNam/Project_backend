const prisma = require('../lib/prisma');
const { 
    subDays, startOfMonth, startOfYear, format, 
    eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth 
} = require('date-fns');

exports.getSalesReport = async (req, res) => {
    try {
        const { type } = req.query; // daily, monthly, yearly
        let startDate;
        let interval;

        // --- 1. กำหนดช่วงเวลา ---
        if (type === 'daily') {
            startDate = subDays(new Date(), 6); 
            interval = eachDayOfInterval({ start: startDate, end: new Date() });
        } else if (type === 'yearly') {
            startDate = startOfYear(subDays(new Date(), 365 * 2)); 
        } else {
            startDate = startOfMonth(startOfYear(new Date())); 
            interval = eachMonthOfInterval({ start: startDate, end: new Date() });
        }

        // --- 2. ดึงข้อมูล Orders ทั้งหมดในเดือน/ปีนั้น (เพื่อหา Status Summary) ---
        const allOrders = await prisma.orders.findMany({
            where: { created_at: { gte: startDate } },
            include: { 
                items: { 
                    include: { 
                        product: { include: { category: true, images: true } } 
                    } 
                } 
            }
        });

        // กรองเฉพาะออเดอร์ที่ "สำเร็จ" สำหรับการคำนวณรายได้
        const completedOrders = allOrders.filter(o => o.status === 'สำเร็จ');

        // --- 3. คำนวณสรุป Stat Cards ---
        const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
        const totalOrders = completedOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const totalUnits = completedOrders.reduce((sum, o) => 
            sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0), 0
        );

        // คำนวณอัตรายกเลิก
        const cancelledOrders = allOrders.filter(o => o.status === 'ยกเลิก').length;
        const cancelRate = allOrders.length > 0 ? Math.round((cancelledOrders / allOrders.length) * 100) : 0;

        // --- 4. สรุปสถานะออเดอร์ (Status Summary) ---
        const statusSummary = {
            completed: completedOrders.length,
            pending: allOrders.filter(o => o.status !== 'สำเร็จ' && o.status !== 'ยกเลิก').length,
            cancelled: cancelledOrders
        };

        // --- 5. ข้อมูลหมวดหมู่จริง (Category Data) ---
        const catMap = {};
        completedOrders.forEach(o => o.items.forEach(item => {
            const catName = item.product.category?.category_name || 'อื่นๆ';
            catMap[catName] = (catMap[catName] || 0) + (item.price_at_order * item.quantity);
        }));
        const categoryData = Object.keys(catMap).map(name => ({ name, value: catMap[name] }));

        // --- 6. อัตราลูกค้าเก่าซื้อซ้ำ (Loyalty) ---
        const customerOrders = await prisma.orders.groupBy({
            by: ['user_id'],
            where: { status: 'สำเร็จ' },
            _count: { order_id: true }
        });
        const returningCount = customerOrders.filter(c => c._count.order_id > 1).length;
        const totalCustomers = customerOrders.length;
        const returningCustomerRate = totalCustomers > 0 ? Math.round((returningCount / totalCustomers) * 100) : 0;

        const customerTypeData = [
            { name: 'ลูกค้าใหม่', value: 100 - returningCustomerRate },
            { name: 'ลูกค้าเก่าซื้อซ้ำ', value: returningCustomerRate }
        ];

        // --- 7. เตรียมข้อมูลกราฟ ---
        let chartData = [];
        if (type === 'yearly') {
            const yearlyMap = {};
            completedOrders.forEach(o => {
                const year = format(o.created_at, 'yyyy');
                yearlyMap[year] = (yearlyMap[year] || 0) + o.total_amount;
            });
            chartData = Object.keys(yearlyMap).map(yr => ({ label: yr, amount: yearlyMap[yr] }));
        } else {
            chartData = interval.map(date => {
                const amount = completedOrders
                    .filter(o => type === 'daily' ? isSameDay(o.created_at, date) : isSameMonth(o.created_at, date))
                    .reduce((sum, o) => sum + o.total_amount, 0);
                
                const orderCount = completedOrders
                    .filter(o => type === 'daily' ? isSameDay(o.created_at, date) : isSameMonth(o.created_at, date))
                    .length;

                return { 
                    label: format(date, type === 'daily' ? 'dd MMM' : 'MMM'), 
                    amount,
                    orderCount 
                };
            });
        }

        // --- 8. สินค้าขายดี ---
        const productMap = {};
        completedOrders.forEach(o => o.items.forEach(item => {
            const pId = item.product_id;
            if (!productMap[pId]) {
                productMap[pId] = { 
                    product_name: item.product.product_name, 
                    total_qty: 0, 
                    total_sales: 0, 
                    image: item.product.images.find(img => img.is_main)?.image_url || null
                };
            }
            productMap[pId].total_qty += item.quantity;
            productMap[pId].total_sales += item.price_at_order * item.quantity;
        }));

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.total_sales - a.total_sales)
            .slice(0, 5);

        res.json({ 
            success: true, 
            data: { 
                summary: { totalRevenue, totalOrders, avgOrderValue, totalUnits, cancelRate, returningCustomerRate }, 
                chartData, 
                topProducts,
                statusSummary,
                categoryData,
                customerTypeData
            } 
        });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};