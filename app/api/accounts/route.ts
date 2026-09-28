import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAccounts, createAccount } from "@/lib/finance/account-service";
import { AccountSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await getAccounts(user.userId);
    return NextResponse.json({ accounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = AccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const account = await createAccount(user.userId, parsed.data);
    return NextResponse.json({ account });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
