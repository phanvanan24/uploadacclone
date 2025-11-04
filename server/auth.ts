import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    console.log("[LOGIN] Attempt with username:", username);

    if (!username || !password) {
      console.log("[LOGIN] Missing username or password");
      return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu" });
    }

    const { data: account, error: dbError } = await supabase
      .from('accounts')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    console.log("[LOGIN] Database query result:", { found: !!account, error: dbError });

    if (!account) {
      console.log("[LOGIN] Account not found for username:", username);
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    console.log("[LOGIN] Account found, checking password for:", account.username);
    const isValidPassword = await bcrypt.compare(password, account.password_hash);
    console.log("[LOGIN] Password valid:", isValidPassword);

    if (!isValidPassword) {
      console.log("[LOGIN] Invalid password for account:", account.username);
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    req.session.userId = account.id;
    req.session.role = account.role;

    res.json({
      id: account.id,
      username: account.username,
      fullName: account.full_name,
      role: account.role,
      apiKey: account.api_key,
    });
  } catch (error) {
    console.error("[LOGIN] Error:", error);
    res.status(500).json({ message: "Lỗi đăng nhập" });
  }
}

export async function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Lỗi đăng xuất" });
    }
    res.json({ message: "Đăng xuất thành công" });
  });
}

export async function checkSession(req: Request, res: Response) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', req.session.userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!account) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
  }

  res.json({
    id: account.id,
    username: account.username,
    fullName: account.full_name,
    role: account.role,
    apiKey: account.api_key,
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Cần đăng nhập" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ message: "Chỉ admin mới có quyền truy cập" });
  }
  next();
}

export async function createStudentAccount(req: Request, res: Response) {
  try {
    const { username, password, apiKey, fullName } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu" });
    }

    if (!apiKey) {
      return res.status(400).json({ message: "Vui lòng nhập API key" });
    }

    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('*')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (existingAccount) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newAccount, error } = await supabase
      .from('accounts')
      .insert({
        username,
        password_hash: hashedPassword,
        role: 'student',
        api_key: apiKey,
        full_name: fullName || username,
        created_by: req.session.userId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[CREATE_ACCOUNT] Error:", error);
      return res.status(500).json({ message: "Lỗi tạo tài khoản" });
    }

    res.json({
      id: newAccount.id,
      username: newAccount.username,
      fullName: newAccount.full_name,
      role: newAccount.role,
      createdAt: newAccount.created_at,
    });
  } catch (error) {
    console.error("[CREATE_ACCOUNT] Error:", error);
    res.status(500).json({ message: "Lỗi tạo tài khoản" });
  }
}

export async function getAllStudents(req: Request, res: Response) {
  try {
    const { data: students, error } = await supabase
      .from('accounts')
      .select('id, username, full_name, api_key, created_at, is_active')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("[GET_STUDENTS] Error:", error);
      return res.status(500).json({ message: "Lỗi lấy danh sách học sinh" });
    }

    res.json(students);
  } catch (error) {
    console.error("[GET_STUDENTS] Error:", error);
    res.status(500).json({ message: "Lỗi lấy danh sách học sinh" });
  }
}

export async function updateStudentAccount(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { password, apiKey, fullName, isActive } = req.body;

    const updateData: any = {};

    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    if (apiKey !== undefined) {
      updateData.api_key = apiKey;
    }

    if (fullName !== undefined) {
      updateData.full_name = fullName;
    }

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    const { data: updatedAccount, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'student')
      .select()
      .single();

    if (error) {
      console.error("[UPDATE_ACCOUNT] Error:", error);
      return res.status(500).json({ message: "Lỗi cập nhật tài khoản" });
    }

    res.json({
      id: updatedAccount.id,
      username: updatedAccount.username,
      fullName: updatedAccount.full_name,
      isActive: updatedAccount.is_active,
    });
  } catch (error) {
    console.error("[UPDATE_ACCOUNT] Error:", error);
    res.status(500).json({ message: "Lỗi cập nhật tài khoản" });
  }
}

export async function deleteStudentAccount(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('role', 'student');

    if (error) {
      console.error("[DELETE_ACCOUNT] Error:", error);
      return res.status(500).json({ message: "Lỗi xóa tài khoản" });
    }

    res.json({ message: "Xóa tài khoản thành công" });
  } catch (error) {
    console.error("[DELETE_ACCOUNT] Error:", error);
    res.status(500).json({ message: "Lỗi xóa tài khoản" });
  }
}
