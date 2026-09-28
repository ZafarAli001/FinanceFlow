import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { getDashboardOverview, getFinancialAnalytics } from "@/lib/finance/analytics-service";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "overview";

    if (mode === "overview") {
      const data = await getDashboardOverview(user.userId);
      return NextResponse.json(data);
    }

    const range = searchParams.get("range") || "month";
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (range === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === "3months") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (range === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (searchParams.get("startDate") && searchParams.get("endDate")) {
      startDate = new Date(searchParams.get("startDate")!);
      endDate = new Date(searchParams.get("endDate")!);
    }

    const analytics = await getFinancialAnalytics(user.userId, startDate, endDate);
    return NextResponse.json(analytics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
