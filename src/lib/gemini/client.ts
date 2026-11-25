import { GoogleGenAI } from "@google/genai";
import {
  Transcript,
  TranscriptSegment,
  MoMDocument,
  ActionItem,
  Decision,
} from "@/lib/types";

/**
 * Return configured Gemini client or throw clear error.
 * API key is accessed exclusively server-side from process.env.GEMINI_API_KEY.
 * Allows custom timeout configuration based on task (audio transcription vs quick check).
 */
export function getGeminiClient(options?: { timeoutMs?: number }): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server. Please add your API key to .env.local to enable AI transcription and MoM generation."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: options?.timeoutMs ?? 60000,
      retryOptions: {
        attempts: 1, // Do not repeatedly retry daily quota exhaustion or transient gateway errors
      },
    },
  });
}

export const RELIABLE_FALLBACK_MODEL = "gemini-3.1-flash-lite";

export const DEFAULT_GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";

/**
 * Executes generateContent with resilient fallback.
 * If the configured primary model encounters 503 UNAVAILABLE or 504 DEADLINE_EXCEEDED,
 * it immediately executes on the responsive fallback model to prevent workflow timeouts.
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  params: any
) {
  try {
    return await ai.models.generateContent({
      ...params,
      model: primaryModel,
    });
  } catch (err: any) {
    const isGatewayError =
      err?.status === 503 ||
      err?.status === 504 ||
      String(err?.message || "").includes("DEADLINE_EXCEEDED") ||
      String(err?.message || "").includes("UNAVAILABLE") ||
      String(err?.message || "").includes("high demand") ||
      String(err?.message || "").includes("Deadline expired");

    if (isGatewayError && primaryModel !== RELIABLE_FALLBACK_MODEL) {
      console.warn(
        `[Dexo AI Resilience] Model ${primaryModel} failed with upstream status ${err?.status || "504"}. Rescuing with responsive fallback ${RELIABLE_FALLBACK_MODEL}...`
      );
      return await ai.models.generateContent({
        ...params,
        model: RELIABLE_FALLBACK_MODEL,
      });
    }
    throw err;
  }
}

export interface ParsedGeminiError {
  type: "quota" | "timeout" | "app_timeout" | "unavailable" | "invalid_key" | "not_found" | "unknown";
  error: string;
  statusCode: number;
  retryable: boolean;
}

/**
 * Normalizes audio MIME types to canonical formats accepted by Google GenAI.
 * Strips codecs parameters (e.g. 'audio/webm;codecs=opus' -> 'audio/webm').
 */
export function cleanAudioMimeType(rawMime?: string): string {
  if (!rawMime) return "audio/webm";
  const lower = rawMime.toLowerCase().trim();
  const base = lower.split(";")[0].trim();

  if (base.includes("webm")) return "audio/webm";
  if (base.includes("mp3") || base.includes("mpeg")) return "audio/mp3";
  if (base.includes("wav") || base.includes("wave")) return "audio/wav";
  if (base.includes("ogg")) return "audio/ogg";
  if (base.includes("aac")) return "audio/aac";
  if (base.includes("mp4") || base.includes("m4a")) return "audio/mp4";
  if (base.includes("flac")) return "audio/flac";

  return base || "audio/webm";
}

/**
 * Accurately parse and categorize Google Gemini errors,
 * cleanly distinguishing application timeouts from Google upstream gateway responses.
 */
export function parseGeminiError(err: any): ParsedGeminiError {
  const rawMsg = err?.message || String(err);
  const clean = rawMsg.replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]");

  let msg = clean;
  let code = err?.status || err?.code;

  // Unpack nested or double-nested JSON error objects from Google API / GenAI SDK
  try {
    const outer = JSON.parse(clean);
    if (outer?.error) {
      if (typeof outer.error === "string") {
        try {
          const inner = JSON.parse(outer.error);
          if (inner?.error?.message) {
            msg = inner.error.message;
            code = inner.error.code || code;
          }
        } catch {
          msg = outer.error;
        }
      } else if (outer.error.message) {
        msg = outer.error.message;
        code = outer.error.code || code;
        try {
          const inner = JSON.parse(msg);
          if (inner?.error?.message) {
            msg = inner.error.message;
            code = inner.error.code || code;
          }
        } catch {}
      }
    }
  } catch {}

  const lower = (msg + " " + clean).toLowerCase();

  // 1. Quota / Rate limit error (HTTP 429)
  if (
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate-limits") ||
    lower.includes("free_tier_requests") ||
    code === 429
  ) {
    return {
      type: "quota",
      statusCode: 429,
      retryable: false,
      error:
        "Quota Limit Exceeded (HTTP 429 RESOURCE_EXHAUSTED): Daily Free Tier request limit reached on Google AI Studio. Quota resets daily, or you can attach a billing account in Google AI Studio to increase rate limits.",
    };
  }

  // 2. Application-side Timeout (AbortError / client fetch timeout)
  // Distinguish client-side timeout from Google's upstream 504 gateway response!
  if (
    err?.name === "AbortError" ||
    lower.includes("operation was aborted") ||
    lower.includes("user aborted") ||
    lower.includes("request was aborted")
  ) {
    return {
      type: "app_timeout",
      statusCode: 504,
      retryable: true,
      error:
        "Application Request Timeout: The audio transcription request exceeded the client timeout while awaiting Google Gemini. Your audio recording is safely preserved in local storage. You can retry the transcription.",
    };
  }

  // 3. Upstream Google Gateway Timeout (HTTP 504)
  if (
    lower.includes("deadline_exceeded") ||
    lower.includes("deadline expired") ||
    code === 504
  ) {
    return {
      type: "timeout",
      statusCode: 504,
      retryable: true,
      error:
        "Google Gateway Timeout (HTTP 504 DEADLINE_EXCEEDED): Google Gemini API gateway deadline expired before the operation could complete on Google's servers. High server load is temporary; please retry.",
    };
  }

  // 4. Upstream Google Service Unavailable / High Demand (HTTP 503)
  if (
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    code === 503
  ) {
    return {
      type: "unavailable",
      statusCode: 503,
      retryable: true,
      error:
        "Model High Demand (HTTP 503 UNAVAILABLE): Gemini 3.8 Flash is currently experiencing high demand on Google's servers. Spikes are temporary; please retry in a few moments.",
    };
  }

  // 5. Invalid API Key (HTTP 401 / 400)
  if (
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    code === 400 ||
    code === 401
  ) {
    return {
      type: "invalid_key",
      statusCode: 401,
      retryable: false,
      error:
        "Invalid API Key (HTTP 401 API_KEY_INVALID): The provided GEMINI_API_KEY was rejected by Google. Please check your .env.local file.",
    };
  }

  // 6. Model Not Found / Unavailable (HTTP 404)
  if (lower.includes("not_found") || code === 404) {
    return {
      type: "not_found",
      statusCode: 404,
      retryable: false,
      error:
        "Model Not Found (HTTP 404 NOT_FOUND): The configured model is unavailable or deprecated.",
    };
  }

  return {
    type: "unknown",
    statusCode: typeof code === "number" ? code : 500,
    retryable: true,
    error: msg || "Unknown error connecting to Gemini API.",
  };
}

export interface AIStatusResponse {
  configured: boolean;
  connected: boolean;
  authVerified: boolean;
  generationTested?: boolean;
  generationStatus?: "ready" | "quota_exhausted" | "high_demand" | "timeout" | "untested" | "error";
  model: string;
  lastCheck: string;
  error?: string;
}

/**
 * Safe server-side connectivity check without exposing keys.
 * By default, performs model metadata check to verify API key and model availability
 * WITHOUT consuming valuable generation quota on routine page loads.
 */
export async function checkGeminiStatus(options?: {
  testGeneration?: boolean;
}): Promise<AIStatusResponse> {
  const model = DEFAULT_GEMINI_MODEL;
  const now = new Date().toISOString();
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return {
      configured: false,
      connected: false,
      authVerified: false,
      generationTested: false,
      model,
      lastCheck: now,
      error: "GEMINI_API_KEY environment variable is not configured in .env.local.",
    };
  }

  try {
    const ai = getGeminiClient();

    // Step 1: Probe model metadata. This authenticates the API key and verifies model availability
    // with Google's servers in ~700ms WITHOUT consuming any generation quota.
    await ai.models.get({ model });

    // If routine check (testGeneration is false/omitted), return successful handshake
    // to preserve the user's daily free tier quota!
    if (!options?.testGeneration) {
      return {
        configured: true,
        connected: true,
        authVerified: true,
        generationTested: false,
        generationStatus: "untested",
        model,
        lastCheck: now,
      };
    }

    // Step 2: Only if testGeneration was explicitly requested by user:
    try {
      const response = await generateContentWithFallback(ai, model, {
        contents: "Ping. Reply with pong.",
      });

      if (response && response.text) {
        return {
          configured: true,
          connected: true,
          authVerified: true,
          generationTested: true,
          generationStatus: "ready",
          model,
          lastCheck: now,
        };
      }
    } catch (genErr: any) {
      const parsedGen = parseGeminiError(genErr);
      return {
        configured: true,
        connected: false,
        authVerified: true,
        generationTested: true,
        generationStatus:
          parsedGen.type === "quota"
            ? "quota_exhausted"
            : parsedGen.type === "unavailable"
            ? "high_demand"
            : parsedGen.type === "timeout"
            ? "timeout"
            : "error",
        model,
        lastCheck: now,
        error: parsedGen.error,
      };
    }

    return {
      configured: true,
      connected: false,
      authVerified: true,
      generationTested: true,
      generationStatus: "error",
      model,
      lastCheck: now,
      error: "No response text received from Gemini API.",
    };
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    return {
      configured: true,
      connected: false,
      authVerified: false,
      generationTested: false,
      model,
      lastCheck: now,
      error: parsed.error,
    };
  }
}

/**
 * Transcribe meeting audio buffer using Gemini 3.8 Flash.
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimeType: string,
  meetingTitle?: string
): Promise<Transcript> {
  // 120-second timeout to allow base64 upload, acoustic decoding, and speech transcription
  const ai = getGeminiClient({ timeoutMs: 120000 });
  const model = DEFAULT_GEMINI_MODEL;

  const validMime = cleanAudioMimeType(mimeType);
  const base64Audio = buffer.toString("base64");

  const prompt = `You are a world-class speech-to-text acoustic transcription system for executive meetings.
Meeting Title: "${meetingTitle || "Audio Discussion"}"

Task:
1. Listen carefully to the entire audio recording.
2. Transcribe the conversation VERBATIM. Do not summarize or skip remarks.
3. Identify distinct speakers. Use real spoken names if participants introduce themselves or address each other by name (e.g., "Alex", "Dr. Sarah", "Marcus"); otherwise use "Speaker 1", "Speaker 2", etc.
4. Segment the transcript by speaker turns and natural pauses with accurate approximate timestamps (timestampMs and formatted MM:SS).
5. Detect the spoken language.
6. Return a valid JSON object matching the exact schema below:

{
  "rawText": "Complete continuous verbatim transcript text...",
  "language": "en-US",
  "detectedSpeakers": ["Speaker 1", "Speaker 2"],
  "durationSeconds": 120,
  "segments": [
    {
      "id": "seg_1",
      "speakerName": "Speaker 1",
      "speakerRole": "Speaker",
      "timestampMs": 0,
      "startTimeFormatted": "00:00",
      "text": "Verbatim words spoken in this segment..."
    }
  ]
}`;

  const response = await generateContentWithFallback(ai, model, {
    contents: [
      {
        inlineData: {
          mimeType: validMime,
          data: base64Audio,
        },
      },
      {
        text: prompt,
      },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1, // Low temperature for high fidelity verbatim transcription
    },
  });

  const rawJson = response.text;
  if (!rawJson) {
    throw new Error("Gemini returned empty transcription output.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    // Attempt fallback clean-up if markdown fences were included
    const cleaned = rawJson.replace(/```json\n?|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  const segments: TranscriptSegment[] = (parsed.segments || []).map(
    (seg: any, idx: number) => ({
      id: seg.id || `seg_${idx + 1}`,
      speakerName: seg.speakerName || `Speaker ${idx + 1}`,
      speakerRole: seg.speakerRole,
      timestampMs: typeof seg.timestampMs === "number" ? seg.timestampMs : idx * 15000,
      startTimeFormatted: seg.startTimeFormatted || "00:00",
      text: seg.text || "",
      confidence: typeof seg.confidence === "number" ? seg.confidence : 0.95,
    })
  );

  const rawText =
    parsed.rawText || segments.map((s) => `${s.speakerName}: ${s.text}`).join("\n\n");
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;

  return {
    id: `tr_${Date.now()}`,
    meetingId: "",
    rawText,
    segments,
    language: parsed.language || "en-US",
    detectedSpeakers: parsed.detectedSpeakers || Array.from(new Set(segments.map((s) => s.speakerName))),
    durationSeconds: parsed.durationSeconds || Math.max(1, Math.round(segments.length * 10)),
    wordCount,
  };
}

/**
 * Generate Structured Minutes of Meeting (MoM) from transcript using Gemini 3.8 Flash.
 * Enforces zero-hallucination rules:
 * - Never invent decisions not agreed on.
 * - Never invent attendees not in transcript.
 * - Never invent action item owners or deadlines.
 */
export async function generateMoMFromTranscript(params: {
  transcriptText: string;
  meetingTitle: string;
  meetingDate?: string;
  attendees?: string[];
}): Promise<{ mom: MoMDocument; actionItems: ActionItem[] }> {
  const ai = getGeminiClient({ timeoutMs: 60000 });
  const model = DEFAULT_GEMINI_MODEL;

  const dateStr =
    params.meetingDate ||
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const prompt = `You are an elite executive meeting intelligence system operating under strict ZERO-HALLUCINATION rules.
Analyze this meeting transcript and produce comprehensive, structured Minutes of Meeting (MoM).

MEETING METADATA:
- Title: "${params.meetingTitle}"
- Date: "${dateStr}"
- Known Attendees: ${params.attendees && params.attendees.length > 0 ? params.attendees.join(", ") : "Infer strictly from speakers in transcript"}

TRANSCRIPT CONTENT:
"""
${params.transcriptText}
"""

ZERO-HALLUCINATION RULES:
1. Distinguish confirmed agreements/decisions from tentative suggestions or opinions.
2. Only list decisions that were clearly agreed upon or decided by participants. If no decisions were made, return an empty array for decisions.
3. NEVER invent participants. Only list people who spoke or were explicitly named.
4. ACTION ITEMS: Only create action items for explicit commitments or delegated tasks.
   - If an owner is not mentioned, set ownerName to "Unassigned".
   - If a due date is not specified, set dueDate to "Not specified".
   - Set priority to "urgent", "high", "medium", or "low" based on discussion urgency.
   - Include the direct quote and approximate timestamp reference from the transcript.
5. If information for any category is absent from the transcript, return an empty array or mark as "Not specified".
6. Be thorough, clear, professional, and faithful to the actual discussion.

OUTPUT SCHEMA (Must be valid JSON):
{
  "title": "Minutes of Meeting — ${params.meetingTitle}",
  "meetingDate": "${dateStr}",
  "durationMinutes": 30,
  "attendeesSummary": ["Name (Role if known)"],
  "executiveSummary": "Comprehensive multi-paragraph synthesis of the meeting, background, core discussion, and strategic direction.",
  "agendaTopics": [
    {
      "topic": "Topic Name",
      "summary": "Detailed summary of what was discussed on this topic.",
      "timestamp": "00:00"
    }
  ],
  "decisions": [
    {
      "id": "dec_1",
      "decisionText": "Clear confirmed decision statement",
      "decidedBy": "Person or team who decided",
      "context": "Why this was decided",
      "timestamp": "00:00"
    }
  ],
  "actionItems": [
    {
      "id": "act_1",
      "title": "Actionable task title",
      "description": "Specific deliverable description",
      "ownerName": "Person name or 'Unassigned'",
      "dueDate": "YYYY-MM-DD or 'Not specified'",
      "priority": "high",
      "status": "open",
      "transcriptReference": {
        "segmentId": "seg_1",
        "timestamp": "00:00",
        "quote": "Exact supporting quote from transcript"
      }
    }
  ],
  "risksAndBlockers": [
    {
      "risk": "Identified risk or bottleneck",
      "impact": "high",
      "mitigation": "Proposed or agreed mitigation"
    }
  ],
  "unresolvedQuestions": ["Open question needing follow-up"],
  "nextSteps": ["Immediate next step or milestone"]
}`;

  const response = await generateContentWithFallback(ai, model, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const rawJson = response.text;
  if (!rawJson) {
    throw new Error("Gemini returned empty MoM output.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    const cleaned = rawJson.replace(/```json\n?|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  const nowIso = new Date().toISOString();
  const momId = `mom_${Date.now()}`;

  const actionItems: ActionItem[] = (parsed.actionItems || []).map(
    (item: any, idx: number) => ({
      id: item.id || `act_${Date.now()}_${idx + 1}`,
      meetingId: "",
      meetingTitle: params.meetingTitle,
      title: item.title || `Action Item ${idx + 1}`,
      description: item.description,
      ownerName: item.ownerName || "Unassigned",
      dueDate: item.dueDate || "Not specified",
      status: "open",
      priority: ["low", "medium", "high", "urgent"].includes(item.priority)
        ? item.priority
        : "medium",
      transcriptReference: item.transcriptReference,
      createdAt: nowIso,
    })
  );

  const decisions: Decision[] = (parsed.decisions || []).map(
    (dec: any, idx: number) => ({
      id: dec.id || `dec_${Date.now()}_${idx + 1}`,
      decisionText: dec.decisionText || "",
      decidedBy: dec.decidedBy || "Not specified",
      context: dec.context,
      timestamp: dec.timestamp,
    })
  );

  const mom: MoMDocument = {
    id: momId,
    meetingId: "",
    title: parsed.title || `Minutes of Meeting — ${params.meetingTitle}`,
    meetingDate: parsed.meetingDate || dateStr,
    durationMinutes: typeof parsed.durationMinutes === "number" ? parsed.durationMinutes : 30,
    attendeesSummary: parsed.attendeesSummary || [],
    executiveSummary: parsed.executiveSummary || "Summary not available.",
    agendaTopics: parsed.agendaTopics || [],
    decisions,
    actionItems,
    risksAndBlockers: parsed.risksAndBlockers || [],
    unresolvedQuestions: parsed.unresolvedQuestions || [],
    nextSteps: parsed.nextSteps || [],
    status: "draft",
    version: 1,
    updatedAt: nowIso,
  };

  return { mom, actionItems };
}

/**
 * Grounded AI Meeting Q&A strictly using transcript evidence.
 */
export async function answerMeetingQnA(params: {
  transcriptText: string;
  question: string;
  meetingTitle: string;
}): Promise<{
  answer: string;
  citations?: {
    speakerName: string;
    timestamp: string;
    quote: string;
  }[];
}> {
  const ai = getGeminiClient({ timeoutMs: 60000 });
  const model = DEFAULT_GEMINI_MODEL;

  const prompt = `You are Dexo AI, an intelligent meeting intelligence assistant.
Your goal is to answer questions about the meeting strictly and accurately using the provided transcript.

MEETING TITLE: "${params.meetingTitle}"

TRANSCRIPT:
"""
${params.transcriptText}
"""

USER QUESTION:
"${params.question}"

RULES:
1. Ground your answer EXCLUSIVELY in the provided transcript.
2. If the question asks about something not mentioned in the transcript, state clearly: "I could not find information regarding this in the meeting transcript."
3. Never invent facts, decisions, people, or deadlines.
4. When citing evidence, provide the speaker name, timestamp, and relevant direct quote.
5. Format output as JSON matching:
{
  "answer": "Clear markdown-formatted answer with direct citations...",
  "citations": [
    {
      "speakerName": "Speaker Name",
      "timestamp": "00:00",
      "quote": "Direct quote from transcript"
    }
  ]
}`;

  const response = await generateContentWithFallback(ai, model, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const rawJson = response.text;
  if (!rawJson) {
    return {
      answer: "No response was generated by the AI model.",
      citations: [],
    };
  }

  try {
    const parsed = JSON.parse(rawJson);
    return {
      answer: parsed.answer || "I could not find information regarding this in the meeting transcript.",
      citations: parsed.citations || [],
    };
  } catch (_) {
    return {
      answer: rawJson.replace(/```json\n?|```/g, "").trim(),
      citations: [],
    };
  }
}

