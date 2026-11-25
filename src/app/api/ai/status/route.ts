import { NextRequest, NextResponse } from "next/server";
import { checkGeminiStatus } from "@/lib/gemini/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const testGeneration = req.nextUrl.searchParams.get("testGeneration") === "true";
    const status = await checkGeminiStatus({ testGeneration });
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      {
        configured: false,
        connected: false,
        authVerified: false,
        generationTested: false,
        model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
        lastCheck: new Date().toISOString(),
        error: err?.message || "Internal server error checking AI status.",
      },
      { status: 500 }
    );
  }
}

