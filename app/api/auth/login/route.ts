export const runtime = "nodejs";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { setAdminCookie } from "../../../../lib/auth";

const attempts = new Map<string, { count: number; until?: number }>();

export async function POST(req: Request) {
  const body = await req.json();
  const { password } = body as { password?: string };
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry?.until && now < entry.until) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  }
  const config = await prisma.storeConfig.findFirst();
  const storedHash = config?.adminPassword;
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  if (!storedHash && !envHash) {
    return NextResponse.json({ ok: false, error: "admin_not_configured" }, { status: 503 });
  }
  let ok = false;
  if (typeof password === "string" && password.length > 0) {
    try {
      ok = await bcrypt.compare(password, storedHash ?? envHash!);
    } catch {
      ok = false;
    }
  }
  if (!ok) {
    const cnt = (entry?.count ?? 0) + 1;
    const until = cnt >= 5 ? now + 15 * 60 * 1000 : undefined;
    attempts.set(ip, { count: cnt, until });
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true }, { status: 200 });
  setAdminCookie(res, 30 * 60);
  return res;
}
