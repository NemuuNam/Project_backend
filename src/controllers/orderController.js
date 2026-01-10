const prisma = require('../lib/prisma');
const { createLog } = require('./systemLogController');
const supabase = require('../lib/supabase');

/**
 * 🛠️ Helper: ฟังก์ชันสร้าง Order ID รูปแบบ ORD-YYYYMMDD-000
 */
const generateOrderId = async (tx) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // นับจำนวนออเดอร์ที่เกิดขึ้นในวันนี้เพื่อนำมาต่อท้าย sequence
    const countToday = await tx.orders.count({
        where: { order_id: { startsWith: `ORD-${dateStr}` } }
    });

    const sequence = String(countToday + 1).padStart(3, '0');
    return `ORD-${dateStr}-${sequence}`;
};

/**
 * 📦 1. สร้างคำสั่งซื้อใหม่ (สำหรับลูกค้า)
 */
exports.createOrder = async (req, res) => {
    try {
        // 1. ป้องกันการ Parse JSON ผิดพลาด
        let orderData;
        try {
            orderData = JSON.parse(req.body.order_data);
        } catch (e) {
            return res.status(400).json({ success: false, message: "รูปแบบข้อมูล order_data ไม่ถูกต้อง" });
        }

        const { address_id, items } = orderData;
        const slipFile = req.file;
        const userId = req.user.user_id || req.user.id;

        if (!slipFile) return res.status(400).json({ success: false, message: "กรุณาแนบสลิปโอนเงิน" });
        if (!items || items.length === 0) return res.status(400).json({ success: false, message: "ไม่มีสินค้าในรายการ" });

        // 2. อัปโหลดสลิปไปที่ Supabase
        const fileName = `slips/${userId}/${Date.now()}_slip.png`;
        const { error: uploadError } = await supabase.storage
            .from('payment-slips')
            .upload(fileName, slipFile.buffer, { contentType: slipFile.mimetype });

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('payment-slips').getPublicUrl(fileName);

        // 3. เริ่ม Database Transaction
        const result = await prisma.$transaction(async (tx) => {
            // ดึงค่าตั้งค่าร้านค้า (ค่าส่ง/เงื่อนไขส่งฟรี)
            const settings = await tx.shop_Settings.findMany({
                where: { config_key: { in: ['delivery_fee', 'min_free_shipping'] } }
            });
            const config = settings.reduce((acc, s) => ({ ...acc, [s.config_key]: parseInt(s.config_value) || 0 }), {});

            // คำนวณยอดเงินและจำนวนชิ้น
            const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            const totalQuantity = items.reduce((acc, i) => acc + i.quantity, 0);

            // เช็คเงื่อนไขส่งฟรีตามจำนวนชิ้น (Pieces)
            const shippingCost = totalQuantity >= config.min_free_shipping ? 0 : config.delivery_fee;
            const totalAmount = subtotal + shippingCost;
            
            const newOrderId = await generateOrderId(tx);

            // สร้าง Record ใน Table Orders
            const order = await tx.orders.create({
                data: {
                    order_id: newOrderId,
                    user_id: userId,
                    address_id: address_id ? parseInt(address_id) : null,
                    total_amount: totalAmount,
                    shipping_cost: shippingCost,
                    status: 'รอตรวจสอบชำระเงิน',
                    items: {
                        create: items.map(item => ({
                            product_id: item.product_id,
                            quantity: item.quantity,
                            price_at_order: item.price
                        }))
                    }
                }
            });

            // สร้าง Record ใน Table Payments
            await tx.payments.create({
                data: {
                    order_id: order.order_id,
                    amount_paid: totalAmount,
                    slip_url: publicUrl,
                    is_verified: false,
                    payment_date: new Date()
                }
            });

            // ตัดสต็อกสินค้า
            for (const item of items) {
                await tx.products.update({
                    where: { product_id: item.product_id },
                    data: { stock_quantity: { decrement: item.quantity } }
                });
            }
            return order;
        });

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📋 2. ดึงรายการออเดอร์ทั้งหมด (Admin)
 */
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await prisma.orders.findMany({
            include: {
                user: true,
                items: { include: { product: { include: { images: true } } } },
                payments: true,
                address: true,
                shippings: { include: { provider: true }, orderBy: { shipping_id: 'desc' }, take: 1 }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: orders });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};

/**
 * ✅ 3. ยืนยันชำระเงิน (Admin)
 */
exports.verifyPayment = async (req, res) => {
    const { order_id, payment_id } = req.body;
    const adminId = req.user.user_id || req.user.id;
    try {
        await prisma.$transaction([
            prisma.payments.update({ where: { payment_id: payment_id }, data: { is_verified: true } }),
            prisma.orders.update({ where: { order_id: order_id }, data: { status: 'กำลังดำเนินการ' } })
        ]);
        if (adminId) await createLog(adminId, `ยืนยันการชำระเงินออเดอร์ ${order_id}`);
        res.json({ success: true, message: "ยืนยันการชำระเงินสำเร็จ" });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};

/**
 * 🔄 4. อัปเดตสถานะออเดอร์ทั่วไป (Admin)
 */
exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.user_id || req.user.id;

    try {
        const order = await prisma.orders.findUnique({
            where: { order_id: id },
            include: { items: true }
        });

        if (!order) return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อ" });

        await prisma.$transaction(async (tx) => {
            await tx.orders.update({ where: { order_id: id }, data: { status } });
            
            // กรณีมีการยกเลิก ต้องคืนสต็อกสินค้า
            if (status === 'ยกเลิก' && order.status !== 'ยกเลิก') {
                for (const item of order.items) {
                    await tx.products.update({
                        where: { product_id: item.product_id },
                        data: { stock_quantity: { increment: item.quantity } }
                    });
                }
            }
        });

        if (adminId) await createLog(adminId, `เปลี่ยนสถานะออเดอร์ ${id} เป็น [${status}]`);
        res.json({ success: true, message: `อัปเดตสถานะเรียบร้อย` });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};

/**
 * 🚚 5. อัปเดตเลขพัสดุ และ ขนส่ง
 */
exports.updateTracking = async (req, res, next) => {
    const { id } = req.params;
    const { tracking_number, provider_id, status, provider_name } = req.body;
    const adminId = req.user?.user_id || req.user?.id;

    // Validation ป้องกันค่าว่าง
    if (!tracking_number) return res.status(400).json({ success: false, message: "กรุณาระบุเลขพัสดุ" });
    if (!provider_id) return res.status(400).json({ success: false, message: "กรุณาเลือกบริษัทขนส่ง" });

    try {
        await prisma.$transaction([
            prisma.orders.update({
                where: { order_id: id },
                data: { 
                    tracking_number: tracking_number, 
                    status: status || 'กำลังจัดส่ง' 
                }
            }),
            prisma.shippings.create({
                data: {
                    order_id: id,
                    provider_id: parseInt(provider_id),
                    shipping_date: new Date()
                }
            })
        ]);

        if (adminId) {
            const logDetail = `เพิ่มเลขพัสดุ ${tracking_number} ขนส่งโดย ${provider_name || 'ID: ' + provider_id} ออเดอร์ ${id}`;
            await createLog(adminId, logDetail);
        }

        res.json({ success: true, message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (error) {
        console.error("Update Tracking Error:", error);
        next(error);
    }
};

/**
 * 📸 6. ลูกค้าส่งสลิปใหม่ (กรณีโดนสั่งแก้ไข)
 */
exports.updatePaymentSlip = async (req, res) => {
    const { id } = req.params;
    const slipFile = req.file;
    const userId = req.user?.user_id || req.user?.id;

    if (!slipFile) return res.status(400).json({ success: false, message: "ไม่พบไฟล์สลิป" });

    try {
        const order = await prisma.orders.findUnique({
            where: { order_id: id },
            include: { payments: true }
        });

        if (!order) return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อ" });

        const fileName = `reslips/${userId}/${id}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
            .from('payment-slips')
            .upload(fileName, slipFile.buffer, { contentType: slipFile.mimetype, upsert: true });

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('payment-slips').getPublicUrl(fileName);

        await prisma.$transaction(async (tx) => {
            if (order.payments && order.payments.length > 0) {
                await tx.payments.update({
                    where: { payment_id: order.payments[0].payment_id },
                    data: { slip_url: publicUrl, is_verified: false }
                });
            } else {
                await tx.payments.create({
                    data: {
                        order_id: id,
                        amount_paid: order.total_amount,
                        slip_url: publicUrl,
                        is_verified: false,
                        payment_date: new Date()
                    }
                });
            }

            await tx.orders.update({
                where: { order_id: id },
                data: { status: 'รอตรวจสอบชำระเงิน' }
            });
        });

        res.json({ success: true, message: "อัปโหลดสลิปสำเร็จ" });
    } catch (error) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด: " + error.message });
    }
};

/**
 * ❌ 7. ยกเลิกออเดอร์ (กรณีลูกค้าทำเอง หรือยกเลิกทั่วไป)
 */
exports.cancelOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await prisma.orders.findUnique({
            where: { order_id: id },
            include: { items: true }
        });

        if (!order) return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อ" });

        await prisma.$transaction(async (tx) => {
            // คืนสต็อก
            for (const item of order.items) {
                await tx.products.update({
                    where: { product_id: item.product_id },
                    data: { stock_quantity: { increment: item.quantity } }
                });
            }
            await tx.orders.update({
                where: { order_id: id },
                data: { status: 'ยกเลิก' }
            });
        });

        res.json({ success: true, message: "ยกเลิกออเดอร์เรียบร้อย" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📝 8. ปฏิเสธสลิป (Admin)
 */
exports.rejectPaymentSlip = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.user_id || req.user?.id;

    if (!reason) return res.status(400).json({ success: false, message: "กรุณาระบุเหตุผลที่ปฏิเสธสลิป" });

    try {
        await prisma.orders.update({
            where: { order_id: id },
            data: {
                status: 'รอแก้ไขสลิป',
                rejection_reason: reason
            }
        });

        if (adminId) await createLog(adminId, `ปฏิเสธสลิปออเดอร์ ${id} เนื่องจาก: ${reason}`);
        res.json({ success: true, message: "แจ้งแก้ไขเรียบร้อย" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🔍 9. ดึงรายละเอียดออเดอร์เดียว
 */
exports.getOrderDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await prisma.orders.findUnique({
            where: { order_id: id },
            include: {
                user: true,
                items: { include: { product: { include: { images: true } } } },
                payments: true, 
                address: true, 
                shippings: { include: { provider: true } }
            }
        });
        if (!order) return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });
        res.json({ success: true, data: order });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};

/**
 * 👤 10. ดึงออเดอร์ของฉัน (ลูกค้า)
 */
exports.getMyOrders = async (req, res) => {
    const userId = req.user.user_id || req.user.id;
    try {
        const orders = await prisma.orders.findMany({
            where: { user_id: userId },
            include: {
                items: { include: { product: { include: { images: true } } } },
                address: true,
                shippings: { include: { provider: true } },
                payments: true
            },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: orders });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};

/**
 * 🚚 11. ดึงบริษัทขนส่งทั้งหมด
 */
exports.getShippingProviders = async (req, res) => {
    try {
        const providers = await prisma.shipping_Providers.findMany({
            orderBy: { provider_id: 'asc' }
        });

        res.json({ success: true, data: providers });
    } catch (error) {
        console.error("GET Providers Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};