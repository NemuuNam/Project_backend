// src/lib/prisma.js
const { PrismaClient } = require('@prisma/client');

// ป้องกันการสร้าง PrismaClient ใหม่หลายตัวเมื่อมีการทำ Hot Reload ใน Development
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // ใน Development จะเก็บไว้ใน global object เพื่อใช้ตัวเดิมซ้ำ
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

module.exports = prisma;