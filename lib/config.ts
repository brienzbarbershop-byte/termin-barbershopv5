const env = process.env;

function req(key: string) {
  const v = env[key];
  if (!v || String(v).length === 0) throw new Error(`${key} missing`);
  return v;
}

export const NODE_ENV = env.NODE_ENV || "development";
export const APP_URL = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const DATABASE_URL = req("DATABASE_URL");
export const ADMIN_SESSION_SECRET = req("ADMIN_SESSION_SECRET");
export const ADMIN_CONTACT_EMAIL = env.ADMIN_CONTACT_EMAIL || "kontakt@example.com";
export const BREVO_API_KEY = env.BREVO_API_KEY || "";
export const BREVO_SENDER_EMAIL = env.BREVO_SENDER_EMAIL || "kontakt@example.com";
export const BREVO_SENDER_NAME = env.BREVO_SENDER_NAME || "Barber Shop – Brienz";
export const CRON_SECRET = env.CRON_SECRET || "";
export const SENTRY_DSN = env.SENTRY_DSN || "";
