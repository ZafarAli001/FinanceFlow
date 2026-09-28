import { prisma } from "../db/prisma";
import { AccountInput } from "../validation/schemas";

export async function getAccounts(userId: string) {
  return await prisma.account.findMany({
    where: { userId },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "asc" },
    ],
  });
}

export async function getAccountById(userId: string, accountId: string) {
  return await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
}

export async function createAccount(userId: string, data: AccountInput) {
  return await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      // Unset previous default account
      await tx.account.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first account for the user, if so make it default
    const count = await tx.account.count({ where: { userId } });
    const shouldBeDefault = data.isDefault || count === 0;

    return await tx.account.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        openingBalance: data.openingBalance,
        currentBalance: data.openingBalance,
        currency: data.currency || "INR",
        icon: data.icon || "Building",
        color: data.color || "#3b82f6",
        isDefault: shouldBeDefault,
      },
    });
  });
}

export async function updateAccount(
  userId: string,
  accountId: string,
  data: Partial<AccountInput> & { isArchived?: boolean }
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!existing) {
      throw new Error("Account not found");
    }

    if (data.isDefault) {
      await tx.account.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    let updatedBalance = existing.currentBalance;
    if (data.openingBalance !== undefined && data.openingBalance !== existing.openingBalance) {
      const delta = data.openingBalance - existing.openingBalance;
      updatedBalance += delta;
    }

    return await tx.account.update({
      where: { id: accountId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.openingBalance !== undefined && { openingBalance: data.openingBalance }),
        currentBalance: updatedBalance,
        ...(data.currency && { currency: data.currency }),
        ...(data.icon && { icon: data.icon }),
        ...(data.color && { color: data.color }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      },
    });
  });
}

export async function setDefaultAccount(userId: string, accountId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.account.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return await tx.account.update({
      where: { id: accountId },
      data: { isDefault: true },
    });
  });
}

export async function deleteAccount(userId: string, accountId: string) {
  const count = await prisma.transaction.count({
    where: {
      userId,
      OR: [
        { accountId },
        { sourceAccountId: accountId },
        { destinationAccountId: accountId },
      ],
    },
  });

  if (count > 0) {
    // Safely archive instead of breaking transaction integrity
    return await prisma.account.update({
      where: { id: accountId },
      data: { isArchived: true },
    });
  }

  return await prisma.account.delete({
    where: { id: accountId },
  });
}
