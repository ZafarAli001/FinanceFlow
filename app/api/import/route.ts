import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (!body || typeof body !== "object" || !Array.isArray(body.accounts)) {
      return NextResponse.json({ error: "Invalid backup JSON file structure" }, { status: 400 });
    }

    const { accounts, categories, transactions, budgets } = body;
    let importedAccounts = 0;
    let importedTransactions = 0;

    await prisma.$transaction(async (tx) => {
      // Map old account ID to new account ID
      const accountIdMap = new Map<string, string>();

      for (const acc of accounts) {
        const existing = await tx.account.findFirst({
          where: { userId: user.userId, name: acc.name },
        });

        if (existing) {
          accountIdMap.set(acc.id, existing.id);
        } else {
          const created = await tx.account.create({
            data: {
              userId: user.userId,
              name: acc.name,
              type: acc.type,
              openingBalance: acc.openingBalance || 0,
              currentBalance: acc.currentBalance || 0,
              currency: acc.currency || "INR",
              icon: acc.icon,
              color: acc.color,
              isDefault: false,
            },
          });
          accountIdMap.set(acc.id, created.id);
          importedAccounts++;
        }
      }

      // Map categories
      const categoryIdMap = new Map<string, string>();
      if (Array.isArray(categories)) {
        for (const cat of categories) {
          const existingCat = await tx.category.findFirst({
            where: { userId: user.userId, name: cat.name, type: cat.type },
          });

          if (existingCat) {
            categoryIdMap.set(cat.id, existingCat.id);
          } else {
            const createdCat = await tx.category.create({
              data: {
                userId: user.userId,
                name: cat.name,
                type: cat.type,
                icon: cat.icon,
                color: cat.color,
              },
            });
            categoryIdMap.set(cat.id, createdCat.id);
          }
        }
      }

      // Import transactions
      if (Array.isArray(transactions)) {
        for (const t of transactions) {
          const targetAccountId = accountIdMap.get(t.accountId) || accountIdMap.values().next().value;
          if (!targetAccountId) continue;

          const targetCategoryId = t.categoryId ? categoryIdMap.get(t.categoryId) || null : null;

          await tx.transaction.create({
            data: {
              userId: user.userId,
              type: t.type,
              amount: t.amount,
              currency: t.currency || "INR",
              accountId: targetAccountId,
              sourceAccountId: t.sourceAccountId ? accountIdMap.get(t.sourceAccountId) || null : null,
              destinationAccountId: t.destinationAccountId ? accountIdMap.get(t.destinationAccountId) || null : null,
              categoryId: targetCategoryId,
              merchant: t.merchant,
              description: t.description,
              note: t.note,
              date: new Date(t.date),
            },
          });
          importedTransactions++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      importedAccounts,
      importedTransactions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to restore data" }, { status: 500 });
  }
}
