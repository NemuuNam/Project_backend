const prisma = require('../lib/prisma');
const supabase = require('../lib/supabase');

// หมายเหตุ: ไม่เรียกใช้ createLog สำหรับกิจกรรมสินค้าทั่วไปแล้ว เพื่อให้ System Log ไม่รก

// ==========================================
// 1. การจัดการสินค้า (Products)
// ==========================================

/** 1.1 ดึงข้อมูลสินค้าทั้งหมด */
exports.getAllProducts = async (req, res) => {
    try {
        const products = await prisma.products.findMany({
            include: { 
                images: { where: { is_main: true } }, 
                category: true 
            },
            orderBy: { product_name: 'asc' }
        });
        res.json({ success: true, data: products });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};

/** 1.2 เพิ่มสินค้าใหม่ */
exports.createProduct = async (req, res) => {
    const { product_name, unit_price, stock_quantity, category_id } = req.body;
    const file = req.file;
    const adminId = req.user.user_id || req.user.id;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. สร้างข้อมูลสินค้า
            const product = await tx.products.create({
                data: {
                    product_name,
                    unit_price: parseInt(unit_price),
                    stock_quantity: parseInt(stock_quantity),
                    category_id: parseInt(category_id)
                }
            });

            // 2. จัดการอัปโหลดรูปภาพไปยัง Supabase Storage
            if (file) {
                const fileName = `prod_${product.product_id}_${Date.now()}.${file.originalname.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(`products/${fileName}`, file.buffer, { contentType: file.mimetype, upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(`products/${fileName}`);

                await tx.product_Images.create({
                    data: { product_id: product.product_id, image_url: publicUrl, is_main: true }
                });
            }

            // 3. บันทึกลง Inventory Log (D9) เพื่อแสดงในหน้าประวัติสต็อก
            await tx.inventory_Logs.create({
                data: {
                    product_id: product.product_id,
                    user_id: adminId,
                    change_qty: parseInt(stock_quantity),
                    reason: "เพิ่มสินค้าใหม่เข้าสู่ระบบ"
                }
            });

            return product;
        });

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/** 1.3 แก้ไขสินค้า (บันทึกลง D9 เท่านั้น) */
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { product_name, unit_price, stock_quantity, category_id } = req.body;
    const file = req.file;
    const adminId = req.user.user_id || req.user.id;

    try {
        const oldProduct = await prisma.products.findUnique({ 
            where: { product_id: id }
        });
        
        if (!oldProduct) return res.status(404).json({ message: "ไม่พบสินค้า" });

        // คำนวณความเปลี่ยนแปลงเพื่อระบุเหตุผลใน Log
        let changeReasons = [];
        if (product_name !== oldProduct.product_name) changeReasons.push(`เปลี่ยนชื่อ`);
        if (parseInt(unit_price) !== oldProduct.unit_price) changeReasons.push(`ปรับราคา`);
        if (file) changeReasons.push(`อัปเดตรูปภาพ`);
        const diffQty = parseInt(stock_quantity) - oldProduct.stock_quantity;
        if (diffQty !== 0) changeReasons.push(diffQty > 0 ? `เพิ่มสต็อก (+${diffQty})` : `ลดสต็อก (${diffQty})`);

        const result = await prisma.$transaction(async (tx) => {
            // จัดการเปลี่ยนรูปภาพ (ถ้ามีการอัปโหลดใหม่)
            if (file) {
                const existingImage = await tx.product_Images.findFirst({ where: { product_id: id, is_main: true } });
                if (existingImage && existingImage.image_url) {
                    const bucketName = 'product-images';
                    const parts = existingImage.image_url.split(`${bucketName}/`);
                    if (parts.length > 1) {
                        const oldFilePath = parts[1].split('?')[0];
                        await supabase.storage.from(bucketName).remove([oldFilePath]);
                    }
                }

                const fileName = `prod_${id}_${Date.now()}.${file.originalname.split('.').pop()}`;
                await supabase.storage.from('product-images').upload(`products/${fileName}`, file.buffer, { contentType: file.mimetype, upsert: true });
                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(`products/${fileName}`);
                
                await tx.product_Images.upsert({
                    where: { image_id: existingImage?.image_id || 0 },
                    update: { image_url: publicUrl },
                    create: { product_id: id, image_url: publicUrl, is_main: true }
                });
            }

            const actionReason = changeReasons.join(", ") || "แก้ไขข้อมูลทั่วไป";

            // บันทึกเฉพาะความเคลื่อนไหวสินค้าลง Inventory Log (D9)
            await tx.inventory_Logs.create({
                data: {
                    product_id: id,
                    user_id: adminId,
                    change_qty: diffQty,
                    reason: actionReason
                }
            });

            // อัปเดตข้อมูลสินค้า
            return await tx.products.update({
                where: { product_id: id },
                data: {
                    product_name,
                    unit_price: parseInt(unit_price),
                    stock_quantity: parseInt(stock_quantity),
                    category_id: parseInt(category_id)
                }
            });
        });

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/** 1.4 ลบสินค้า */
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    
    try {
        const product = await prisma.products.findUnique({
            where: { product_id: id },
            include: { images: true }
        });

        if (!product) return res.status(404).json({ success: false, message: "ไม่พบสินค้า" });

        // ลบรูปภาพออกจาก Storage
        if (product.images.length > 0) {
            const paths = product.images.map(img => img.image_url.split('/product-images/')[1]).filter(Boolean);
            await supabase.storage.from('product-images').remove(paths);
        }

        // ลบข้อมูลแบบ Cascade ด้วย Transaction
        await prisma.$transaction([
            prisma.product_Images.deleteMany({ where: { product_id: id } }),
            prisma.inventory_Logs.deleteMany({ where: { product_id: id } }),
            prisma.products.delete({ where: { product_id: id } })
        ]);

        res.json({ success: true, message: "ลบสินค้าเรียบร้อย" });
    } catch (error) {
        res.status(500).json({ success: false, message: "สินค้านี้ถูกใช้งานในระบบขายแล้ว ไม่สามารถลบได้" });
    }
};

/** 🆕 1.5 Sync ข้อมูลสินค้าในตะกร้า (ดึงข้อมูลล่าสุดจาก DB) */
exports.syncCartItems = async (req, res) => {
    const { ids } = req.body; // รับ Array ของ product_id เช่น ["uuid-1", "uuid-2"]

    try {
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: "กรุณาส่งรายการ ID สินค้า" });
        }

        const products = await prisma.products.findMany({
            where: {
                product_id: { in: ids }
            },
            include: {
                images: true,    // ดึงรูปภาพจากตาราง D8
                category: true   // ดึงข้อมูลหมวดหมู่จากตาราง D6
            }
        });

        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 2. การจัดการหมวดหมู่ (Categories)
// ==========================================

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.categories.findMany({ orderBy: { category_name: 'asc' } });
        res.json({ success: true, data: categories });
    } catch (error) { res.status(500).json({ success: false }); }
};

exports.createCategory = async (req, res) => {
    try {
        const cat = await prisma.categories.create({ data: { category_name: req.body.category_name } });
        res.status(201).json({ success: true, data: cat });
    } catch (error) { res.status(500).json({ success: false, message: "ชื่อซ้ำ" }); }
};

exports.deleteCategory = async (req, res) => {
    try {
        await prisma.categories.delete({ where: { category_id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) { res.status(400).json({ success: false, message: "หมวดหมู่ถูกใช้งานอยู่" }); }
};