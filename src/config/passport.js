const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('../lib/prisma');

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // ✅ 1. Normalize อีเมลจาก Google ให้เป็นตัวพิมพ์เล็กทั้งหมด
      const googleEmail = profile.emails[0].value.toLowerCase().trim();

      // ✅ 2. ตรวจสอบว่ามี user นี้หรือยัง พร้อมดึงข้อมูล Role ออกมาด้วย
      // ใช้ findFirst + insensitive เพื่อความปลอดภัยสูงสุดในการค้นหา
      let user = await prisma.users.findFirst({ 
        where: { 
          email: {
            equals: googleEmail,
            mode: 'insensitive'
          }
        },
        include: { role: true } // ดึงข้อมูลจากตาราง Roles มาด้วย
      });
      
      if (!user) {
        // ✅ 3. ถ้าไม่มี ให้สร้าง user ใหม่ (บันทึก email เป็นตัวพิมพ์เล็กเสมอ)
        user = await prisma.users.create({
          data: {
            first_name: profile.name.givenName || 'Google',
            last_name: profile.name.familyName || 'User',
            email: googleEmail,
            role_id: 4, // Customer
            password: "" // Social login ไม่ต้องมีรหัสผ่าน
          },
          include: { role: true } // ดึง Role กลับมาหลังจากสร้างเสร็จ
        });
      }

      // ส่ง user object ที่มีข้อมูล role ไปยัง callback ใน authRoutes.js
      return done(null, user);
    } catch (err) {
        console.error("Google Passport Error:", err);
        return done(err, null);
    }
  }
));

module.exports = passport;