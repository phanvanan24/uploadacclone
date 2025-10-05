import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.VITE_SUPABASE_URL) {
  throw new Error("VITE_SUPABASE_URL is not set");
}

const databaseUrl = `postgresql://postgres.iywrihakotxajrtsxvki:${process.env.DATABASE_PASSWORD || ""}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
