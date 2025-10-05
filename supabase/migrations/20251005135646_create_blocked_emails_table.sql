/*
  # Create blocked emails table

  1. New Tables
    - `blocked_emails`
      - `id` (uuid, primary key) - Record unique identifier
      - `email` (text, unique, not null) - Blocked email address
      - `created_at` (timestamptz) - When the email was blocked

  2. Security
    - Enable RLS on `blocked_emails` table
    - Add policy for public to read blocked emails (for registration validation)
    - Only system can insert/update/delete (no public policies for modifications)
*/

CREATE TABLE IF NOT EXISTS blocked_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blocked_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blocked emails"
  ON blocked_emails FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS blocked_emails_email_idx ON blocked_emails(email);