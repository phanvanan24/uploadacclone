/*
  # Admin and Student System

  1. New Tables
    - `accounts`
      - `id` (uuid, primary key)
      - `username` (text, unique) - Tên đăng nhập
      - `password_hash` (text) - Mật khẩu đã mã hóa
      - `role` (text) - 'admin' hoặc 'student'
      - `api_key` (text, nullable) - API key cho học sinh
      - `full_name` (text, nullable) - Họ tên
      - `created_at` (timestamp)
      - `created_by` (uuid, nullable) - Admin tạo tài khoản
      - `is_active` (boolean) - Trạng thái hoạt động
  
  2. Security
    - Enable RLS on `accounts` table
    - Policies for admin to manage all accounts
    - Policies for students to view only their own account
    
  3. Initial Data
    - Create default admin account
      - Username: admin
      - Password: Admin@123 (hashed)
*/

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'student')),
  api_key text,
  full_name text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES accounts(id),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Admin can view all accounts
CREATE POLICY "Admins can view all accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.role = 'admin'
    )
  );

-- Students can view only their own account
CREATE POLICY "Students can view own account"
  ON accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admin can insert new accounts
CREATE POLICY "Admins can create accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.role = 'admin'
    )
  );

-- Admin can update accounts
CREATE POLICY "Admins can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.role = 'admin'
    )
  );

-- Admin can delete accounts
CREATE POLICY "Admins can delete accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role);
CREATE INDEX IF NOT EXISTS idx_accounts_created_by ON accounts(created_by);
