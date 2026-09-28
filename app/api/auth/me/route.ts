import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { id: true, name: true, email: true, currency: true },
  });

  return NextResponse.json({ user: dbUser });
}
