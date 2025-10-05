/*
  # Create users authentication table

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - User unique identifier
      - `email` (text, unique, not null) - User email address
      - `password_hash` (text, not null) - Hashed password
      - `full_name` (text, not null) - User's full name
      - `grade_level` (text, not null) - Education level (Tiểu học, THCS, THPT)
      - `class_number` (integer, not null) - Class number (1-5, 6-9, 10-12)
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read their own data
    - Add policy for users to update their own data
    - Add policy for user registration (insert)
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  grade_level text NOT NULL CHECK (grade_level IN ('Tiểu học', 'THCS', 'THPT')),
  class_number integer NOT NULL CHECK (
    (grade_level = 'Tiểu học' AND class_number BETWEEN 1 AND 5) OR
    (grade_level = 'THCS' AND class_number BETWEEN 6 AND 9) OR
    (grade_level = 'THPT' AND class_number BETWEEN 10 AND 12)
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user registration"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);