import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users, blockedEmails } from "@db/schema";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { fullName, gradeLevel, classNumber, email, password, confirmPassword } = req.body;

    if (!fullName || !gradeLevel || !classNumber || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Mật khẩu xác nhận không khớp" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const validGradeLevels = ["Tiểu học", "THCS", "THPT"];
    if (!validGradeLevels.includes(gradeLevel)) {
      return res.status(400).json({ message: "Cấp học không hợp lệ" });
    }

    const classNum = parseInt(classNumber);
    if (isNaN(classNum)) {
      return res.status(400).json({ message: "Lớp học không hợp lệ" });
    }

    if (gradeLevel === "Tiểu học" && (classNum < 1 || classNum > 5)) {
      return res.status(400).json({ message: "Lớp học Tiểu học phải từ 1 đến 5" });
    }
    if (gradeLevel === "THCS" && (classNum < 6 || classNum > 9)) {
      return res.status(400).json({ message: "Lớp học THCS phải từ 6 đến 9" });
    }
    if (gradeLevel === "THPT" && (classNum < 10 || classNum > 12)) {
      return res.status(400).json({ message: "Lớp học THPT phải từ 10 đến 12" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    const blocked = await db.select().from(blockedEmails).where(eq(blockedEmails.email, email.toLowerCase())).limit(1);
    if (blocked.length > 0) {
      return res.status(403).json({ message: "Email này không được phép đăng ký" });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email đã được đăng ký" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      gradeLevel,
      classNumber: classNum,
    }).returning();

    req.session.userId = newUser.id;

    res.json({
      message: "Đăng ký thành công",
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        gradeLevel: newUser.gradeLevel,
        classNumber: newUser.classNumber,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Lỗi đăng ký tài khoản" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    req.session.userId = user.id;

    res.json({
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        gradeLevel: user.gradeLevel,
        classNumber: user.classNumber,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Lỗi đăng nhập" });
  }
}

export async function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Lỗi đăng xuất" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Đăng xuất thành công" });
  });
}

export async function checkSession(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.json({ authenticated: false });
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);

    if (!user) {
      req.session.destroy(() => {});
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        gradeLevel: user.gradeLevel,
        classNumber: user.classNumber,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({ message: "Lỗi kiểm tra phiên đăng nhập" });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Vui lòng đăng nhập" });
  }
  next();
}
