require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
// Vercel จะเป็นคนกำหนด Port ให้เองในระบบ Serverless แต่เราใส่ไว้สำหรับรัน Local
const port = process.env.PORT || 5000;

// ==========================================
// 1. นำเข้า Routes
// ==========================================
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const systemLogRoutes = require('./routes/systemLogRoutes');
const inventoryLogRoutes = require('./routes/inventoryLogRoutes');
const shopSettingRoutes = require('./routes/shopSettingRoutes');
const addressRoutes = require('./routes/addressRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

// ==========================================
// 2. Middlewares & CORS Configuration
// ==========================================

// ✅ ตั้งค่า CORS ให้เจาะจงเฉพาะ Frontend ของคุณ
const allowedOrigins = [
  'http://localhost:5173', // สำหรับทดสอบในเครื่อง
  'https://project-frontend-pi-sandy.vercel.app', //URL ของ Frontend ที่โฮสต์บน Vercel
];

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://project-frontend-pi-sandy.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');

  // ถ้าเป็น OPTIONS ให้ตอบกลับ 200 OK ทันที
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());

// ==========================================
// 4. จัดกลุ่ม API Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);

app.use('/api/admin/users', userRoutes);
app.use('/api/admin/orders', orderRoutes);
app.use('/api/admin/products', productRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/shipping-providers', shippingRoutes);

app.use('/api/admin/reports', reportRoutes);
app.use('/api/admin/system-log', systemLogRoutes);
app.use('/api/admin/inv-log', inventoryLogRoutes);
app.use('/api/admin/shop-settings', shopSettingRoutes);

// ==========================================
// Global Error Handler (Prisma & System)
// ==========================================
app.use((err, req, res, next) => {
  console.error('--- System Error Log ---');
  console.error('Time:', new Date().toLocaleString());
  console.error('Path:', req.path);
  console.error('Error Code:', err.code);
  console.error('Error Message:', err.message);

  // ดักจับ Error จาก Prisma
  if (err.code === 'P2000') {
    return res.status(400).json({ success: false, message: "ข้อมูลยาวเกินกำหนด" });
  }
  if (err.code === 'P2002') {
    return res.status(400).json({ success: false, message: `ข้อมูลนี้มีอยู่ในระบบแล้ว: ${err.meta?.target || ''}` });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: "ไม่พบข้อมูลที่ระบุ" });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// ==========================================
// 5. เริ่มการทำงานของ Server
// ==========================================
// ใช้เงื่อนไขเพื่อให้ Vercel จัดการ Serverless Function ได้ถูกต้อง
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

module.exports = app;