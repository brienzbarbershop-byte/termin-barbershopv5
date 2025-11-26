import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken, setAdminCookie } from "../../../../lib/auth";

export async function POST() {
  const c = await cookies();
  const raw = c.get("admin_session")?.value;
  const ok = verifyAdminToken(raw || null);
  if (!ok) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const res = NextResponse.json({ ok: true }, { status: 200 });
  setAdminCookie(res, 30 * 60);
  return res;
}
