import { prisma } from "../db/prisma";
import { TransactionInput } from "../validation/schemas";

export interface GetTransactionsFilter {
  type?: "EXPENSE" | "INCOME" | "TRANSFER";
  accountId?: string;
  categoryId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  search?: string;
  limit?: number;
  skip?: number;
}

export async function getTransactions(userId: string, filter: GetTransactionsFilter = {}) {
  const where: any = { userId };

  if (filter.type) where.type = filter.type;
  if (filter.accountId) {
    where.OR = [
      { accountId: filter.accountId },
      { sourceAccountId: filter.accountId },
      { destinationAccountId: filter.accountId },
    ];
  }
  if (filter.categoryId) where.categoryId = filter.categoryId;

  if (filter.startDate || filter.endDate) {
    where.date = {};
    if (filter.startDate) where.date.gte = new Date(filter.startDate);
    if (filter.endDate) where.date.lte = new Date(filter.endDate);
  }

  if (filter.search) {
    const searchLower = filter.search.trim();
    where.AND = [
      {
        OR: [
          { merchant: { contains: searchLower } },
          { description: { contains: searchLower } },
          { note: { contains: searchLower } },
          { category: { name: { contains: searchLower } } },
          { account: { name: { contains: searchLower } } },
        ],
      },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        account: true,
        sourceAccount: true,
        destinationAccount: true,
        category: true,
      },
      orderBy: { date: "desc" },
      take: filter.limit || 50,
      skip: filter.skip || 0,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total };
}

export async function createTransaction(userId: string, data: TransactionInput) {
  return await prisma.$transaction(async (tx) => {
    // 0. Idempotency / duplicate entry conflict check
    if (data.clientId) {
      const existingByClientId = await tx.transaction.findFirst({
        where: { userId, clientId: data.clientId },
        include: {
          account: true,
          sourceAccount: true,
          destinationAccount: true,
          category: true,
        },
      });
      if (existingByClientId) {
        return existingByClientId;
      }
    }

    // Check for rapid accidental double-entry (identical transaction within 3 seconds)
    const recentDuplicate = await tx.transaction.findFirst({
      where: {
        userId,
        type: data.type,
        amount: data.amount,
        accountId: data.accountId || undefined,
        categoryId: data.categoryId || undefined,
        description: data.description || undefined,
        createdAt: {
          gte: new Date(Date.now() - 3000),
        },
      },
      include: {
        account: true,
        sourceAccount: true,
        destinationAccount: true,
        category: true,
      },
    });
    if (recentDuplicate) {
      return recentDuplicate;
    }

    // 1. Resolve Account
    let accountId = data.accountId;
    if (!accountId) {
      const defaultAccount = await tx.account.findFirst({
        where: { userId, isDefault: true },
      });
      if (!defaultAccount) {
        const anyAccount = await tx.account.findFirst({ where: { userId } });
        if (!anyAccount) throw new Error("No account available for user");
        accountId = anyAccount.id;
      } else {
        accountId = defaultAccount.id;
      }
    }

    // 2. Perform financial balance modification atomically
    if (data.type === "EXPENSE") {
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { decrement: data.amount } },
      });
    } else if (data.type === "INCOME") {
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: data.amount } },
      });
    } else if (data.type === "TRANSFER") {
      if (!data.sourceAccountId || !data.destinationAccountId) {
        throw new Error("Source and Destination accounts required for transfer");
      }
      if (data.sourceAccountId === data.destinationAccountId) {
        throw new Error("Source and Destination account cannot be the same");
      }

      await tx.account.update({
        where: { id: data.sourceAccountId },
        data: { currentBalance: { decrement: data.amount } },
      });
      await tx.account.update({
        where: { id: data.destinationAccountId },
        data: { currentBalance: { increment: data.amount } },
      });
    }

    // 3. Create Transaction Record
    return await tx.transaction.create({
      data: {
        userId,
        type: data.type,
        amount: data.amount,
        currency: data.currency || "INR",
        accountId,
        sourceAccountId: data.type === "TRANSFER" ? data.sourceAccountId : null,
        destinationAccountId: data.type === "TRANSFER" ? data.destinationAccountId : null,
        categoryId: data.categoryId || null,
        merchant: data.merchant || null,
        description: data.description || null,
        note: data.note || null,
        date: data.date ? new Date(data.date) : new Date(),
        time: data.time || null,
        tags: data.tags || null,
        clientId: data.clientId || null,
        syncStatus: "SYNCED",
      },
      include: {
        account: true,
        sourceAccount: true,
        destinationAccount: true,
        category: true,
      },
    });
  });
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  data: Partial<TransactionInput>
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!existing) throw new Error("Transaction not found");

    // Revert existing financial impact
    if (existing.type === "EXPENSE") {
      await tx.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { increment: existing.amount } },
      });
    } else if (existing.type === "INCOME") {
      await tx.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { decrement: existing.amount } },
      });
    } else if (existing.type === "TRANSFER" && existing.sourceAccountId && existing.destinationAccountId) {
      await tx.account.update({
        where: { id: existing.sourceAccountId },
        data: { currentBalance: { increment: existing.amount } },
      });
      await tx.account.update({
        where: { id: existing.destinationAccountId },
        data: { currentBalance: { decrement: existing.amount } },
      });
    }

    // Apply new financial impact
    const type = data.type || existing.type;
    const amount = data.amount !== undefined ? data.amount : existing.amount;
    const accountId = data.accountId || existing.accountId;
    const sourceAccountId = data.sourceAccountId || existing.sourceAccountId;
    const destinationAccountId = data.destinationAccountId || existing.destinationAccountId;

    if (type === "EXPENSE") {
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { decrement: amount } },
      });
    } else if (type === "INCOME") {
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: amount } },
      });
    } else if (type === "TRANSFER" && sourceAccountId && destinationAccountId) {
      await tx.account.update({
        where: { id: sourceAccountId },
        data: { currentBalance: { decrement: amount } },
      });
      await tx.account.update({
        where: { id: destinationAccountId },
        data: { currentBalance: { increment: amount } },
      });
    }

    return await tx.transaction.update({
      where: { id: transactionId },
      data: {
        type,
        amount,
        accountId,
        sourceAccountId: type === "TRANSFER" ? sourceAccountId : null,
        destinationAccountId: type === "TRANSFER" ? destinationAccountId : null,
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.merchant !== undefined && { merchant: data.merchant }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.time !== undefined && { time: data.time }),
        ...(data.tags !== undefined && { tags: data.tags }),
      },
      include: {
        account: true,
        sourceAccount: true,
        destinationAccount: true,
        category: true,
      },
    });
  });
}

export async function deleteTransaction(userId: string, transactionId: string) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!existing) throw new Error("Transaction not found");

    // Revert financial impact
    if (existing.type === "EXPENSE") {
      await tx.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { increment: existing.amount } },
      });
    } else if (existing.type === "INCOME") {
      await tx.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { decrement: existing.amount } },
      });
    } else if (existing.type === "TRANSFER" && existing.sourceAccountId && existing.destinationAccountId) {
      await tx.account.update({
        where: { id: existing.sourceAccountId },
        data: { currentBalance: { increment: existing.amount } },
      });
      await tx.account.update({
        where: { id: existing.destinationAccountId },
        data: { currentBalance: { decrement: existing.amount } },
      });
    }

    return await tx.transaction.delete({
      where: { id: transactionId },
    });
  });
}
