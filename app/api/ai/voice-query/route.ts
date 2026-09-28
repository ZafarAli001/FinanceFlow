import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { executeVoiceQuery } from "@/lib/ai/voice-query";
import { VoiceParsedCommandSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = VoiceParsedCommandSchema.safeParse(body.command);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query payload" }, { status: 400 });
    }

    const answer = await executeVoiceQuery(user.userId, parsed.data);
    return NextResponse.json({ answer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute query" }, { status: 500 });
  }
}
