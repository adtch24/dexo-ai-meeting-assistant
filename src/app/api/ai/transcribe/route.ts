import { NextRequest, NextResponse } from "next/server";
import { transcribeAudioBuffer, parseGeminiError, cleanAudioMimeType } from "@/lib/gemini/client";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 minutes for multimodal audio ingestion & transcription

// 25MB limit for inline processing
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    const rawMime = (formData.get("mimeType") as string) || file?.type || "audio/webm";
    const mimeType = cleanAudioMimeType(rawMime);
    const meetingTitle = (formData.get("meetingTitle") as string) || "Recorded Meeting";
    const meetingId = (formData.get("meetingId") as string) || "";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No audio file payload received." },
        { status: 400 }
      );
    }

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Audio size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 25MB for direct inline processing.`,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "Audio file buffer is empty." },
        { status: 400 }
      );
    }

    const transcript = await transcribeAudioBuffer(buffer, mimeType, meetingTitle);
    transcript.meetingId = meetingId;

    return NextResponse.json({
      success: true,
      transcript,
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

