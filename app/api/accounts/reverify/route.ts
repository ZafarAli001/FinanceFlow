import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await prisma.account.findMany({
      where: { userId: user.userId },
    });

    const reconciledAccounts = [];

    for (const account of accounts) {
      // 1. Calculate sum of incomes credited to this account
      const incomeSum = await prisma.transaction.aggregate({
        where: { userId: user.userId, accountId: account.id, type: "INCOME" },
        _sum: { amount: true },
      });

      // 2. Calculate sum of expenses debited from this account
      const expenseSum = await prisma.transaction.aggregate({
        where: { userId: user.userId, accountId: account.id, type: "EXPENSE" },
        _sum: { amount: true },
      });

      // 3. Calculate sum of incoming transfers
      const incomingTransfers = await prisma.transaction.aggregate({
        where: { userId: user.userId, destinationAccountId: account.id, type: "TRANSFER" },
        _sum: { amount: true },
      });

      // 4. Calculate sum of outgoing transfers
      const outgoingTransfers = await prisma.transaction.aggregate({
        where: { userId: user.userId, sourceAccountId: account.id, type: "TRANSFER" },
        _sum: { amount: true },
      });

      const totalIncome = incomeSum._sum.amount || 0;
      const totalExpense = expenseSum._sum.amount || 0;
      const totalIncomingTransfer = incomingTransfers._sum.amount || 0;
      const totalOutgoingTransfer = outgoingTransfers._sum.amount || 0;

      const expectedBalance =
        account.openingBalance + totalIncome - totalExpense + totalIncomingTransfer - totalOutgoingTransfer;

      if (Math.abs(account.currentBalance - expectedBalance) > 0.001) {
        // Balance discrepancy detected -> Reconcile atomically!
        const updated = await prisma.account.update({
          where: { id: account.id },
          data: { currentBalance: expectedBalance },
        });
        reconciledAccounts.push({
          id: account.id,
          name: account.name,
          oldBalance: account.currentBalance,
          reconciledBalance: expectedBalance,
        });
      }
    }

    return NextResponse.json({
      success: true,
      reconciledCount: reconciledAccounts.length,
      reconciledAccounts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Reverification failed" }, { status: 500 });
  }
}
