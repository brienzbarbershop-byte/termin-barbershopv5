import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export async function GET() {
  const token = randomUUID();
  const res = NextResponse.json({ token });
  res.cookies.set("csrf_token", token, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
    path: "/",
  });
  return res;
}
