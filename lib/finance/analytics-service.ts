import { prisma } from "../db/prisma";

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export async function getDashboardOverview(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId, isArchived: false },
  });

  const totalBalance = accounts.reduce((acc, a) => acc + a.currentBalance, 0);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Today's expenses
  const todayExpenseAggregate = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: startOfDay },
    },
    _sum: { amount: true },
  });

  // Current Month Income & Expenses
  const monthIncomeAggregate = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "INCOME",
      date: { gte: startOfMonth },
    },
    _sum: { amount: true },
  });

  const monthExpenseAggregate = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: startOfMonth },
    },
    _sum: { amount: true },
  });

  const totalIncome = monthIncomeAggregate._sum.amount || 0;
  const totalExpense = monthExpenseAggregate._sum.amount || 0;
  const netCashFlow = totalIncome - totalExpense;
  const todayExpense = todayExpenseAggregate._sum.amount || 0;

  // Recent 10 transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    include: {
      account: true,
      sourceAccount: true,
      destinationAccount: true,
      category: true,
    },
    orderBy: { date: "desc" },
    take: 10,
  });

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    netCashFlow,
    todayExpense,
    accounts,
    recentTransactions,
  };
}

export async function getFinancialAnalytics(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const where = {
    userId,
    date: { gte: startDate, lte: endDate },
  };

  // Spending by Category
  const categoryExpenses = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { ...where, type: "EXPENSE" },
    _sum: { amount: true },
  });

  const categories = await prisma.category.findMany({
    where: { userId },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const spendingByCategory = categoryExpenses
    .map((item) => {
      const cat = item.categoryId ? categoryMap.get(item.categoryId) : null;
      return {
        categoryId: item.categoryId,
        name: cat ? cat.name : "Uncategorized",
        color: cat ? cat.color : "#94a3b8",
        amount: item._sum.amount || 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Spending by Account
  const accountExpenses = await prisma.transaction.groupBy({
    by: ["accountId"],
    where: { ...where, type: "EXPENSE" },
    _sum: { amount: true },
  });

  const accounts = await prisma.account.findMany({
    where: { userId },
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const spendingByAccount = accountExpenses.map((item) => {
    const acc = accountMap.get(item.accountId);
    return {
      accountId: item.accountId,
      name: acc ? acc.name : "Unknown",
      color: acc ? acc.color : "#3b82f6",
      amount: item._sum.amount || 0,
    };
  });

  // Timeline Trend (Group by day)
  const transactions = await prisma.transaction.findMany({
    where,
    select: { type: true, amount: true, date: true },
    orderBy: { date: "asc" },
  });

  const trendMap = new Map<string, { date: string; income: number; expense: number }>();

  transactions.forEach((tx) => {
    const dayStr = tx.date.toISOString().split("T")[0];
    if (!trendMap.has(dayStr)) {
      trendMap.set(dayStr, { date: dayStr, income: 0, expense: 0 });
    }
    const record = trendMap.get(dayStr)!;
    if (tx.type === "INCOME") record.income += tx.amount;
    if (tx.type === "EXPENSE") record.expense += tx.amount;
  });

  const trendData = Array.from(trendMap.values());

  const totalExpense = spendingByCategory.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const highestExpense = await prisma.transaction.findFirst({
    where: { ...where, type: "EXPENSE" },
    orderBy: { amount: "desc" },
    include: { category: true, account: true },
  });

  return {
    totalExpense,
    totalIncome,
    netCashFlow: totalIncome - totalExpense,
    spendingByCategory,
    spendingByAccount,
    trendData,
    highestExpense,
  };
}
