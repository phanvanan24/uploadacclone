import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.VITE_SUPABASE_URL) {
  throw new Error("VITE_SUPABASE_URL is not set");
}

if (!process.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not set");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL.replace('https://', '');
const projectRef = supabaseUrl.split('.')[0];

const databaseUrl = `postgresql://postgres.${projectRef}:${process.env.DATABASE_PASSWORD || ""}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
