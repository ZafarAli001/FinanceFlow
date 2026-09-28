import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const lastSyncedAt = searchParams.get("lastSyncedAt");

    const where: any = { userId: user.userId };
    if (lastSyncedAt) {
      where.updatedAt = { gte: new Date(lastSyncedAt) };
    }

    const [accounts, transactions, categories, budgets] = await Promise.all([
      prisma.account.findMany({
        where: { userId: user.userId, isArchived: false },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.transaction.findMany({
        where,
        include: {
          account: true,
          sourceAccount: true,
          destinationAccount: true,
          category: true,
        },
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.category.findMany({ where: { userId: user.userId } }),
      prisma.budget.findMany({ where: { userId: user.userId } }),
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      accounts,
      transactions,
      categories,
      budgets,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to pull cloud data" }, { status: 500 });
  }
}
