import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { getBudgets, upsertBudget, deleteBudget } from "@/lib/finance/budget-service";
import { BudgetSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);

    const budgets = await getBudgets(user.userId, period);
    return NextResponse.json({ budgets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = BudgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const budget = await upsertBudget(user.userId, parsed.data);
    return NextResponse.json({ budget });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Budget ID required" }, { status: 400 });

    await deleteBudget(user.userId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
