import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { parseVoiceTranscript, parseMultipleVoiceTranscripts } from "@/lib/ai/voice-parser";
import { VoiceCommandInputSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = VoiceCommandInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const commands = await parseMultipleVoiceTranscripts(
      user.userId,
      parsed.data.transcript,
      parsed.data.contextAccountId
    );

    return NextResponse.json({
      command: commands[0],
      commands,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process voice intent" }, { status: 500 });
  }
}
