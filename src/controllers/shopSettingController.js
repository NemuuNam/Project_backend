const prisma = require('../lib/prisma');
const supabase = require('../lib/supabase');

/**
 * ฟังก์ชันช่วยจัดการ JSON Array จาก Database
 */
const parseImageArray = (data) => {
    try {
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [data];
    } catch (e) {
        return data ? [data] : [];
    }
};

/**
 * ฟังก์ชันช่วยอัปโหลดไฟล์ไป Supabase
 */
const uploadToSupabase = async (file, folder = 'hero') => {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
        .from('shop-images')
        .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });

    if (error) throw error;

    return supabase.storage.from('shop-images').getPublicUrl(fileName).data.publicUrl;
};

/**
 * 1. ส่วนการจัดการหน้าแรก (Home / Hero Section)
 */

exports.getHomeSettings = async (req, res) => {
    try {
        const homeKeys = [
            'hero_title', 'hero_subtitle', 'hero_description', 
            'hero_image_url', 'promotion_text', 'delivery_fee', 
            'min_free_shipping', 'story_image_1', 'story_image_2',
        ];
        
        const settings = await prisma.shop_Settings.findMany({
            where: { config_key: { in: homeKeys } }
        });

        const config = {
            hero_title: 'กรุณาใส่หัวข้อหลัก',
            hero_subtitle: 'กรุณาใส่หัวข้อรอง',
            hero_description: 'กรุณาใส่คำอธิบาย',
            hero_image_url: '[]',
            story_image_1: '',
            story_image_2: '',
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

exports.updateHomeSettings = async (req, res) => {
    const { hero_title, hero_description, hero_subtitle, promotion_text, images_to_delete } = req.body;
    const files = req.files;

    try {
        await prisma.$transaction(async (tx) => {
            const textUpdates = [
                { key: 'hero_title', value: hero_title },
                { key: 'hero_description', value: hero_description },
                { key: 'hero_subtitle', value: hero_subtitle },
                { key: 'promotion_text', value: promotion_text }
            ];

            for (const item of textUpdates) {
                if (item.value !== undefined) {
                    await tx.shop_Settings.upsert({
                        where: { config_key: item.key },
                        update: { config_value: String(item.value) },
                        create: { config_key: item.key, config_value: String(item.value) }
                    });
                }
            }

            const currentRecord = await tx.shop_Settings.findUnique({ where: { config_key: 'hero_image_url' } });
            let currentImages = parseImageArray(currentRecord?.config_value || '[]');

            if (images_to_delete) {
                const urlsToDelete = JSON.parse(images_to_delete);
                if (urlsToDelete.length > 0) {
                    const paths = urlsToDelete.map(url => url.split('/shop-images/')[1]).filter(Boolean);
                    if (paths.length > 0) await supabase.storage.from('shop-images').remove(paths);
                    currentImages = currentImages.filter(url => !urlsToDelete.includes(url));
                }
            }

            if (files && files['hero_image_url']) {
                for (const file of files['hero_image_url']) {
                    const publicUrl = await uploadToSupabase(file, 'hero');
                    currentImages.push(publicUrl);
                }
            }

            await tx.shop_Settings.upsert({
                where: { config_key: 'hero_image_url' },
                update: { config_value: JSON.stringify(currentImages) },
                create: { config_key: 'hero_image_url', config_value: JSON.stringify(currentImages) }
            });

            const storyKeys = ['story_image_1', 'story_image_2'];
            for (const key of storyKeys) {
                if (files && files[key]) {
                    const publicUrl = await uploadToSupabase(files[key][0], 'story');
                    await tx.shop_Settings.upsert({
                        where: { config_key: key },
                        update: { config_value: publicUrl },
                        create: { config_key: key, config_value: publicUrl }
                    });
                }
            }
        });

        res.status(200).json({ success: true, message: "อัปเดตข้อมูลหน้าแรกสำเร็จ" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 2. ส่วนการตั้งค่าร้านค้าทั่วไป
 */

// ✅ เพิ่มฟังก์ชัน getPublicSettings เพื่อแก้ Error บรรทัดที่ 44 ของ Routes
exports.getPublicSettings = async (req, res) => {
    try {
        const publicKeys = [
            'shop_name', 'address', 'phone', 'email', 
            'facebook_url', 'instagram_url', 'line_url', 'tiktok_url',
            'hero_description', 'delivery_fee', 'min_free_shipping', 'about_history', 'about_mission' , 'contact_opening_hours'
        ];
        
        const settings = await prisma.shop_Settings.findMany({
            where: { config_key: { in: publicKeys } }
        });

        // แปลง Array เป็น Object และ Map ชื่อ key ให้ตรงกับที่ Frontend (Footer/Checkout) เรียกใช้
        const config = {};
        settings.forEach(item => {
            config[item.config_key] = item.config_value;
        });

        // Alias keys ให้ตรงกับ Footer.jsx (ถ้าใน DB เก็บชื่อต่างกัน)
        const mappedData = {
            ...config,
            address: config.address, // Footer ใช้ .address
            phone: config.phone,     // Footer ใช้ .phone
        };

        res.status(200).json({ success: true, data: mappedData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const settings = await prisma.shop_Settings.findMany();
        const config = settings.reduce((acc, item) => ({ ...acc, [item.config_key]: item.config_value }), {});
        res.status(200).json({ success: true, data: config });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const data = req.body; // ข้อมูลที่ได้รับจะเป็น [{config_key: '...', config_value: '...'}, ...]

        // ตรวจสอบว่าถ้าส่งมาเป็น Array ให้วนลูปตาม Array
        if (Array.isArray(data)) {
            await prisma.$transaction(
                data.map(item => 
                    prisma.shop_Settings.upsert({
                        where: { config_key: item.config_key },
                        update: { config_value: String(item.config_value) },
                        create: { config_key: item.config_key, config_value: String(item.config_value) }
                    })
                )
            );
        } else {
            // กรณีส่งมาเป็น Object ปกติ (เผื่อไว้)
            await prisma.$transaction(
                Object.entries(data).map(([key, value]) => 
                    prisma.shop_Settings.upsert({
                        where: { config_key: key },
                        update: { config_value: String(value) },
                        create: { config_key: key, config_value: String(value) }
                    })
                )
            );
        }
        res.status(200).json({ success: true, message: "อัปเดตการตั้งค่าสำเร็จ" });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};

/**
 * 3. ส่วนผู้ให้บริการขนส่ง (Shipping_Providers)
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
    } catch (error) { 
        res.status(500).json({ success: false, message: "ไม่สามารถลบได้เนื่องจากมีการใช้งานอยู่ในระบบ" }); 
    }
};

/**
 * 4. ส่วนช่องทางการชำระเงิน (Payment_Methods)
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
 * 5. โซเชียลมีเดีย
 */

exports.updateSocialSettings = async (req, res) => {
    // ✅ แก้ไข: เพิ่ม tiktok_url เข้ามาใน destructuring
    const { facebook_url, instagram_url, line_url, tiktok_url } = req.body; 
    try {
        const updates = [
            { key: 'facebook_url', value: facebook_url },
            { key: 'instagram_url', value: instagram_url },
            { key: 'line_url', value: line_url },
            { key: 'tiktok_url', value: tiktok_url }
        ];

        await prisma.$transaction(
            updates.map(item => 
                prisma.shop_Settings.upsert({
                    where: { config_key: item.key },
                    update: { config_value: String(item.value || '#') },
                    create: { config_key: item.key, config_value: String(item.value || '#') }
                })
            )
        );
        res.status(200).json({ success: true, message: "อัปเดตลิงก์โซเชียลสำเร็จ" });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};