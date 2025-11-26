import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

type SessionPayload = { uid: string; exp: number; ver: number };

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("ADMIN_SESSION_SECRET missing or too short");
  return s;
}

export function signAdminToken(ttlSeconds: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload: SessionPayload = { uid: "admin", exp: Math.floor(Date.now() / 1000) + ttlSeconds, ver: 1 };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest();
  const s = base64url(sig);
  return `${data}.${s}`;
}

export function verifyAdminToken(token: string | undefined | null): SessionPayload | null {
  if (!token || token.split(".").length !== 3) return null;
  const [h, p, s] = token.split(".");
  const data = `${h}.${p}`;
  const expected = base64url(crypto.createHmac("sha256", getSecret()).update(data).digest());
  if (s !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as SessionPayload;
    if (!payload || typeof payload.exp !== "number" || payload.uid !== "admin") return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<NextResponse | undefined> {
  const c = await cookies();
  const raw = c.get("admin_session")?.value;
  const ok = verifyAdminToken(raw || null);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function setAdminCookie(res: NextResponse, ttlSeconds: number) {
  const token = signAdminToken(ttlSeconds);
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: ttlSeconds,
    path: "/",
  });
}

