const prisma = require('../lib/prisma');
const { createLog } = require('./systemLogController'); 
const supabase = require('../lib/supabase');

/**
 * 🛠️ Helper: ฟังก์ชันสร้าง Order ID รูปแบบ ORD-YYYYMMDD-000 (16 หลัก)
 */
const generateOrderId = async (tx) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // นับจำนวน Order วันนี้เพื่อรันเลขลำดับ
    const countToday = await tx.orders.count({
        where: { order_id: { startsWith: `ORD-${dateStr}` } }
    });

    const sequence = String(countToday + 1).padStart(3, '0');
    return `ORD-${dateStr}-${sequence}`; 
};

/**
 * 📦 1. สร้างคำสั่งซื้อใหม่ (สำหรับลูกค้า)
 * - รองรับ Vercel โดยใช้ Memory Buffer แทนการเขียนไฟล์ลง Disk
 */
exports.createOrder = async (req, res) => {
    try {
        // รับข้อมูลจาก FormData
        const { address_id, items } = JSON.parse(req.body.order_data);
        const slipFile = req.file; // ไฟล์ที่ได้จาก multer.memoryStorage()
        const userId = req.user.user_id || req.user.id; 

        if (!slipFile) {
            return res.status(400).json({ success: false, message: "กรุณาแนบสลิปโอนเงิน" });
        }

        // --- 1. อัปโหลดสลิปไปที่ Supabase Storage ---
        // ใช้ slipFile.buffer แทนการใช้ fs.readFileSync เพราะ Vercel เป็น Read-only filesystem
        const fileName = `slips/${userId}/${Date.now()}_slip.png`;
        const { error: uploadError } = await supabase.storage
            .from('payment-slips')
            .upload(fileName, slipFile.buffer, { 
                contentType: slipFile.mimetype,
                upsert: false 
            });

        if (uploadError) throw uploadError;

        // ดึง Public URL ของรูปภาพ
        const { data: { publicUrl } } = supabase.storage
            .from('payment-slips')
            .getPublicUrl(fileName);  

        // --- 2. เริ่ม Prisma Transaction ---
        const result = await prisma.$transaction(async (tx) => {
            // ดึงค่าขนส่งจาก Shop_Settings
            const settings = await tx.shop_Settings.findMany({
                where: { config_key: { in: ['delivery_fee', 'min_free_shipping'] } }
            });
            const config = settings.reduce((acc, s) => ({ ...acc, [s.config_key]: parseInt(s.config_value) }), {});

            const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            const shippingCost = subtotal >= config.min_free_shipping ? 0 : config.delivery_fee;
            const totalAmount = subtotal + shippingCost;

            const newOrderId = await generateOrderId(tx);

            // สร้างออเดอร์
            const order = await tx.orders.create({
                data: {
                    order_id: newOrderId,
                    user_id: userId,
                    address_id: address_id ? parseInt(address_id) : null,
                    total_amount: totalAmount,
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

            // บันทึกข้อมูลการชำระเงิน พร้อมเก็บ slip_url
            await tx.payments.create({
                data: {
                    order_id: order.order_id,
                    amount_paid: totalAmount,
                    slip_url: publicUrl,
                    is_verified: false
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

        // ส่งผลลัพธ์กลับ (ไม่ต้องใช้ fs.unlinkSync แล้ว)
        res.status(201).json({ success: true, data: result });

    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📋 2. ดึงรายการออเดอร์ทั้งหมด (สำหรับ Admin)
 */
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await prisma.orders.findMany({
            include: { 
                user: true, 
                items: { 
                    include: { 
                        product: { 
                            include: { images: true } // 🚩 เพิ่มบรรทัดนี้ เพื่อดึงรูปภาพสินค้าออกมาด้วย
                        } 
                    } 
                }, 
                payments: true,
                address: true,
                shippings: {
                    include: { provider: true },
                    orderBy: { shipping_id: 'desc' },
                    take: 1
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: orders });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
/**
 * ✅ 3. ยืนยันชำระเงิน (Admin)
 */
exports.verifyPayment = async (req, res) => {
    const { order_id, payment_id } = req.body;
    const adminId = req.user.user_id || req.user.id;
    try {
        await prisma.$transaction([
            prisma.payments.update({ 
                where: { payment_id: payment_id }, 
                data: { is_verified: true } 
            }),
            prisma.orders.update({ 
                where: { order_id: order_id }, 
                data: { status: 'กำลังดำเนินการ' } 
            })
        ]);
        await createLog(adminId, `ยืนยันการชำระเงินออเดอร์ ${order_id}`);
        res.json({ success: true, message: "ยืนยันการชำระเงินสำเร็จ" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * 🔄 4. อัปเดตสถานะออเดอร์ทั่วไป + คืนสต็อกสินค้า (Admin)
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
            await tx.orders.update({
                where: { order_id: id },
                data: { status }
            });

            if (status === 'ยกเลิก' && order.status !== 'ยกเลิก') {
                for (const item of order.items) {
                    await tx.products.update({
                        where: { product_id: item.product_id },
                        data: { stock_quantity: { increment: item.quantity } }
                    });
                }
            }
        });

        await createLog(adminId, `เปลี่ยนสถานะออเดอร์ ${id} เป็น [${status}]`);
        res.json({ success: true, message: `อัปเดตสถานะเรียบร้อย` });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};



/**
 * 🚚 5. อัปเดตเลขพัสดุและบริษัทขนส่ง (D15)
 * - บันทึกลงตาราง Orders (เลขพัสดุ + สถานะ)
 * - สร้างข้อมูลในตาราง Shippings (D14)
 * - บันทึกลง System Log (D5) เพื่อเก็บประวัติการทำงานของเจ้าหน้าที่
 */
exports.updateTracking = async (req, res, next) => {
    const { id } = req.params;
    const { tracking_number, shipping_provider, status } = req.body; 
    // ดึง ID ของ Admin/Staff ที่ล็อกอินอยู่มาบันทึก Log
    const adminId = req.user?.user_id || req.user?.id;

    try {
        // 1. ค้นหา Provider จากชื่อที่เลือกมาจากหน้าจอ (Nim, Fuze)
        const provider = await prisma.shipping_Providers.findFirst({
            where: { provider_name: shipping_provider }
        });

        if (!provider) {
            return res.status(400).json({ success: false, message: "ไม่พบข้อมูลบริษัทขนส่งที่ระบุ" });
        }

        // 2. ใช้ Transaction เพื่ออัปเดตข้อมูลให้สัมพันธ์กันทั้งระบบ
        await prisma.$transaction([
            // อัปเดตตาราง Orders: บันทึกเลขพัสดุและเปลี่ยนสถานะ
            prisma.orders.update({
                where: { order_id: id.trim() },
                data: { 
                    tracking_number: tracking_number ? tracking_number.toString().slice(0, 20) : null, 
                    status: status || 'สำเร็จ' 
                }
            }),
            // บันทึกลงตาราง Shippings: เก็บประวัติการส่ง (shipping_id รันอัตโนมัติใน DB)
            prisma.shippings.create({
                data: {
                    order_id: id.trim(),
                    provider_id: provider.provider_id,
                    shipping_date: new Date()
                }
            })
        ]);

        // 3. บันทึกลง System Log (D5) ตามที่คุณต้องการ
        if (adminId && typeof createLog === 'function') {
            await createLog(adminId, `มีการเพิ่มเลขพัสดุ ${tracking_number} ขนส่งโดย ${shipping_provider} สำหรับออเดอร์ ${id}`);
        }
        
        res.json({ success: true, message: "บันทึกเลขพัสดุและประวัติการจัดส่งเรียบร้อยแล้ว" });

    } catch (error) { 
        // พ่น Error ออกที่หน้าจอ Console (Terminal) ของเครื่องคุณเพื่อการ Debug
        console.error('=============================================');
        console.error('❌ [DEBUG] Update Tracking & Log Failed!');
        console.error('Order ID:', id);
        console.error('Error:', error); 
        console.error('=============================================');

        next(error); 
    }
};

exports.getOrderDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await prisma.orders.findUnique({
            where: { order_id: id },
            include: { 
                user: true, 
                items: { 
                    include: { 
                        product: { 
                            include: { images: true } // 🚩 เพิ่มบรรทัดนี้เช่นกัน
                        } 
                    } 
                }, 
                payments: true,
                address: true,
                shippings: { include: { provider: true } }
            }
        });
        if (!order) return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });
        res.json({ success: true, data: order });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// --- 👤 7. ดูออเดอร์ของฉัน (Customer) ---
exports.getMyOrders = async (req, res) => {
    const userId = req.user.user_id || req.user.id;
    try {
        const orders = await prisma.orders.findMany({
            where: { user_id: userId },
            include: { 
                items: { 
                    include: { 
                        product: { 
                            include: { images: true } // 🚩 เพิ่มบรรทัดนี้เพื่อให้หน้าบ้านลูกค้าเห็นรูปด้วย
                        } 
                    } 
                },
                address: true,
                shippings: { include: { provider: true } }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: orders });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};


exports.getShippingProviders = async (req, res) => {
    try {
        const providers = await prisma.shipping_Providers.findMany({
            orderBy: { provider_id: 'asc' }
        });
        res.json({ success: true, data: providers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updatePaymentSlip = async (req, res) => { res.json({success: true}); };
exports.updateOrderAmount = async (req, res) => { res.json({success: true}); };
exports.cancelOrder = async (req, res) => { res.json({success: true}); };