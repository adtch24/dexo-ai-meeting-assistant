"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Clock,
  Loader2,
  AlertCircle,
  FileText,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import { Meeting, Transcript, MoMDocument, ActionItem } from "@/lib/types";
import { saveMeeting, getAudioBlob } from "@/lib/db";
import {
  fetchAIStatus,
  transcribeMeetingAudio,
  generateMeetingMoM,
} from "@/lib/services/aiService";
import { GeminiConfigModal } from "@/components/ai/GeminiConfigModal";

interface MoMWorkflowActionsProps {
  meeting: Meeting;
  onUpdateMeeting?: (updated: Meeting) => Promise<void> | void;
  onSelectMeeting?: (meetingId: string) => void;
  variant?: "header" | "card" | "detail_tab" | "compact";
  className?: string;
}

export function MoMWorkflowActions({
  meeting,
  onUpdateMeeting,
  onSelectMeeting,
  variant = "card",
  className = "",
}: MoMWorkflowActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<
    "transcribing" | "generating" | "publishing" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const isPublished =
    meeting.status === "published" || meeting.mom?.status === "published";
  const hasDraftMoM = Boolean(meeting.mom && !isPublished);
  const hasSourceContent = Boolean(
    meeting.recordingUrl ||
      meeting.audioBlob ||
      (meeting.transcript && meeting.transcript.rawText.trim())
  );

  // Trigger Complete Gemini AI Pipeline: Transcribe (if audio) -> Generate MoM -> Save to IndexedDB
  const handleExecuteAIPipeline = async () => {
    if (isProcessing) return;
    setErrorMessage(null);
    setSuccessBanner(null);

    // 1. Verify Gemini API Server Configuration
    const aiStatus = await fetchAIStatus();
    if (!aiStatus.configured) {
      setShowConfigModal(true);
      return;
    }

    setIsProcessing(true);

    try {
      let currentTranscript = meeting.transcript;

      // Stage A: Audio Transcription (if audio exists and no transcript yet)
      if (!currentTranscript && (meeting.audioBlob || meeting.recordingUrl)) {
        setProcessingStage("transcribing");

        // Retrieve binary Blob from state or IndexedDB
        let audioBlob = meeting.audioBlob;
        if (!audioBlob) {
          audioBlob = await getAudioBlob(meeting.id);
        }

        if (!audioBlob) {
          throw new Error(
            "Could not locate the binary audio recording in local IndexedDB storage."
          );
        }

        const generatedTranscript = await transcribeMeetingAudio({
          audioBlob,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          mimeType: audioBlob.type || undefined,
        });

        currentTranscript = generatedTranscript;
      }

      if (!currentTranscript || !currentTranscript.rawText.trim()) {
        throw new Error(
          "No transcript available. Please record audio, upload an audio file, or provide a transcript text to generate Minutes of Meeting."
        );
      }

      // Stage B: Real MoM Synthesis from Transcript
      setProcessingStage("generating");

      const { mom: generatedMoM, actionItems: extractedActions } =
        await generateMeetingMoM({
          meetingId: meeting.id,
          transcriptText: currentTranscript.rawText,
          meetingTitle: meeting.title,
          meetingDate: meeting.scheduledAt
            ? new Date(meeting.scheduledAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : undefined,
          attendees: meeting.attendees.map((a) => a.name),
        });

      // Update full meeting record
      const updatedMeeting: Meeting = {
        ...meeting,
        transcript: currentTranscript,
        mom: generatedMoM,
        status: "ready_for_review",
        updatedAt: new Date().toISOString(),
      };

      // Stage C: Commit immediately to IndexedDB
      await saveMeeting(updatedMeeting, meeting.audioBlob);

      if (onUpdateMeeting) {
        await onUpdateMeeting(updatedMeeting);
      }

      setSuccessBanner("MoM successfully synthesized with Gemini AI!");
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      console.error("AI pipeline execution failed:", err);
      if (err.isConfigError) {
        setShowConfigModal(true);
      }
      setErrorMessage(
        err.message || "Failed to complete AI processing. Please try again."
      );
    } finally {
      setIsProcessing(false);
      setProcessingStage(null);
    }
  };

  // State 3 -> State 4: Approve & Publish MoM
  const handlePublishMoM = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!meeting.mom || isProcessing) return;

    setIsProcessing(true);
    setProcessingStage("publishing");
    setErrorMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const publishedMeeting: Meeting = {
        ...meeting,
        status: "published",
        mom: {
          ...meeting.mom,
          status: "published",
          publishedAt: nowIso,
          updatedAt: nowIso,
        },
        updatedAt: nowIso,
      };

      await saveMeeting(publishedMeeting, meeting.audioBlob);

      if (onUpdateMeeting) {
        await onUpdateMeeting(publishedMeeting);
      }

      setSuccessBanner(
        "Minutes of Meeting approved and published! Status committed to IndexedDB."
      );
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      console.error("Publication failed:", err);
      setErrorMessage(
        err.message || "Failed to persist publication to IndexedDB."
      );
    } finally {
      setIsProcessing(false);
      setProcessingStage(null);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER: VARIANT COMPACT / CARD (used in Overview cards, Meetings List, MoM grid)
  // ---------------------------------------------------------------------------
  if (variant === "card" || variant === "compact") {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {/* Error notification */}
        {errorMessage && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* STATE 2: Processing */}
          {isProcessing && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 animate-pulse"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
              <span>
                {processingStage === "transcribing"
                  ? "Transcribing Audio (Gemini)..."
                  : processingStage === "generating"
                  ? "Synthesizing MoM..."
                  : "Publishing..."}
              </span>
            </div>
          )}

          {/* STATE 4: Published MoM */}
          {!isProcessing && isPublished && (
            <span
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Published & Approved</span>
            </span>
          )}

          {/* STATE 3: Draft MoM Ready for Human Review */}
          {!isProcessing && hasDraftMoM && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Ready for Review</span>
              </span>

              <button
                type="button"
                onClick={handlePublishMoM}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition-all"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Approve & Publish</span>
              </button>
            </div>
          )}

          {/* STATE 1: No MoM Exists -> Generate MoM button */}
          {!isProcessing && !meeting.mom && hasSourceContent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleExecuteAIPipeline();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
              <span>Generate MoM</span>
            </button>
          )}
        </div>

        <GeminiConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onConfigured={handleExecuteAIPipeline}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: VARIANT HEADER & DETAIL TAB (used in MeetingDetailView & MoMView tab)
  // ---------------------------------------------------------------------------
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
            errorMessage.includes("Quota")
              ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
              : "bg-rose-500/10 border-rose-500/25 text-rose-300"
          }`}
        >
          <AlertCircle
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              errorMessage.includes("Quota") ? "text-amber-400" : "text-rose-400"
            }`}
          />
          <div className="flex-1">
            <span className="font-bold block">
              {errorMessage.includes("Quota") ? "API Quota Limit Exceeded (429)" : "AI Processing Notice"}
            </span>
            <span className="text-slate-200 leading-relaxed block mt-0.5">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Action Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* STATE 2: Processing Active */}
        {isProcessing && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 px-4 py-2 text-xs font-semibold text-indigo-300 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            <span>
              {processingStage === "transcribing"
                ? "Transcribing Audio (Gemini AI)..."
                : processingStage === "generating"
                ? "Synthesizing Structured MoM & Action Items..."
                : "Committing Publication to IndexedDB..."}
            </span>
          </div>
        )}

        {/* STATE 4: Published MoM */}
        {!isProcessing && isPublished && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Published & Approved</span>
            </span>

            {meeting.mom?.publishedAt && (
              <span className="text-[11px] text-slate-400 font-mono">
                Published {new Date(meeting.mom.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}

            {/* Optional Regenerate trigger with confirmation */}
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Regenerate</span>
            </button>
          </div>
        )}

        {/* STATE 3: Draft MoM Exists (Show Approve & Publish + Regenerate) */}
        {!isProcessing && hasDraftMoM && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePublishMoM}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Approve & Publish MoM</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Regenerate MoM</span>
            </button>
          </div>
        )}

        {/* STATE 1: No MoM Exists */}
        {!isProcessing && !meeting.mom && (
          <div className="flex flex-wrap items-center gap-3">
            {hasSourceContent ? (
              <button
                type="button"
                onClick={handleExecuteAIPipeline}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition-all"
              >
                <Sparkles className="h-4 w-4 text-indigo-200" />
                <span>
                  {meeting.transcript
                    ? "Generate MoM with Gemini"
                    : "Transcribe & Generate MoM"}
                </span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Awaiting audio recording or transcript input before MoM can be synthesized.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Regenerate */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <RotateCcw className="h-5 w-5" />
              <h3 className="text-base font-bold text-white">
                Regenerate Minutes of Meeting?
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will re-run the Gemini AI pipeline against the meeting transcript. Any manual edits or modifications to the executive summary and decisions will be replaced with freshly generated content.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRegenerateConfirm(false);
                  handleExecuteAIPipeline();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md"
              >
                Confirm & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini API Key Missing Modal */}
      <GeminiConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigured={handleExecuteAIPipeline}
      />
    </div>
  );
}

