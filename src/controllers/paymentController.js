const prisma = require('../lib/prisma');
const supabase = require('../lib/supabase');

/**
 * 1. ฟังก์ชันสำหรับลูกค้า: อัปโหลดสลิปโอนเงิน (เหมือนเดิม)
 */
const uploadPaymentSlip = async (req, res) => {
    const { order_id, amount_paid } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "กรุณาแนบหลักฐานการโอนเงิน (สลิป)" });

    try {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `slip_${order_id}_${Date.now()}.${fileExt}`;
        const filePath = `slips/${fileName}`;

        const { data, error } = await supabase.storage
            .from('payment-slips')
            .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('payment-slips')
            .getPublicUrl(filePath);

        const newPayment = await prisma.$transaction(async (tx) => {
            const payment = await tx.payments.create({
                data: {
                    order_id: order_id,
                    amount_paid: parseInt(amount_paid),
                    slip_url: publicUrl,
                    is_verified: false
                }
            });

            await tx.orders.update({
                where: { order_id: order_id },
                data: { status: 'รอตรวจสอบชำระเงิน' }
            });

            return payment;
        });

        res.status(201).json({ success: true, data: newPayment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * 2. ฟังก์ชันสำหรับ Admin/Owner/Manager: ยืนยันสลิป และ บันทึก Log
 */
const verifyPayment = async (req, res) => {
    const { payment_id } = req.params;
    const adminId = req.user.id; // ดึง ID ของคนที่กดยืนยัน (จาก protect middleware)

    try {
        const result = await prisma.$transaction(async (tx) => {
            
            // 2.1 ดึงข้อมูลการชำระเงิน
            const payment = await tx.payments.findUnique({
                where: { payment_id: payment_id },
                include: { order: { include: { items: true } } }
            });

            if (!payment) throw new Error("ไม่พบข้อมูลการชำระเงิน");
            if (payment.is_verified) throw new Error("สลิปนี้ถูกยืนยันไปแล้ว");

            // 2.2 อัปเดตสถานะการยืนยันสลิป
            await tx.payments.update({
                where: { payment_id: payment_id },
                data: { is_verified: true }
            });

            // 2.3 ตัดสต็อกสินค้า
            for (const item of payment.order.items) {
                await tx.products.update({
                    where: { product_id: item.product_id },
                    data: { stock_quantity: { decrement: item.quantity } }
                });
            }

            // 2.4 อัปเดตสถานะออเดอร์
            const updatedOrder = await tx.orders.update({
                where: { order_id: payment.order_id },
                data: { status: 'กำลังเตรียมจัดส่ง' }
            });

            // 2.5 เพิ่มการบันทึก Log ลงในตาราง System_Logs
            await tx.system_Logs.create({
                data: {
                    user_id: adminId, // ID ของ Admin/Manager ที่กดยืนยัน
                    action_details: `ยืนยันการชำระเงินสำหรับออเดอร์ ${payment.order_id} (Payment ID: ${payment_id})` //
                }
            });

            return updatedOrder;
        });

        res.json({
            success: true,
            message: "ยืนยันสลิป ตัดสต็อก และบันทึกประวัติเรียบร้อยแล้ว",
            data: result
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { 
    uploadPaymentSlip, 
    verifyPayment 
};