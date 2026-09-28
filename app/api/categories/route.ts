import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { getCategories, createCategory } from "@/lib/finance/category-service";
import { CategorySchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as any;

    const categories = await getCategories(user.userId, type);
    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const category = await createCategory(user.userId, parsed.data);
    return NextResponse.json({ category });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
