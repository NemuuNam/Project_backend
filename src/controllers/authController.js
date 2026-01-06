const prisma = require('../lib/prisma');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createLog } = require('./systemLogController');

// ✅ 1. ฟังก์ชันเข้าสู่ระบบ (Login)
// ❌ ยกเลิกการบันทึก Log เพื่อประหยัดพื้นที่ DB ตามคำขอ
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.users.findFirst({
            where: {
                email: {
                    equals: email.toLowerCase().trim(),
                    mode: 'insensitive' 
                }
            },
            include: { role: true }
        });

        if (!user) return res.status(401).json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

        const token = jwt.sign(
            { id: user.user_id, email: user.email, role_level: user.role.role_level }, 
            process.env.JWT_SECRET || 'your_secret_key', 
            { expiresIn: '1d' }
        );

        // --- ลบ createLog ส่วนการเข้าสู่ระบบออกแล้ว ---

        res.json({
            success: true,
            token,
            data: { 
                first_name: user.first_name, 
                last_name: user.last_name, 
                role_level: user.role.role_level 
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
    }
};

// ✅ 2. ฟังก์ชันสมัครสมาชิก (Register) 
// คง Log ไว้เพราะเป็นการสร้างบัญชีใหม่ (เกิดขึ้นไม่บ่อย)
exports.register = async (req, res) => {
    const { first_name, last_name, email, password } = req.body;
    try {
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await prisma.users.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) return res.status(400).json({ success: false, message: "อีเมลนี้ถูกใช้งานแล้ว" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.users.create({
            data: { first_name, last_name, email: normalizedEmail, password: hashedPassword, role_id: 4 }
        });

        await createLog(newUser.user_id, `สมัครสมาชิกใหม่ผ่านเว็บไซต์`);
        res.status(201).json({ success: true, message: "ลงทะเบียนสำเร็จ" });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการลงทะเบียน" });
    }
};

// ✅ 3. ลืมรหัสผ่าน (Forgot Password) 
// ใช้ JWT ร่วมกับ Password เดิมเป็น Secret เพื่อให้ลิงก์ใช้ได้ครั้งเดียว
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.users.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (!user) return res.status(404).json({ success: false, message: "ไม่พบอีเมลนี้ในระบบ" });

        const secret = (process.env.JWT_SECRET || 'your_secret_key') + user.password;
        const token = jwt.sign({ id: user.user_id, email: user.email }, secret, { expiresIn: '15m' });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS  
            }
        });

        await transporter.verify();

        const resetUrl = `https://project-frontend-pi-sandy.vercel.app/reset-password/${user.user_id}/${token}`;
        const mailOptions = {
            from: `"ร้านคุกกี้" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'รีเซ็ตรหัสผ่าน - ร้านคุกกี้',
            html: `
                <div style="font-family: 'Kanit', sans-serif; padding: 20px; color: #1B2559; border: 1px solid #E2E8F0; border-radius: 15px;">
                    <h2 style="color: #C5A059;">แจ้งลืมรหัสผ่าน</h2>
                    <p>คุณได้ทำการขอรีเซ็ตรหัสผ่านสำหรับบัญชี <b>${user.email}</b></p>
                    <p>กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์นี้มีอายุ 15 นาที):</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="display: inline-block; padding: 15px 30px; background-color: #1B2559; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">ตั้งรหัสผ่านใหม่</a>
                    </div>
                    <p style="font-size: 11px; color: #A0AEC0;">หากคุณไม่ได้เป็นผู้ส่งคำขอนี้ โปรดเพิกเฉยต่ออีเมลฉบับนี้</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        await createLog(user.user_id, `ร้องขอรีเซ็ตรหัสผ่าน (Email Sent)`);

        res.json({ success: true, message: "ระบบส่งลิงก์กู้คืนรหัสผ่านไปที่อีเมลของคุณแล้ว" });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด: " + error.message });
    }
};

// ✅ 4. เปลี่ยนรหัสผ่านใหม่ (Reset Password)
// รับ userId เป็น String (UUID) ตาม Schema
exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { userId, newPassword } = req.body;

    try {
        if (!userId || !token || !newPassword) {
            return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
        }

        // ค้นหาด้วย UUID (String) โดยไม่ต้องใช้ Number()
        const user = await prisma.users.findUnique({ 
            where: { user_id: userId } 
        });

        if (!user) return res.status(400).json({ success: false, message: "ไม่พบผู้ใช้งาน" });

        const secret = (process.env.JWT_SECRET || 'your_secret_key') + user.password;
        try {
            jwt.verify(token, secret);
        } catch (err) {
            return res.status(400).json({ success: false, message: "ลิงก์หมดอายุหรือข้อมูลไม่ถูกต้อง" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.users.update({
            where: { user_id: user.user_id },
            data: { password: hashedPassword }
        });

        await createLog(user.user_id, `เปลี่ยนรหัสผ่านสำเร็จผ่านลิงก์อีเมล`);

        res.json({ success: true, message: "เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว" });

    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};