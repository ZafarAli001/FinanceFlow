import { cookies } from "next/headers";
import { verifyToken, TokenPayload } from "./jwt";
import { prisma } from "../db/prisma";
import bcrypt from "bcryptjs";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../utils/constants";

export const DEMO_USER_EMAIL = "demo@finance.app";
export const DEMO_USER_PASSWORD = "password123";

/**
 * Ensures a default demo user exists and initializes default categories and accounts if missing.
 */
export async function getOrCreateDemoUser() {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        name: "Alex Morgan",
        passwordHash,
        currency: "INR",
      },
    });

    // Create default accounts
    const hdfc = await prisma.account.create({
      data: {
        userId: user.id,
        name: "HDFC Bank",
        type: "BANK",
        openingBalance: 50000,
        currentBalance: 50000,
        currency: "INR",
        icon: "Building",
        color: "#3b82f6",
        isDefault: true,
      },
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        name: "Cash Wallet",
        type: "CASH",
        openingBalance: 5000,
        currentBalance: 5000,
        currency: "INR",
        icon: "Banknote",
        color: "#10b981",
        isDefault: false,
      },
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        name: "Credit Card",
        type: "CREDIT_CARD",
        openingBalance: 0,
        currentBalance: -2500,
        currency: "INR",
        icon: "CreditCard",
        color: "#f43f5e",
        isDefault: false,
      },
    });

    // Create default expense categories
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

    // Create default income categories
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

    // Add initial sample transactions so the dashboard looks rich and alive!
    const diningCategory = await prisma.category.findFirst({
      where: { userId: user.id, name: "Dining" },
    });
    const groceriesCategory = await prisma.category.findFirst({
      where: { userId: user.id, name: "Groceries" },
    });
    const salaryCategory = await prisma.category.findFirst({
      where: { userId: user.id, name: "Salary" },
    });

    // Sample Salary
    if (salaryCategory) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "INCOME",
          amount: 85000,
          accountId: hdfc.id,
          categoryId: salaryCategory.id,
          merchant: "Tech Corp Inc",
          description: "Monthly Salary",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Sample Expense
    if (diningCategory) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "EXPENSE",
          amount: 1250,
          accountId: hdfc.id,
          categoryId: diningCategory.id,
          merchant: "Italian Bistro",
          description: "Team Lunch",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (groceriesCategory) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "EXPENSE",
          amount: 3400,
          accountId: hdfc.id,
          categoryId: groceriesCategory.id,
          merchant: "SuperMart",
          description: "Weekly Groceries",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  return user;
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (token) {
      const payload = await verifyToken(token);
      if (payload) return payload;
    }

    // Fallback to demo user if no cookie present for immediate usage
    const demoUser = await getOrCreateDemoUser();
    return {
      userId: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
    };
  } catch (error) {
    // Return demo user if db fails or server context issue
    const demoUser = await getOrCreateDemoUser();
    return {
      userId: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
    };
  }
}
