import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { signToken } from "@/lib/auth/jwt";
import { LoginSchema } from "@/lib/validation/schemas";
import { getOrCreateDemoUser } from "@/lib/auth/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // Ensure demo user is available if using demo credentials
    await getOrCreateDemoUser();

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // 1. Direct password comparison (matches if client derived hash on localhost or if registered raw)
    let isValid = await bcrypt.compare(password, user.passwordHash);

    // 2. Cross-device fallback: When accessed over local network HTTP (e.g. mobile/tablet at http://192.168.x.x:3000),
    // browsers disable window.crypto.subtle because it's an insecure HTTP context.
    // The client sends the raw password. We derive the exact PBKDF2 hash on the server and check:
    if (!isValid) {
      try {
        const derived = crypto
          .pbkdf2Sync(password, `FinanceFlow:AuthSalt:${cleanEmail}`, 100000, 32, "sha256")
          .toString("hex");
        isValid = await bcrypt.compare(derived, user.passwordHash);
      } catch {}
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, currency: user.currency },
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
