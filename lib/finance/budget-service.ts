import { prisma } from "../db/prisma";
import { BudgetInput } from "../validation/schemas";

export async function getBudgets(userId: string, period: string) {
  const budgets = await prisma.budget.findMany({
    where: { userId, period },
    include: { category: true },
  });

  // Calculate actual spending for each budget in this month
  const [year, month] = period.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const budgetProgress = await Promise.all(
    budgets.map(async (b) => {
      const where: any = {
        userId,
        type: "EXPENSE",
        date: { gte: startDate, lte: endDate },
      };

      if (b.categoryId) {
        where.categoryId = b.categoryId;
      }

      const aggregate = await prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      });

      const spent = aggregate._sum.amount || 0;
      const remaining = b.amount - spent;
      const percentage = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;

      return {
        ...b,
        spent,
        remaining,
        percentage,
      };
    })
  );

  return budgetProgress;
}

export async function upsertBudget(userId: string, data: BudgetInput) {
  const existing = await prisma.budget.findFirst({
    where: {
      userId,
      period: data.period,
      categoryId: data.categoryId || null,
    },
  });

  if (existing) {
    return await prisma.budget.update({
      where: { id: existing.id },
      data: { amount: data.amount },
      include: { category: true },
    });
  }

  return await prisma.budget.create({
    data: {
      userId,
      period: data.period,
      categoryId: data.categoryId || null,
      amount: data.amount,
    },
    include: { category: true },
  });
}

export async function deleteBudget(userId: string, budgetId: string) {
  return await prisma.budget.delete({
    where: { id: budgetId },
  });
}
