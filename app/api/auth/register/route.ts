import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { signToken } from "@/lib/auth/jwt";
import { RegisterSchema } from "@/lib/validation/schemas";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/utils/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password, currency } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    // If client was on mobile/network HTTP without window.crypto.subtle,
    // derive the standard PBKDF2 hash on the server so login works across all devices:
    let finalAuthPassword = password;
    if (!/^[a-f0-9]{64}$/i.test(password)) {
      finalAuthPassword = crypto
        .pbkdf2Sync(password, `FinanceFlow:AuthSalt:${cleanEmail}`, 100000, 32, "sha256")
        .toString("hex");
    }

    const passwordHash = await bcrypt.hash(finalAuthPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        currency,
      },
    });

    // Initialize default accounts
    await prisma.account.create({
      data: {
        userId: user.id,
        name: "Main Bank Account",
        type: "BANK",
        openingBalance: 0,
        currentBalance: 0,
        currency,
        icon: "Building",
        color: "#3b82f6",
        isDefault: true,
      },
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        name: "Cash",
        type: "CASH",
        openingBalance: 0,
        currentBalance: 0,
        currency,
        icon: "Banknote",
        color: "#10b981",
        isDefault: false,
      },
    });

    // Create default categories
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      await prisma.category.create({
        data: {
          userId: user.id,
          name: cat.name,
          type: "EXPENSE",
          icon: cat.icon,
          color: cat.color,
          isSystem: true,
        },
      });
    }

    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      await prisma.category.create({
        data: {
          userId: user.id,
          name: cat.name,
          type: "INCOME",
          icon: cat.icon,
          color: cat.color,
          isSystem: true,
        },
      });
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
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to register user" }, { status: 500 });
  }
}
