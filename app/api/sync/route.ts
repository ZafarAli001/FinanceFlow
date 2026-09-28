import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { createTransaction, updateTransaction, deleteTransaction } from "@/lib/finance/transaction-service";
import { TransactionSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // 1. Check Idempotency via clientId
    if (body.clientId && (!body.operationType || body.operationType === "CREATE")) {
      const existing = await prisma.transaction.findFirst({
        where: { userId: user.userId, clientId: body.clientId },
        include: { account: true, category: true },
      });

      if (existing) {
        return NextResponse.json({
          transaction: existing,
          status: "ALREADY_SYNCED",
          message: "Transaction already synced idempotently",
        });
      }
    }

    const operationType = body.operationType || "CREATE";

    if (operationType === "CREATE") {
      const parsed = TransactionSchema.safeParse(body.payload || body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const transaction = await createTransaction(user.userId, {
        ...parsed.data,
        clientId: body.clientId || parsed.data.clientId,
      });

      return NextResponse.json({ transaction, status: "SYNCED" });
    } else if (operationType === "UPDATE") {
      const recordId = body.recordId || body.payload?.id;
      if (!recordId) {
        return NextResponse.json({ error: "Record ID required for UPDATE operation" }, { status: 400 });
      }

      const transaction = await updateTransaction(user.userId, recordId, body.payload);
      return NextResponse.json({ transaction, status: "SYNCED" });
    } else if (operationType === "DELETE") {
      const recordId = body.recordId || body.payload?.id;
      if (!recordId) {
        return NextResponse.json({ error: "Record ID required for DELETE operation" }, { status: 400 });
      }

      await deleteTransaction(user.userId, recordId);
      return NextResponse.json({ success: true, status: "SYNCED" });
    }

    return NextResponse.json({ error: "Unsupported operation type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Cloud sync error" }, { status: 500 });
  }
}
