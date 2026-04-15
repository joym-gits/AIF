import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_ANON_KEY: required("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_KEY: required("SUPABASE_SERVICE_KEY"),
  PORT: Number(process.env.PORT ?? 3001),
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`,
};
