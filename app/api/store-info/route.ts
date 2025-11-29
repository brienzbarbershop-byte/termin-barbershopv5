import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const config = await prisma.storeConfig.findFirst();
    const email = process.env.ADMIN_CONTACT_EMAIL ?? "kontakt@barbershop-brienz.ch";
    return NextResponse.json({ email, hasConfig: !!config }, { status: 200 });
  } catch {
    const email = process.env.ADMIN_CONTACT_EMAIL ?? "kontakt@barbershop-brienz.ch";
    return NextResponse.json({ email, hasConfig: false }, { status: 200 });
  }
}
