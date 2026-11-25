import { NextRequest, NextResponse } from "next/server";
import { generateMoMFromTranscript, parseGeminiError } from "@/lib/gemini/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingId, transcriptText, meetingTitle, meetingDate, attendees } = body;

    if (!transcriptText || !transcriptText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Meeting transcript text is required to generate Minutes of Meeting.",
        },
        { status: 400 }
      );
    }

    const { mom, actionItems } = await generateMoMFromTranscript({
      transcriptText,
      meetingTitle: meetingTitle || "Executive Discussion",
      meetingDate,
      attendees,
    });

    mom.meetingId = meetingId || "";
    for (const act of actionItems) {
      act.meetingId = meetingId || "";
    }

    return NextResponse.json({
      success: true,
      mom,
      actionItems,
    });
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    const isConfigError = parsed.type === "invalid_key";
    return NextResponse.json(
      {
        success: false,
        error: parsed.error,
        isConfigError,
        errorType: parsed.type,
      },
      { status: parsed.statusCode }
    );
  }
}

