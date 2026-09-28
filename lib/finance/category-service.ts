import { prisma } from "../db/prisma";
import { CategoryInput } from "../validation/schemas";

export async function getCategories(userId: string, type?: "EXPENSE" | "INCOME") {
  return await prisma.category.findMany({
    where: {
      userId,
      ...(type && { type }),
    },
    orderBy: [
      { isSystem: "desc" },
      { name: "asc" },
    ],
  });
}

export async function createCategory(userId: string, data: CategoryInput) {
  const existing = await prisma.category.findFirst({
    where: { userId, name: data.name, type: data.type },
  });

  if (existing) return existing;

  return await prisma.category.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      icon: data.icon || "Tag",
      color: data.color || "#3b82f6",
      isSystem: false,
    },
  });
}
