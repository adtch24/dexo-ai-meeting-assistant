"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Mic,
  UploadCloud,
  FileText,
  Users,
  CheckCircle2,
  FileCheck2,
  HelpCircle,
  Sparkles,
  Download,
  Share2,
  Edit3,
  Save,
  MessageSquare,
  Search,
  ExternalLink,
  AlertTriangle,
  Play,
  RotateCcw,
  Send,
  Printer,
  ChevronRight,
  ShieldCheck,
  Loader2,
  X,
  Bot,
} from "lucide-react";
import {
  Meeting,
  ActionItem,
  Decision,
  TranscriptSegment,
  QnAMessage,
} from "@/lib/types";
import {
  formatDateTime,
  formatDuration,
  getSourceLabel,
  getStatusBadgeConfig,
  getActionStatusBadge,
  getPriorityBadge,
} from "@/lib/utils";
import { mockSampleQnA } from "@/lib/mock/data";
import { DexoAudioPlayer } from "@/components/recording/DexoAudioPlayer";
import { MoMWorkflowActions } from "@/components/mom/MoMWorkflowActions";
import { askMeetingQnA, transcribeMeetingAudio } from "@/lib/services/aiService";
import { saveMeeting, getAudioBlob } from "@/lib/db";

interface MeetingDetailViewProps {
  meeting: Meeting;
  onBack: () => void;
  onUpdateActionStatus?: (actionId: string, newStatus: any) => void;
  onUpdateMeeting?: (updatedMeeting: Meeting) => void | Promise<void>;
}

export function MeetingDetailView({
  meeting: initialMeeting,
  onBack,
  onUpdateActionStatus,
  onUpdateMeeting,
}: MeetingDetailViewProps) {
  const [meeting, setMeeting] = useState<Meeting>(initialMeeting);

  useEffect(() => {
    setMeeting(initialMeeting);
    setEditedExecutiveSummary(initialMeeting.mom?.executiveSummary || "");
    setIsPublished(initialMeeting.mom?.status === "published" || initialMeeting.status === "published");
  }, [initialMeeting]);
  const [activeTab, setActiveTab] = useState<"overview" | "mom" | "transcript" | "qna">("mom");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null);

  // Q&A State
  const initialMessages: QnAMessage[] = mockSampleQnA[meeting.id] || [
    {
      id: "qna_welcome",
      sender: "assistant",
      content: `Hello! I'm your Dexo AI Meeting Assistant for **"${meeting.title}"**. Ask any question grounded strictly in this meeting's transcript and decisions.`,
      timestamp: new Date().toISOString(),
    },
  ];

  const [qnaMessages, setQnaMessages] = useState<QnAMessage[]>(initialMessages);
  const [qnaInput, setQnaInput] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  // MoM Editing & Publishing State
  const [isEditingMoM, setIsEditingMoM] = useState(false);
  const [editedExecutiveSummary, setEditedExecutiveSummary] = useState(
    meeting.mom?.executiveSummary || ""
  );
  const [isPublished, setIsPublished] = useState(
    meeting.mom?.status === "published" || meeting.status === "published"
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishNotification, setPublishNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showPdfExportModal, setShowPdfExportModal] = useState(false);

  const statusConfig = getStatusBadgeConfig(meeting.status);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const handleUpdateMeetingInternal = async (updatedMeeting: Meeting) => {
    setMeeting(updatedMeeting);
    if (onUpdateMeeting) {
      await onUpdateMeeting(updatedMeeting);
    }
  };

  const handleTranscribeAudio = async () => {
    if (isTranscribing) return;
    setIsTranscribing(true);
    setTranscribeError(null);

    try {
      let audioBlob = meeting.audioBlob;
      if (!audioBlob) {
        audioBlob = await getAudioBlob(meeting.id);
      }
      if (!audioBlob) {
        throw new Error("Audio recording Blob not found in IndexedDB storage.");
      }

      const transcript = await transcribeMeetingAudio({
        audioBlob,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        mimeType: audioBlob.type || undefined,
      });

      const updatedMeeting: Meeting = {
        ...meeting,
        transcript,
        updatedAt: new Date().toISOString(),
      };

      await saveMeeting(updatedMeeting, meeting.audioBlob);
      await handleUpdateMeetingInternal(updatedMeeting);
    } catch (err: any) {
      console.error("Transcription failed:", err);
      setTranscribeError(err.message || "Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Real Grounded Q&A via Gemini API
  const handleSendQnA = async (questionText?: string) => {
    const text = questionText || qnaInput;
    if (!text.trim() || isAnswering) return;

    const userMsg: QnAMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setQnaMessages((prev) => [...prev, userMsg]);
    setQnaInput("");
    setIsAnswering(true);

    try {
      const transcriptText = meeting.transcript?.rawText || "";
      if (!transcriptText.trim()) {
        const reply: QnAMessage = {
          id: `asst_${Date.now()}`,
          sender: "assistant",
          content:
            "No transcript is available for this meeting yet. Please generate or import a transcript first so I can answer questions strictly grounded in the conversation.",
          timestamp: new Date().toISOString(),
        };
        setQnaMessages((prev) => [...prev, reply]);
        return;
      }

      const res = await askMeetingQnA({
        meetingId: meeting.id,
        question: text,
        transcriptText,
        meetingTitle: meeting.title,
      });

      const reply: QnAMessage = {
        id: `asst_${Date.now()}`,
        sender: "assistant",
        content: res.answer,
        citations: res.citations,
        timestamp: new Date().toISOString(),
      };
      setQnaMessages((prev) => [...prev, reply]);
    } catch (err: any) {
      const reply: QnAMessage = {
        id: `asst_${Date.now()}`,
        sender: "assistant",
        content: `Could not complete Q&A: ${err.message || "Failed to connect to Gemini API."}`,
        timestamp: new Date().toISOString(),
      };
      setQnaMessages((prev) => [...prev, reply]);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleToggleActionStatus = (actionId: string) => {
    if (!meeting.mom) return;
    const updated = meeting.mom.actionItems.map((act) => {
      if (act.id === actionId) {
        const nextStatus = act.status === "completed" ? "open" : "completed";
        return {
          ...act,
          status: nextStatus as any,
          completedAt: nextStatus === "completed" ? new Date().toISOString() : undefined,
        };
      }
      return act;
    });

    setMeeting((prev) => {
      const freshMeeting: Meeting = {
        ...prev,
        mom: prev.mom ? { ...prev.mom, actionItems: updated, updatedAt: new Date().toISOString() } : undefined,
        updatedAt: new Date().toISOString(),
      };
      if (onUpdateMeeting) {
        onUpdateMeeting(freshMeeting);
      }
      return freshMeeting;
    });

    if (onUpdateActionStatus) {
      onUpdateActionStatus(actionId, "completed");
    }
  };

  const handlePublishMoM = async () => {
    if (!meeting.mom || isPublishing) return;
    setIsPublishing(true);
    setPublishNotification(null);

    const nowIso = new Date().toISOString();
    const published: Meeting = {
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

    setMeeting(published);
    setIsPublished(true);

    if (onUpdateMeeting) {
      try {
        await onUpdateMeeting(published);
        setPublishNotification({
          type: "success",
          message: "Minutes of Meeting approved and published successfully. Status has been persisted to IndexedDB.",
        });
      } catch (err) {
        console.error("Failed to persist published MoM:", err);
        setPublishNotification({
          type: "error",
          message: "Failed to persist publication to IndexedDB. Please try again.",
        });
      } finally {
        setIsPublishing(false);
      }
    } else {
      setIsPublishing(false);
    }
  };

  const filteredSegments = (meeting.transcript?.segments || []).filter((seg) => {
    if (!transcriptSearch) return true;
    const q = transcriptSearch.toLowerCase();
    return (
      seg.text.toLowerCase().includes(q) ||
      seg.speakerName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090D16]">
      {/* Top Navigation & Breadcrumbs */}
      <div className="border-b border-slate-800/80 bg-[#0B1120]/60 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Meetings</span>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-medium text-slate-400 truncate max-w-[200px] sm:max-w-xs">
            {meeting.title}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {meeting.mom && (
            <button
              onClick={() => setShowPdfExportModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export PDF</span>
            </button>
          )}

          <MoMWorkflowActions
            meeting={meeting}
            onUpdateMeeting={handleUpdateMeetingInternal}
            variant="header"
          />
        </div>
      </div>

      {/* Meeting Header Banner */}
      <div className="px-4 sm:px-8 py-6 border-b border-slate-800/80 bg-gradient-to-b from-[#0F172A]/40 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {/* Source Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                  {meeting.source === "google_meet" && <Video className="h-3.5 w-3.5 text-blue-400" />}
                  {meeting.source === "physical" && <Mic className="h-3.5 w-3.5 text-rose-400" />}
                  {meeting.source === "audio_upload" && <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />}
                  {meeting.source === "transcript_paste" && <FileText className="h-3.5 w-3.5 text-violet-400" />}
                  {getSourceLabel(meeting.source)}
                </span>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusConfig.className}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.indicatorClassName}`} />
                  {statusConfig.label}
                </span>

                {meeting.meetUrl && (
                  <a
                    href={meeting.meetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
                  >
                    <span>Google Meet Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {meeting.title}
              </h2>

              {meeting.description && (
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {meeting.description}
                </p>
              )}

              {/* Meta items */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  {formatDateTime(meeting.scheduledAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  {formatDuration(meeting.durationMinutes)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  {meeting.attendees.length} Attendees
                </span>
              </div>
            </div>

            {/* Audio player preview if available */}
            {(meeting.recordingUrl || meeting.audioBlob) && (
              <div className="w-full sm:w-96 rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-lg">
                <DexoAudioPlayer
                  compact
                  src={meeting.recordingUrl}
                  blob={meeting.audioBlob}
                  initialDuration={meeting.recordingDurationSeconds || (meeting.durationMinutes * 60)}
                  title={meeting.title}
                />
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-800">
            <button
              onClick={() => setActiveTab("mom")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === "mom"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Minutes of Meeting (MoM)</span>
              {meeting.mom && (
                <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] text-indigo-300 font-bold">
                  v{meeting.mom.version}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === "transcript"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Transcript & Speakers</span>
              {meeting.transcript && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                  {meeting.transcript.segments.length} segments
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("qna")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === "qna"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Grounded AI Q&A</span>
            </button>

            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === "overview"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Attendees & Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* TAB 1: MINUTES OF MEETING (MoM) */}
          {activeTab === "mom" && (
            <div className="space-y-6">
              {/* Publication Notification Banner */}
              {publishNotification && (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in duration-200 ${
                    publishNotification.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/25 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {publishNotification.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    )}
                    <span>{publishNotification.message}</span>
                  </div>
                  <button
                    onClick={() => setPublishNotification(null)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {!meeting.mom ? (
                <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-8 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Bot className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">AI-Generated MoM Not Yet Available</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Automated Minutes of Meeting synthesis, decision extraction, and action item detection await the Phase 3 Gemini AI pipeline.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 w-fit">
                      <Clock className="h-3.5 w-3.5" />
                      Awaiting Gemini Pipeline (Phase 3)
                    </span>
                  </div>

                  {/* Architecture & Source Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Source Recording Status</span>
                      <p className="text-sm font-bold text-white">
                        {meeting.recordingUrl || meeting.audioBlob ? (
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            Audio Persisted in IndexedDB
                          </span>
                        ) : meeting.transcript ? (
                          <span className="text-blue-400 flex items-center gap-1.5">
                            <FileText className="h-4 w-4" />
                            Transcript Stored
                          </span>
                        ) : (
                          <span className="text-slate-400">Scheduled Session</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {meeting.recordingFileSizeMb ? `${meeting.recordingFileSizeMb} MB audio binary preserved locally.` : "Raw source captured and ready for AI ingestion."}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">AI Transcription</span>
                      <p className="text-sm font-bold text-slate-300">Pending Phase 3 Activation</p>
                      <p className="text-xs text-slate-400">
                        Multi-speaker diarization and acoustic speech-to-text with Gemini AI.
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Approval & Publication</span>
                      <p className="text-sm font-bold text-slate-400">Unavailable for Empty MoM</p>
                      <p className="text-xs text-slate-400">
                        "Approve & Publish MoM" becomes active once AI generates verifiable deliverables.
                      </p>
                    </div>
                  </div>

                  {/* Audio Preview directly in tab if recording is attached */}
                  {(meeting.recordingUrl || meeting.audioBlob) && (
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">Playback Local Source Recording</span>
                        <span className="font-mono text-indigo-400 text-[11px]">Browser Native IndexedDB Stream</span>
                      </div>
                      <DexoAudioPlayer
                        src={meeting.recordingUrl}
                        blob={meeting.audioBlob}
                        initialDuration={meeting.recordingDurationSeconds || (meeting.durationMinutes * 60)}
                        title={meeting.title}
                      />
                    </div>
                  )}

                  {/* Real MoM Workflow Action Component */}
                  <div className="pt-2">
                    <MoMWorkflowActions
                      meeting={meeting}
                      onUpdateMeeting={handleUpdateMeetingInternal}
                      variant="detail_tab"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Executive Summary Card */}
                  <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Executive Summary</h3>
                          <p className="text-[11px] text-slate-400">
                            Synthesized by Gemini AI • Zero-hallucination verification
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (isEditingMoM) {
                            const updated: Meeting = {
                              ...meeting,
                              mom: meeting.mom ? {
                                ...meeting.mom,
                                executiveSummary: editedExecutiveSummary,
                                updatedAt: new Date().toISOString(),
                              } : undefined,
                              updatedAt: new Date().toISOString(),
                            };
                            setMeeting(updated);
                            if (onUpdateMeeting) {
                              onUpdateMeeting(updated);
                            }
                          }
                          setIsEditingMoM(!isEditingMoM);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                      >
                        {isEditingMoM ? <Save className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                        <span>{isEditingMoM ? "Save Edits" : "Edit Summary"}</span>
                      </button>
                    </div>

                    {isEditingMoM ? (
                      <textarea
                        rows={4}
                        value={editedExecutiveSummary}
                        onChange={(e) => setEditedExecutiveSummary(e.target.value)}
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                      />
                    ) : (
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {editedExecutiveSummary || meeting.mom.executiveSummary}
                      </p>
                    )}
                  </div>

                  {/* Confirmed Decisions Section */}
                  <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Confirmed Decisions</h3>
                          <p className="text-[11px] text-slate-400">
                            Strictly extracted decisions • Never suggests mere ideas as confirmed
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        {meeting.mom.decisions.length} Confirmed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {meeting.mom.decisions.map((decision) => (
                        <div
                          key={decision.id}
                          className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-2 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-slate-100 leading-snug">
                              {decision.decisionText}
                            </h4>
                            {decision.timestamp && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 flex-shrink-0">
                                {decision.timestamp}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            <span className="text-indigo-400 font-medium">Decided by: </span>
                            {decision.decidedBy}
                          </div>
                          {decision.context && (
                            <p className="text-[11px] text-slate-500 italic">
                              "{decision.context}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Items Section */}
                  <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <FileCheck2 className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Action Items & Deliverables</h3>
                          <p className="text-[11px] text-slate-400">
                            Trackable tasks with verified assignees and deadlines
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                        {meeting.mom.actionItems.length} Items
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Task Title & Description</th>
                            <th className="py-3 px-3">Assignee</th>
                            <th className="py-3 px-3">Due Date</th>
                            <th className="py-3 px-3">Priority</th>
                            <th className="py-3 px-3 text-right">Citation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                          {meeting.mom.actionItems.map((action) => {
                            const statusCfg = getActionStatusBadge(action.status);
                            const priorityCfg = getPriorityBadge(action.priority);
                            const isDone = action.status === "completed";

                            return (
                              <tr
                                key={action.id}
                                className={`group hover:bg-slate-900/40 transition-colors ${
                                  isDone ? "opacity-60" : ""
                                }`}
                              >
                                <td className="py-3 px-3">
                                  <button
                                    onClick={() => handleToggleActionStatus(action.id)}
                                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                      isDone
                                        ? "bg-emerald-600 border-emerald-500 text-white"
                                        : "border-slate-700 bg-slate-900 hover:border-indigo-500"
                                    }`}
                                  >
                                    {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                                  </button>
                                </td>
                                <td className="py-3 px-3 max-w-sm">
                                  <div
                                    className={`font-semibold text-slate-100 ${
                                      isDone ? "line-through text-slate-400" : ""
                                    }`}
                                  >
                                    {action.title}
                                  </div>
                                  {action.description && (
                                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                      {action.description}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-[10px] font-bold text-indigo-300 flex items-center justify-center">
                                      {action.ownerName.charAt(0)}
                                    </div>
                                    <span className="text-slate-200 font-medium">
                                      {action.ownerName}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                                  {action.dueDate}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${priorityCfg.className}`}
                                  >
                                    {priorityCfg.label}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  {action.transcriptReference ? (
                                    <button
                                      onClick={() => {
                                        setActiveTab("transcript");
                                        setHighlightedSegmentId(action.transcriptReference?.segmentId || null);
                                      }}
                                      className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-300 px-2 py-1 text-[10px] font-mono text-slate-400 transition-colors"
                                      title={action.transcriptReference.quote}
                                    >
                                      <span>[{action.transcriptReference.timestamp}]</span>
                                      <ChevronRight className="h-3 w-3" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-600">None</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Risks & Unresolved Questions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Risks and Blockers */}
                    <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Risks & Blockers</h3>
                      </div>
                      {meeting.mom.risksAndBlockers.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No critical risks flagged.</p>
                      ) : (
                        <div className="space-y-3">
                          {meeting.mom.risksAndBlockers.map((risk, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                                <span>{risk.risk}</span>
                                <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                  {risk.impact} impact
                                </span>
                              </div>
                              {risk.mitigation && (
                                <p className="text-[11px] text-slate-400">
                                  <strong className="text-slate-300">Mitigation: </strong>
                                  {risk.mitigation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Unresolved Questions */}
                    <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <HelpCircle className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Unresolved Questions & Next Steps</h3>
                      </div>
                      {meeting.mom.unresolvedQuestions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">All questions were addressed during meeting.</p>
                      ) : (
                        <div className="space-y-2">
                          {meeting.mom.unresolvedQuestions.map((q, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs text-slate-300 flex items-start gap-2"
                            >
                              <span className="text-purple-400 font-bold">•</span>
                              <span>{q}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRANSCRIPT VIEWER */}
          {activeTab === "transcript" && (
            <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Meeting Transcript</h3>
                  <p className="text-[11px] text-slate-400">
                    Language: {meeting.transcript?.language || "en-US"} • {meeting.transcript?.wordCount || 0} words • {meeting.transcript?.detectedSpeakers?.length || 0} speakers
                  </p>
                </div>

                {/* Transcript Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search dialogue or speaker..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {!meeting.transcript ? (
                <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-8 text-center space-y-4">
                  <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 max-w-fit mx-auto">
                    <Mic className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">
                      {meeting.recordingUrl || meeting.audioBlob
                        ? "Audio Recording Captured — Awaiting Transcription"
                        : "No Transcript Available"}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {meeting.recordingUrl || meeting.audioBlob
                        ? "Transcribe this acoustic recording with Gemini AI to generate verbatim dialogue, detected speaker attribution, and timestamps."
                        : "No audio recording or pasted transcript has been associated with this meeting record yet."}
                    </p>
                  </div>

                  {transcribeError && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs max-w-md mx-auto text-left flex items-start gap-2.5 ${
                        transcribeError.includes("Quota")
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      }`}
                    >
                      <AlertTriangle
                        className={`h-4 w-4 shrink-0 mt-0.5 ${
                          transcribeError.includes("Quota") ? "text-amber-400" : "text-rose-400"
                        }`}
                      />
                      <div className="flex-1">
                        <span className="font-bold block">
                          {transcribeError.includes("Quota")
                            ? "API Quota Limit Exceeded (429)"
                            : "Transcription Notice"}
                        </span>
                        <span className="text-slate-300 leading-relaxed block mt-0.5">
                          {transcribeError}
                        </span>
                      </div>
                    </div>
                  )}

                  {(meeting.recordingUrl || meeting.audioBlob) && (
                    <div className="pt-2 max-w-md mx-auto space-y-4">
                      <button
                        type="button"
                        onClick={handleTranscribeAudio}
                        disabled={isTranscribing}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all"
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-200" />
                            <span>Transcribing Audio with Gemini AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-indigo-300" />
                            <span>Transcribe Audio with Gemini AI</span>
                          </>
                        )}
                      </button>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                          Source Audio Playback
                        </span>
                        <DexoAudioPlayer
                          src={meeting.recordingUrl}
                          blob={meeting.audioBlob}
                          initialDuration={meeting.recordingDurationSeconds || (meeting.durationMinutes * 60)}
                          title={meeting.title}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSegments.map((seg) => {
                    const isHighlighted = highlightedSegmentId === seg.id;

                    return (
                      <div
                        key={seg.id}
                        id={seg.id}
                        className={`rounded-xl p-4 border transition-all ${
                          isHighlighted
                            ? "bg-indigo-950/40 border-indigo-500/60 ring-2 ring-indigo-500/20"
                            : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-indigo-300">
                              {seg.speakerName}
                            </span>
                            {seg.speakerRole && (
                              <span className="text-[10px] text-slate-400">
                                ({seg.speakerRole})
                              </span>
                            )}
                          </div>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                            {seg.startTimeFormatted}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          {seg.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GROUNDED MEETING AI Q&A */}
          {activeTab === "qna" && (
            <div className="rounded-2xl bg-[#0F172A] border border-slate-800 overflow-hidden shadow-xl flex flex-col h-[650px]">
              {/* Q&A Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Meeting-Grounded AI Q&A
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Isolated to this meeting context. Answers must cite exact transcript timestamps.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Citations Enabled</span>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {qnaMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-900 border border-slate-800 text-slate-200 shadow-md"
                      }`}
                    >
                      <div className="font-sans whitespace-pre-line">{msg.content}</div>

                      {/* Citations Box */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                            Supporting Transcript Citations
                          </span>
                          {msg.citations.map((cite, i) => (
                            <div
                              key={i}
                              className="rounded-lg bg-slate-950/80 border border-slate-800 p-2.5 text-[11px] text-slate-300"
                            >
                              <div className="flex items-center justify-between text-indigo-300 font-semibold mb-1">
                                <span>{cite.speakerName}</span>
                                <span className="font-mono text-slate-400">[{cite.timestamp}]</span>
                              </div>
                              <p className="text-slate-400 italic">"{cite.quote}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}

                {isAnswering && (
                  <div className="flex items-center gap-2 text-xs text-indigo-400 bg-slate-900 border border-slate-800 p-3 rounded-2xl max-w-fit">
                    <span className="h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span>Searching meeting transcript & generating citation...</span>
                  </div>
                )}
              </div>

              {/* Pre-canned Prompt Chips */}
              <div className="px-6 py-2 border-t border-slate-800 bg-slate-950/40 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-[11px] text-slate-500 font-medium flex-shrink-0">
                  Try asking:
                </span>
                <button
                  onClick={() => handleSendQnA("What decisions were made?")}
                  className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-[11px] text-slate-300 hover:border-indigo-500 hover:text-white flex-shrink-0 transition-colors"
                >
                  What decisions were made?
                </button>
                <button
                  onClick={() => handleSendQnA("Who owns the database migration and what is the deadline?")}
                  className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-[11px] text-slate-300 hover:border-indigo-500 hover:text-white flex-shrink-0 transition-colors"
                >
                  Who owns database migration?
                </button>
                <button
                  onClick={() => handleSendQnA("What was decided regarding Google Meet live bot?")}
                  className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-[11px] text-slate-300 hover:border-indigo-500 hover:text-white flex-shrink-0 transition-colors"
                >
                  What about the live bot?
                </button>
              </div>

              {/* Input Box */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQnA();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={qnaInput}
                    onChange={(e) => setQnaInput(e.target.value)}
                    placeholder="Ask a question about this meeting..."
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!qnaInput.trim() || isAnswering}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: ATTENDEES & METADATA */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white">Meeting Attendees</h3>
                <div className="space-y-3">
                  {meeting.attendees.map((att) => (
                    <div
                      key={att.id}
                      className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-xs font-bold text-indigo-300 flex items-center justify-center">
                          {att.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{att.name}</p>
                          <p className="text-[11px] text-slate-400">{att.email}</p>
                        </div>
                      </div>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 uppercase">
                        {att.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white">Processing & Integration Audit</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Meeting ID</span>
                    <span className="font-mono text-slate-200">{meeting.id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Source Type</span>
                    <span className="text-slate-200">{getSourceLabel(meeting.source)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Scheduled At</span>
                    <span className="text-slate-200">{formatDateTime(meeting.scheduledAt)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">AI Model</span>
                    <span className="text-indigo-400 font-semibold">Gemini Multi-Modal Flash</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Storage Security</span>
                    <span className="text-emerald-400 font-semibold">Private Supabase Bucket (AES-256)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Export Preview Modal */}
      {showPdfExportModal && meeting.mom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white text-slate-900 p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  Dexo Minutes of Meeting (MoM)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official Record • Generated via Dexo AI Intelligence Platform
                </p>
              </div>
              <button
                onClick={() => setShowPdfExportModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <strong className="block text-slate-900">Meeting:</strong>
                  {meeting.title}
                </div>
                <div>
                  <strong className="block text-slate-900">Date & Duration:</strong>
                  {meeting.mom.meetingDate} ({meeting.mom.durationMinutes} min)
                </div>
                <div className="col-span-2">
                  <strong className="block text-slate-900">Attendees:</strong>
                  {meeting.mom.attendeesSummary.join(", ")}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1 border-b pb-1">
                  1. Executive Summary
                </h4>
                <p className="leading-relaxed mt-2 text-slate-800">
                  {meeting.mom.executiveSummary}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-2 border-b pb-1">
                  2. Confirmed Decisions
                </h4>
                <ul className="space-y-1.5 list-disc list-inside">
                  {meeting.mom.decisions.map((d) => (
                    <li key={d.id}>
                      <strong>{d.decisionText}</strong> — Decided by {d.decidedBy}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-2 border-b pb-1">
                  3. Action Items & Deadlines
                </h4>
                <table className="w-full text-left border border-slate-200 text-[11px]">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 border">Task</th>
                      <th className="p-2 border">Owner</th>
                      <th className="p-2 border">Due Date</th>
                      <th className="p-2 border">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meeting.mom.actionItems.map((a) => (
                      <tr key={a.id}>
                        <td className="p-2 border">{a.title}</td>
                        <td className="p-2 border font-medium">{a.ownerName}</td>
                        <td className="p-2 border font-mono">{a.dueDate}</td>
                        <td className="p-2 border uppercase font-bold">{a.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t mt-6">
              <span className="text-[11px] text-slate-400">
                Document status: {isPublished ? "Approved & Published" : "Draft for Review"}
              </span>
              <button
                onClick={() => {
                  window.print();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
