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
  AIF_READER_URL: process.env.AIF_READER_URL ?? "http://localhost:5174",
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  EMAIL_PROVIDER_URL: process.env.EMAIL_PROVIDER_URL ?? "",
  EMAIL_PROVIDER_KEY: process.env.EMAIL_PROVIDER_KEY ?? "",
};
