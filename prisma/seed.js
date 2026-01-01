const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding roles...');

  // ข้อมูล Roles ตามที่คุณต้องการ
  // กำหนด role_level: 1 เป็นระดับสูงสุด (Owner)
  const roles = [
    { role_name: 'Owner', role_level: 1 },
    { role_name: 'Admin', role_level: 2 },
    { role_name: 'Manager', role_level: 3 },
    { role_name: 'Customer', role_level: 4 },
  ];

  for (const role of roles) {
    //ใช้ upsert เพื่อป้องกันการสร้างข้อมูลซ้ำถ้ามีชื่อเดิมอยู่แล้ว
    await prisma.roles.upsert({
      where: { role_name: role.role_name },
      update: { role_level: role.role_level }, // อัปเดตเลเวลถ้ามีการเปลี่ยนแปลง
      create: role,
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });