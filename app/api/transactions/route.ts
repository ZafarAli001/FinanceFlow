import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { getTransactions, createTransaction } from "@/lib/finance/transaction-service";
import { TransactionSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as any;
    const accountId = searchParams.get("accountId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!) : 0;

    const result = await getTransactions(user.userId, {
      type,
      accountId,
      categoryId,
      startDate,
      endDate,
      search,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = TransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const transaction = await createTransaction(user.userId, parsed.data);
    return NextResponse.json({ transaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
