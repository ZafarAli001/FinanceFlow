import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { updateAccount, deleteAccount, setDefaultAccount } from "@/lib/finance/account-service";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    if (body.action === "setDefault") {
      const account = await setDefaultAccount(user.userId, id);
      return NextResponse.json({ account });
    }

    const account = await updateAccount(user.userId, id, body);
    return NextResponse.json({ account });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await deleteAccount(user.userId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
