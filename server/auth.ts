import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";

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

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({
        message: "Mật khẩu phải có ít nhất 1 chữ in hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt (ví dụ: Vanan24042008@)"
      });
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

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({ message: "Email đã được đăng ký" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        grade_level: gradeLevel,
        class_number: classNum,
      })
      .select()
      .single();

    if (error || !newUser) {
      console.error('Supabase insert error:', error);
      throw new Error(error?.message || 'Không thể tạo tài khoản');
    }

    req.session.userId = newUser.id;

    res.json({
      message: "Đăng ký thành công",
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        gradeLevel: newUser.grade_level,
        classNumber: newUser.class_number,
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

    console.log("[LOGIN] Attempt with email:", email);

    if (!email || !password) {
      console.log("[LOGIN] Missing email or password");
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
    }

    const normalizedEmail = email.toLowerCase();
    console.log("[LOGIN] Normalized email:", normalizedEmail);

    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    console.log("[LOGIN] Database query result:", { found: !!user, error: dbError });

    if (!user) {
      console.log("[LOGIN] User not found for email:", normalizedEmail);
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    console.log("[LOGIN] User found, checking password for:", user.email);
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log("[LOGIN] Password valid:", isValidPassword);

    if (!isValidPassword) {
      console.log("[LOGIN] Invalid password for user:", user.email);
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    req.session.userId = user.id;

    res.json({
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        gradeLevel: user.grade_level,
        classNumber: user.class_number,
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

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.session.userId)
      .limit(1)
      .maybeSingle();

    if (!user) {
      req.session.destroy(() => {});
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        gradeLevel: user.grade_level,
        classNumber: user.class_number,
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
