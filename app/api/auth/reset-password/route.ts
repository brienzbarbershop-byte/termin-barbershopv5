import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token || "");
    const newPassword = String(body?.newPassword || "");
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
    }
    const config = await prisma.storeConfig.findFirst({ where: { resetToken: token } });
    if (!config || !config.resetTokenExpiry || new Date(config.resetTokenExpiry).getTime() < Date.now()) {
      return NextResponse.json({ error: "Token ungültig oder abgelaufen" }, { status: 400 });
    }
    const envPath = path.join(process.cwd(), ".env");
    let envPassword: string | undefined;
    try {
      const content = fs.readFileSync(envPath, "utf8");
      const match = /^ADMIN_PASSWORD=(.*)$/m.exec(content);
      envPassword = match ? match[1].trim() : undefined;
    } catch {}
    const effectivePassword = config.adminPassword ?? envPassword ?? "barber123";
    try {
      const same = await bcrypt.compare(newPassword, effectivePassword);
      if (same || newPassword === effectivePassword) {
        return NextResponse.json({ error: "Dieses Passwort wurde bereits verwendet" }, { status: 400 });
      }
    } catch {}
    const hash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.storeConfig.update({
      where: { id: config.id },
      data: { adminPassword: hash, resetToken: null, resetTokenExpiry: null },
    });
    const res = NextResponse.json({ ok: true, id: updated.id }, { status: 200 });
    res.cookies.set("admin_session", "1", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 60,
      path: "/",
    });
    return res;
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
