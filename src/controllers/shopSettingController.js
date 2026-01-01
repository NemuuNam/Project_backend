const prisma = require('../lib/prisma');
const supabase = require('../lib/supabase');

/**
 * ==========================================
 * 1. ส่วนการจัดการหน้าแรก (Home / Hero Section)
 * ==========================================
 */

// [GET] ดึงข้อมูลหน้าแรกมาแสดง
exports.getHomeSettings = async (req, res) => {
    try {
        const homeKeys = ['hero_title', 'hero_description', 'hero_image_url', 'hero_subtitle', 'promotion_text', 'delivery_fee', 'min_free_shipping'];
        const settings = await prisma.shop_Settings.findMany({
            where: { config_key: { in: homeKeys } }
        });

        // กำหนดค่าเริ่มต้น (Defaults)
        const config = {
            hero_title: 'กรุณาใส่หัวข้อหลัก',
            hero_subtitle: 'กรุณาใส่หัวข้อรอง',
            hero_description: 'กรุณาใส่คำอธิบาย',
            hero_image_url: '',
            promotion_text: '',
            delivery_fee: '0',
            min_free_shipping: '0'
        };

        settings.forEach(item => {
            config[item.config_key] = item.config_value;
        });

        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: "โหลดข้อมูลล้มเหลว" });
    }
};

// [PUT] อัปเดตข้อมูลหน้าแรกและจัดการรูปภาพ
exports.updateHomeSettings = async (req, res) => {
    const { hero_title, hero_description, hero_subtitle, promotion_text } = req.body;
    const file = req.file;

    try {
        await prisma.$transaction(async (tx) => {
            // 1. จัดการข้อมูลข้อความ
            const updates = [
                { key: 'hero_title', value: hero_title },
                { key: 'hero_description', value: hero_description },
                { key: 'hero_subtitle', value: hero_subtitle },
                { key: 'promotion_text', value: promotion_text }
            ];

            for (const item of updates) {
                if (item.value !== undefined) {
                    await tx.shop_Settings.upsert({
                        where: { config_key: item.key },
                        update: { config_value: String(item.value) },
                        create: { config_key: item.key, config_value: String(item.value) }
                    });
                }
            }

            // 2. จัดการรูปภาพ (ลบรูปเก่า อัปโหลดรูปใหม่)
            if (file) {
                const existingImgRecord = await tx.shop_Settings.findUnique({
                    where: { config_key: 'hero_image_url' }
                });

                if (existingImgRecord?.config_value) {
                    const pathParts = existingImgRecord.config_value.split('/shop-images/');
                    if (pathParts.length > 1) {
                        await supabase.storage.from('shop-images').remove([pathParts[1]]);
                    }
                }

                const fileName = `hero_${Date.now()}.${file.originalname.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage
                    .from('shop-images')
                    .upload(`hero/${fileName}`, file.buffer, { contentType: file.mimetype, upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('shop-images')
                    .getPublicUrl(`hero/${fileName}`);

                await tx.shop_Settings.upsert({
                    where: { config_key: 'hero_image_url' },
                    update: { config_value: publicUrl },
                    create: { config_key: 'hero_image_url', config_value: publicUrl }
                });
            }
        });

        res.status(200).json({ success: true, message: "อัปเดตข้อมูลสำเร็จ" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ==========================================
 * 2. ส่วนการตั้งค่าร้านค้าทั่วไป (รวมค่าขนส่ง)
 * ==========================================
 */

exports.getSettings = async (req, res) => {
    try {
        const settings = await prisma.shop_Settings.findMany();
        const config = settings.reduce((acc, item) => ({ ...acc, [item.config_key]: item.config_value }), {});
        res.status(200).json({ success: true, data: config });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateSettings = async (req, res) => {
    try {
        const data = req.body; // รับ { delivery_fee: 180, min_free_shipping: 20 }
        const tasks = Object.entries(data).map(([key, value]) => 
            prisma.shop_Settings.upsert({
                where: { config_key: key },
                update: { config_value: String(value) },
                create: { config_key: key, config_value: String(value) }
            })
        );
        await Promise.all(tasks);
        res.status(200).json({ success: true, message: "อัปเดตการตั้งค่าสำเร็จ" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * ==========================================
 * 3. ส่วนผู้ให้บริการขนส่ง (Shipping_Providers)
 * ==========================================
 */

exports.getShippingProviders = async (req, res) => {
    try {
        const providers = await prisma.shipping_Providers.findMany({ orderBy: { provider_id: 'asc' } });
        res.status(200).json({ success: true, data: providers });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createShippingProvider = async (req, res) => {
    try {
        if (!req.body.provider_name) return res.status(400).json({ message: "กรุณาระบุชื่อผู้ขนส่ง" });
        const newProvider = await prisma.shipping_Providers.create({ data: { provider_name: req.body.provider_name } });
        res.status(201).json({ success: true, data: newProvider });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteShippingProvider = async (req, res) => {
    try {
        await prisma.shipping_Providers.delete({ where: { provider_id: Number(req.params.id) } });
        res.status(200).json({ success: true, message: "ลบสำเร็จ" });
    } catch (error) { res.status(500).json({ success: false, message: "ไม่สามารถลบได้เนื่องจากมีการใช้งานอยู่ในระบบ" }); }
};

/**
 * ==========================================
 * 4. ส่วนช่องทางการชำระเงิน (Payment_Methods)
 * ==========================================
 */

exports.getPaymentMethods = async (req, res) => {
    try {
        const methods = await prisma.payment_Methods.findMany({ orderBy: { method_id: 'asc' } });
        res.status(200).json({ success: true, data: methods });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createPaymentMethod = async (req, res) => {
    try {
        const newMethod = await prisma.payment_Methods.create({ data: req.body });
        res.status(201).json({ success: true, data: newMethod });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deletePaymentMethod = async (req, res) => {
    try {
        await prisma.payment_Methods.delete({ where: { method_id: Number(req.params.id) } });
        res.status(200).json({ success: true, message: "ลบสำเร็จ" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * ==========================================
 * 5. โซเชียลมีเดียและข้อมูลสาธารณะ
 * ==========================================
 */

exports.getPublicSettings = async (req, res) => {
    try {
        const settings = await prisma.shop_Settings.findMany();
        const config = settings.reduce((acc, item) => ({ ...acc, [item.config_key]: item.config_value }), {});
        res.json({ success: true, data: config });
    } catch (error) { res.status(500).json({ success: false }); }
};

exports.updateSocialSettings = async (req, res) => {
    const { facebook_url, instagram_url, line_url } = req.body;
    try {
        const updates = [
            { key: 'facebook_url', value: facebook_url },
            { key: 'instagram_url', value: instagram_url },
            { key: 'line_url', value: line_url }
        ];
        await Promise.all(
            updates.map(item => 
                prisma.shop_Settings.upsert({
                    where: { config_key: item.key },
                    update: { config_value: String(item.value || '#') },
                    create: { config_key: item.key, config_value: String(item.value || '#') }
                })
            )
        );
        res.status(200).json({ success: true, message: "อัปเดตลิงก์โซเชียลสำเร็จ" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// controllers/shopSettingsController.js

exports.getHomeSettings = async (req, res) => {
    try {
        // 🆕 เพิ่ม 'delivery_fee' และ 'min_free_shipping' เข้าไปในรายการดึงข้อมูล
        const homeKeys = [
            'hero_title', 
            'hero_description', 
            'hero_image_url', 
            'hero_subtitle', 
            'promotion_text',
            'delivery_fee',      // <--- ต้องมีตัวนี้
            'min_free_shipping'  // <--- ต้องมีตัวนี้
        ];

        const settings = await prisma.shop_Settings.findMany({
            where: { config_key: { in: homeKeys } }
        });

        // กำหนดค่าเริ่มต้นกรณีใน DB ยังไม่มีข้อมูล เพื่อป้องกัน NaN
        const config = {
            hero_title: 'SOOO GUICHAI',
            delivery_fee: '180',
            min_free_shipping: '20',
            promotion_text: ''
            // ... keys อื่นๆ
        };

        settings.forEach(item => {
            config[item.config_key] = item.config_value;
        });

        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: "โหลดข้อมูลล้มเหลว" });
    }
};

