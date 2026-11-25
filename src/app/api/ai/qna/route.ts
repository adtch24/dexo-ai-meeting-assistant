import { NextRequest, NextResponse } from "next/server";
import { answerMeetingQnA, parseGeminiError } from "@/lib/gemini/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingId, question, transcriptText, meetingTitle } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { success: false, error: "Question parameter cannot be empty." },
        { status: 400 }
      );
    }

    if (!transcriptText || !transcriptText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Meeting transcript is missing. Q&A must be grounded in actual meeting content.",
        },
        { status: 400 }
      );
    }

    const result = await answerMeetingQnA({
      transcriptText,
      question: question.trim(),
      meetingTitle: meetingTitle || "Meeting",
    });

    return NextResponse.json({
      success: true,
      answer: result.answer,
      citations: result.citations || [],
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

