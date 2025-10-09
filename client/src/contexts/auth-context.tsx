import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

type User = {
  id: string;
  email: string;
  fullName: string;
  gradeLevel: string;
  classNumber: number;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
};

type RegisterData = {
  fullName: string;
  gradeLevel: string;
  classNumber: number;
  email: string;
  password: string;
  confirmPassword: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const checkSession = async () => {
    setIsLoading(true);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          fullName: firebaseUser.displayName || 'User',
          gradeLevel: 'THPT',
          classNumber: 12,
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      toast({
        title: "Thành công",
        description: "Đăng nhập thành công",
      });
    } catch (error: any) {
      let errorMessage = "Đăng nhập thất bại";

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        errorMessage = "Email hoặc mật khẩu không đúng";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "Tài khoản không tồn tại";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Quá nhiều lần thử. Vui lòng thử lại sau";
      }

      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      if (data.password !== data.confirmPassword) {
        throw new Error("Mật khẩu xác nhận không khớp");
      }

      if (data.password.length < 6) {
        throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
      }

      const hasUpperCase = /[A-Z]/.test(data.password);
      const hasLowerCase = /[a-z]/.test(data.password);
      const hasNumber = /[0-9]/.test(data.password);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(data.password);

      if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        throw new Error("Mật khẩu phải có ít nhất 1 chữ in hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt");
      }

      const validGradeLevels = ["Tiểu học", "THCS", "THPT"];
      if (!validGradeLevels.includes(data.gradeLevel)) {
        throw new Error("Cấp học không hợp lệ");
      }

      const classNum = parseInt(data.classNumber.toString());
      if (isNaN(classNum)) {
        throw new Error("Lớp học không hợp lệ");
      }

      if (data.gradeLevel === "Tiểu học" && (classNum < 1 || classNum > 5)) {
        throw new Error("Lớp học Tiểu học phải từ 1 đến 5");
      }
      if (data.gradeLevel === "THCS" && (classNum < 6 || classNum > 9)) {
        throw new Error("Lớp học THCS phải từ 6 đến 9");
      }
      if (data.gradeLevel === "THPT" && (classNum < 10 || classNum > 12)) {
        throw new Error("Lớp học THPT phải từ 10 đến 12");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

      toast({
        title: "Thành công",
        description: "Đăng ký thành công",
      });
    } catch (error: any) {
      let errorMessage = error.message || "Đăng ký thất bại";

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email đã được đăng ký";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email không hợp lệ";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Mật khẩu quá yếu";
      }

      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      toast({
        title: "Thành công",
        description: "Đăng xuất thành công",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Đăng xuất thất bại",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
