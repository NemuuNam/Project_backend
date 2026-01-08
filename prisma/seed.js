const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- 🚀 Start Seeding: SOOO GUICHAI System ---');

  // 1. ข้อมูล Permissions
  // ใช้ permission_name เป็นตัวระบุตัวตน (ต้องเป็น @unique ใน schema)
  const permissions = [
    { name: 'VIEW_PRODUCTS', desc: 'เข้าชมเว็บไซต์และดูสินค้า' },
    { name: 'AUTH_ACCESS', desc: 'สมัครสมาชิกและเข้าสู่ระบบ' },
    { name: 'MANAGE_CART', desc: 'เพิ่ม/ลบสินค้าในตะกร้า' },
    { name: 'PLACE_ORDER', desc: 'สั่งซื้อและดูประวัติ' },
    { name: 'VERIFY_PAYMENT', desc: 'ตรวจสอบการโอนเงิน' },
    { name: 'UPDATE_ORDER_STATUS', desc: 'อัปเดตสถานะคำสั่งซื้อ' },
    { name: 'MANAGE_PRODUCTS', desc: 'จัดการสินค้า (CRUD)' },
    { name: 'MANAGE_USERS', desc: 'จัดการผู้ใช้งาน' },
    { name: 'VIEW_STOCK_REPORTS', desc: 'ดูรายงานอัปเดตสต็อก' },
    { name: 'VIEW_SALES_REPORTS', desc: 'ดูรายงานยอดขาย' },
  ];

  console.log('📦 Seeding Permissions...');
  for (const p of permissions) {
    await prisma.permissions.upsert({
      where: { permission_name: p.name }, // ค้นหาด้วยชื่อที่เป็น Unique
      update: { description: p.desc },    // ถ้ามีแล้วให้แค่อัปเดตคำอธิบาย
      create: { 
        permission_name: p.name, 
        description: p.desc 
      },
    });
  }

  // 2. ข้อมูล Roles
  const roles = [
    { name: 'SystemAdmin', level: 1 },
    { name: 'Owner', level: 2 },
    { name: 'Manager', level: 3 },
    { name: 'Customer', level: 4 },
  ];

  console.log('👥 Seeding Roles & Mapping Permissions...');
  for (const r of roles) {
    // ใช้ role_level เป็นตัวตั้งในการ upsert เพื่อป้องกัน Error P2002
    const role = await prisma.roles.upsert({
      where: { role_level: r.level }, 
      update: { role_name: r.name },
      create: { 
        role_name: r.name, 
        role_level: r.level 
      },
    });

    // 3. ล้างสิทธิ์เก่าของ Role นี้ก่อนเพื่อป้องกันข้อมูลซ้ำซ้อน (Data Integrity)
    await prisma.role_Permissions.deleteMany({ 
      where: { role_id: role.role_id } 
    });

    // กำหนดรายการ Permission ตามระดับของ Role
    let allowedPerms = [];
    if (r.name === 'SystemAdmin') {
      allowedPerms = permissions.map(p => p.name);
    } else if (r.name === 'Owner') {
      allowedPerms = ['VIEW_PRODUCTS', 'AUTH_ACCESS', 'VIEW_STOCK_REPORTS', 'VIEW_SALES_REPORTS'];
    } else if (r.name === 'Manager') {
      allowedPerms = ['VIEW_PRODUCTS', 'AUTH_ACCESS', 'MANAGE_CART', 'PLACE_ORDER', 'VERIFY_PAYMENT', 'UPDATE_ORDER_STATUS', 'MANAGE_PRODUCTS', 'VIEW_SALES_REPORTS'];
    } else if (r.name === 'Customer') {
      allowedPerms = ['VIEW_PRODUCTS', 'AUTH_ACCESS', 'MANAGE_CART', 'PLACE_ORDER'];
    }

    // ดึง ID ของ Permission จากฐานข้อมูลมาผูก
    const permsInDb = await prisma.permissions.findMany({ 
      where: { permission_name: { in: allowedPerms } } 
    });
    
    // บันทึกลงตารางความสัมพันธ์ Role_Permissions
    await prisma.role_Permissions.createMany({
      data: permsInDb.map(p => ({ 
        role_id: role.role_id, 
        permission_id: p.permission_id 
      }))
    });
  }

  console.log('✅ Seeding finished successfully! 🌱');
}

main()
  .catch(e => { 
    console.error('❌ Seeding Error:', e); 
    process.exit(1); 
  })
  .finally(() => prisma.$disconnect());