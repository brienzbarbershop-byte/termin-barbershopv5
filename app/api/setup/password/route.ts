import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

function isComplex(pw: string) {
  return pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);
}

function readAdminPasswordFromFile(): string | undefined {
  try {
    const envPath = path.join(process.cwd(), ".env");
    const content = fs.readFileSync(envPath, "utf8");
    const match = /^ADMIN_PASSWORD=(.*)$/m.exec(content);
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request | NextRequest) {
  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const config = await prisma.storeConfig.findFirst();
    const envHash = process.env.ADMIN_PASSWORD_HASH;
    const effectivePassword = config?.adminPassword ?? envHash;
    if (!effectivePassword) {
      return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
    }
    let ok = false;
    try {
      ok = await bcrypt.compare(currentPassword, effectivePassword);
    } catch {
      ok = false;
    }
    // migration path removed: require hash-only
    if (!ok) return NextResponse.json({ error: "Altes Passwort ist ungültig" }, { status: 401 });

    if (!isComplex(newPassword)) {
      return NextResponse.json({ error: "Passwort zu schwach" }, { status: 400 });
    }
    try {
      const same = await bcrypt.compare(newPassword, effectivePassword);
      if (same) {
        return NextResponse.json({ error: "Dieses Passwort wurde bereits verwendet" }, { status: 400 });
      }
    } catch {}

    const hash = await bcrypt.hash(newPassword, 10);
    const updated = config
      ? await prisma.storeConfig.update({ where: { id: config.id }, data: { adminPassword: hash } })
      : await prisma.storeConfig.create({ data: { adminPassword: hash } });
    try {
      const c = await cookies();
      c.delete("admin_session");
    } catch {}
    const res = NextResponse.json({ ok: true, id: updated.id }, { status: 200 });
    try { res.cookies.set("admin_session", "", { path: "/", maxAge: 0 }); } catch {}
    return res;
  } catch {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
