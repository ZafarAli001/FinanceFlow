import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const [accounts, categories, transactions, budgets] = await Promise.all([
      prisma.account.findMany({ where: { userId: user.userId } }),
      prisma.category.findMany({ where: { userId: user.userId } }),
      prisma.transaction.findMany({
        where: { userId: user.userId },
        include: { account: true, category: true },
        orderBy: { date: "desc" },
      }),
      prisma.budget.findMany({ where: { userId: user.userId } }),
    ]);

    if (format === "csv") {
      const headers = ["Date", "Type", "Amount", "Currency", "Account", "Category", "Merchant", "Description", "Note"];
      const rows = transactions.map((t) => [
        t.date.toISOString().split("T")[0],
        t.type,
        t.amount,
        t.currency,
        `"${t.account.name.replace(/"/g, '""')}"`,
        `"${t.category?.name?.replace(/"/g, '""') || ''}"`,
        `"${(t.merchant || '').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="finance_backup_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      user: { email: user.email, name: user.name },
      accounts,
      categories,
      transactions,
      budgets,
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="finance_backup_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
