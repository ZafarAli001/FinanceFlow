import { prisma } from "../db/prisma";
import { formatCurrency } from "../utils/formatters";
import { VoiceParsedCommand } from "../validation/schemas";

export async function executeVoiceQuery(
  userId: string,
  command: VoiceParsedCommand
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const userCurrency = user?.currency || "INR";

  if (command.intent === "QUERY_BALANCE") {
    if (command.account) {
      const acc = await prisma.account.findFirst({
        where: { userId, name: { contains: command.account.toLowerCase() } },
      });
      if (acc) {
        return `Your current balance for ${acc.name} is ${formatCurrency(acc.currentBalance, acc.currency)}.`;
      } else {
        return `Sorry, I couldn't find an account matching "${command.account}".`;
      }
    } else {
      const accounts = await prisma.account.findMany({
        where: { userId, isArchived: false },
      });
      const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
      return `Your overall total balance across ${accounts.length} accounts is ${formatCurrency(totalBalance, userCurrency)}.`;
    }
  }

  if (command.intent === "QUERY_EXPENSES") {
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    let periodName = "this month";

    if (command.date === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      periodName = "today";
    }

    const where: any = {
      userId,
      type: "EXPENSE",
      date: { gte: startDate },
    };

    if (command.category) {
      const cat = await prisma.category.findFirst({
        where: { userId, name: { contains: command.category } },
      });
      if (cat) where.categoryId = cat.id;
    }

    const aggregate = await prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
    });

    const total = aggregate._sum.amount || 0;
    const catLabel = command.category ? ` on ${command.category}` : "";
    return `You have spent ${formatCurrency(total, userCurrency)}${catLabel} ${periodName}.`;
  }

  if (command.intent === "QUERY_ANALYTICS" && command.description === "highest_expense") {
    const highest = await prisma.transaction.findFirst({
      where: { userId, type: "EXPENSE" },
      orderBy: { amount: "desc" },
      include: { category: true, account: true },
    });

    if (highest) {
      const categoryName = highest.category ? highest.category.name : "Expense";
      return `Your highest recorded expense was ${formatCurrency(highest.amount, highest.currency)} for ${highest.merchant || categoryName} on ${highest.account.name}.`;
    }
    return "You have no recorded expenses yet.";
  }

  return "I parsed your query, but could not retrieve matching financial data.";
}
