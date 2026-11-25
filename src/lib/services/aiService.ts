import { Transcript, MoMDocument, ActionItem } from "@/lib/types";

export interface AIStatus {
  configured: boolean;
  connected: boolean;
  authVerified?: boolean;
  generationTested?: boolean;
  generationStatus?: "ready" | "quota_exhausted" | "high_demand" | "timeout" | "untested" | "error";
  model: string;
  lastCheck: string;
  error?: string;
}

/**
 * Fetch server-side Gemini configuration & health status.
 * By default (testGeneration = false), verifies API key and model handshake
 * without consuming daily generation quota.
 */
export async function fetchAIStatus(options?: { testGeneration?: boolean }): Promise<AIStatus> {
  try {
    const url = options?.testGeneration
      ? "/api/ai/status?testGeneration=true"
      : "/api/ai/status";
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        configured: false,
        connected: false,
        authVerified: false,
        generationTested: false,
        model: "gemini-3.8-flash",
        lastCheck: new Date().toISOString(),
        error: data.error || `Server responded with status ${res.status}`,
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      configured: false,
      connected: false,
      authVerified: false,
      generationTested: false,
      model: "gemini-3.8-flash",
      lastCheck: new Date().toISOString(),
      error: err?.message || "Failed to reach server AI status endpoint.",
    };
  }
}

/**
 * Send audio Blob to server for real Gemini transcription.
 */
export async function transcribeMeetingAudio(params: {
  audioBlob: Blob;
  meetingId: string;
  meetingTitle: string;
  mimeType?: string;
}): Promise<Transcript> {
  const formData = new FormData();
  const effectiveMime = params.mimeType || params.audioBlob.type || "audio/webm";

  let extension = "webm";
  if (effectiveMime.includes("mp3") || effectiveMime.includes("mpeg")) extension = "mp3";
  else if (effectiveMime.includes("wav") || effectiveMime.includes("wave")) extension = "wav";
  else if (effectiveMime.includes("mp4") || effectiveMime.includes("m4a")) extension = "mp4";
  else if (effectiveMime.includes("ogg")) extension = "ogg";
  else if (effectiveMime.includes("aac")) extension = "aac";

  formData.append(
    "audio",
    params.audioBlob,
    `audio_${params.meetingId}.${extension}`
  );
  formData.append("mimeType", effectiveMime);
  if (params.meetingId) formData.append("meetingId", params.meetingId);
  if (params.meetingTitle) formData.append("meetingTitle", params.meetingTitle);

  const res = await fetch("/api/ai/transcribe", {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const errorMsg = data.error || `Transcription failed with HTTP ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).isConfigError = !!data.isConfigError;
    (err as any).errorType = data.errorType;
    (err as any).statusCode = res.status;
    throw err;
  }

  return data.transcript;
}

/**
 * Send transcript to server for real Gemini Minutes of Meeting (MoM) synthesis.
 */
export async function generateMeetingMoM(params: {
  meetingId: string;
  transcriptText: string;
  meetingTitle: string;
  meetingDate?: string;
  attendees?: string[];
}): Promise<{ mom: MoMDocument; actionItems: ActionItem[] }> {
  const res = await fetch("/api/ai/generate-mom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const errorMsg = data.error || `MoM generation failed with HTTP ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).isConfigError = !!data.isConfigError;
    throw err;
  }

  return {
    mom: data.mom,
    actionItems: data.actionItems,
  };
}

/**
 * Ask question grounded strictly in meeting transcript.
 */
export async function askMeetingQnA(params: {
  meetingId: string;
  question: string;
  transcriptText: string;
  meetingTitle: string;
}): Promise<{ answer: string; citations?: any[] }> {
  const res = await fetch("/api/ai/qna", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const errorMsg = data.error || `Q&A request failed with HTTP ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).isConfigError = !!data.isConfigError;
    throw err;
  }

  return {
    answer: data.answer,
    citations: data.citations,
  };
}

