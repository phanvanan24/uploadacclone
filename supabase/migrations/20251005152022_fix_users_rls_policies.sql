/*
  # Fix RLS policies for custom authentication

  1. Changes
    - Drop existing INSERT policy that uses auth.uid() (incompatible with custom auth)
    - Add new INSERT policy that allows public registration
    - Keep existing SELECT and UPDATE policies for authenticated users
  
  2. Security
    - INSERT policy allows anyone to register (validation done in application layer)
    - SELECT/UPDATE policies remain restrictive for user data protection
*/

DROP POLICY IF EXISTS "Allow user registration" ON users;

CREATE POLICY "Allow public user registration"
  ON users FOR INSERT
  WITH CHECK (true);
