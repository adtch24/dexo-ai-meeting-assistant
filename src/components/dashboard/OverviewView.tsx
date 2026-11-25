"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  Mic,
  UploadCloud,
  FileText,
  FileCheck2,
  CheckSquare,
  Sparkles,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Activity,
  ShieldCheck,
  RotateCcw,
  Users,
  Search,
  Filter,
  Check,
  Plus,
  ArrowUpRight,
  Tag,
} from "lucide-react";
import { Meeting, ActionItem, MeetingSource } from "@/lib/types";
import { MoMWorkflowActions } from "@/components/mom/MoMWorkflowActions";
import {
  formatDateTime,
  formatDuration,
  getSourceLabel,
  getStatusBadgeConfig,
  getActionStatusBadge,
  getPriorityBadge,
} from "@/lib/utils";
import { mockCurrentUser } from "@/lib/mock/data";

interface OverviewViewProps {
  meetings: Meeting[];
  actionItems: ActionItem[];
  onOpenCreateModal: () => void;
  onOpenRecordModal: () => void;
  onOpenUploadModal: () => void;
  onOpenTranscriptModal: () => void;
  onSelectMeeting: (meetingId: string) => void;
  onToggleActionStatus: (actionId: string) => void;
  onUpdateMeeting?: (updated: Meeting) => void | Promise<void>;
}

export function OverviewView({
  meetings,
  actionItems,
  onOpenCreateModal,
  onOpenRecordModal,
  onOpenUploadModal,
  onOpenTranscriptModal,
  onSelectMeeting,
  onToggleActionStatus,
  onUpdateMeeting,
}: OverviewViewProps) {
  const [meetingFilter, setMeetingFilter] = useState<"all" | "google_meet" | "physical" | "audio_upload" | "ready_for_review">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter for upcoming scheduled meetings
  const upcomingMeetings = meetings.filter(
    (m) => m.status === "scheduled" || m.status === "in_progress"
  );

  // Filtered meetings based on tab and search
  const filteredMeetings = meetings.filter((m) => {
    if (meetingFilter === "ready_for_review" && m.status !== "ready_for_review") return false;
    if (meetingFilter !== "all" && meetingFilter !== "ready_for_review" && m.source !== meetingFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Recent MoMs
  const recentMoMs = meetings.filter((m) => m.mom);

  // Pending action items
  const pendingActions = actionItems.filter(
    (a) => a.status === "open" || a.status === "in_progress"
  );

  // Total decisions
  const totalDecisions = meetings.reduce(
    (sum, m) => sum + (m.mom?.decisions.length || 0),
    0
  );

  // Latest decisions for quick glance widget (from latest meeting with MoM)
  const latestMoM = meetings.find((m) => m.mom && m.mom.decisions.length > 0);
  const quickDecisions = latestMoM?.mom?.decisions || [];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* 1. Welcome & Vision Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-indigo-950/70 via-[#111827] to-purple-950/50 border border-indigo-500/25 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 h-48 w-48 rounded-full bg-violet-600/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Dexo AI Meeting Intelligence Platform</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {mockCurrentUser.name.split(" ")[0]}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Every conversation. Clear decisions. Actionable outcomes. Turn your meetings into searchable knowledge, accurate Minutes of Meeting, and trackable action items.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-600/50 active:scale-95 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Meeting</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sleek Analytics Metric Cards (Pulse SaaS Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Meetings */}
        <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-slate-800/90 p-5 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Meetings</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              +12.4%
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {meetings.length}
            </span>
            {/* Inline Sparkline SVG */}
            <svg className="h-8 w-24 text-indigo-400" viewBox="0 0 100 30" fill="none">
              <path
                d="M0 25 Q 20 28, 35 15 T 70 18 T 100 5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0 25 Q 20 28, 35 15 T 70 18 T 100 5 L 100 30 L 0 30 Z"
                fill="currentColor"
                fillOpacity="0.1"
              />
            </svg>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Across 4 Intake Workflows
          </span>
        </div>

        {/* Card 2: MoM Documents Generated */}
        <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-slate-800/90 p-5 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">MoM Documents</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
              <FileCheck2 className="h-3 w-3" />
              +8.1%
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {recentMoMs.length}
            </span>
            {/* Inline Sparkline SVG */}
            <svg className="h-8 w-24 text-cyan-400" viewBox="0 0 100 30" fill="none">
              <path
                d="M0 20 Q 25 25, 45 10 T 80 12 T 100 4"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0 20 Q 25 25, 45 10 T 80 12 T 100 4 L 100 30 L 0 30 Z"
                fill="currentColor"
                fillOpacity="0.1"
              />
            </svg>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Strict Schema Validation
          </span>
        </div>

        {/* Card 3: Pending Action Items */}
        <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-slate-800/90 p-5 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Tasks</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              <CheckSquare className="h-3 w-3" />
              {pendingActions.length} Open
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {pendingActions.length}
            </span>
            {/* Inline Sparkline SVG */}
            <svg className="h-8 w-24 text-amber-400" viewBox="0 0 100 30" fill="none">
              <path
                d="M0 10 Q 20 5, 40 18 T 75 14 T 100 8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0 10 Q 20 5, 40 18 T 75 14 T 100 8 L 100 30 L 0 30 Z"
                fill="currentColor"
                fillOpacity="0.1"
              />
            </svg>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Assigned with Due Dates
          </span>
        </div>

        {/* Card 4: Confirmed Decisions */}
        <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-slate-800/90 p-5 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Decisions Captured</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
              <Sparkles className="h-3 w-3" />
              Grounded
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {totalDecisions}
            </span>
            {/* Inline Sparkline SVG */}
            <svg className="h-8 w-24 text-purple-400" viewBox="0 0 100 30" fill="none">
              <path
                d="M0 24 Q 25 15, 50 18 T 80 8 T 100 2"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0 24 Q 25 15, 50 18 T 80 8 T 100 2 L 100 30 L 0 30 Z"
                fill="currentColor"
                fillOpacity="0.1"
              />
            </svg>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Zero Hallucination
          </span>
        </div>
      </div>

      {/* 3. The 4 Intake Workflows (Google Meet, Physical Studio, Audio Upload, Transcript Paste) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Intake Workflows
            </h3>
            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
              4 Converged Paths
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            All sources generate structured MoM & action items
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Google Meet */}
          <div
            onClick={onOpenCreateModal}
            className="group relative rounded-2xl bg-[#111827] border border-slate-800/90 p-5 hover:border-indigo-500/50 hover:bg-[#151E2E] cursor-pointer shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <Video className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                Connected
              </span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
              Google Meet
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Schedule Google Meet invites & sync post-call recordings from Google Drive.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-400">
              <span>Schedule Call</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Physical Recording Studio */}
          <div
            onClick={onOpenRecordModal}
            className="group relative rounded-2xl bg-[#111827] border border-slate-800/90 p-5 hover:border-rose-500/50 hover:bg-[#151E2E] cursor-pointer shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                <Mic className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                Acoustic Studio
              </span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
              In-Person Studio
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Mobile-first room recorder with consent notice & animated soundwave visualizer.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-rose-400">
              <span>Start Recording</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Audio File Drag & Drop */}
          <div
            onClick={onOpenUploadModal}
            className="group relative rounded-2xl bg-[#111827] border border-slate-800/90 p-5 hover:border-cyan-500/50 hover:bg-[#151E2E] cursor-pointer shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                Max 100MB
              </span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
              Audio File Upload
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Drag & drop MP3, M4A, WAV, or AAC audio files from Zoom or voice memos.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-cyan-400">
              <span>Upload Audio</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Transcript Direct Paste */}
          <div
            onClick={onOpenTranscriptModal}
            className="group relative rounded-2xl bg-[#111827] border border-slate-800/90 p-5 hover:border-violet-500/50 hover:bg-[#151E2E] cursor-pointer shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                Instant MoM
              </span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
              Paste Transcript
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Paste text dialogue or upload .txt / .vtt / .srt file to extract MoM and decisions.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-violet-400">
              <span>Import Transcript</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Split Pane Workspace (Matching Image 2 Jamie Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center 8 Columns: Meetings Feed & Workspace Access */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Recent Meetings & Sessions
              </h3>
              <p className="text-xs text-slate-400">
                Select any session to open structured MoM, Grounded Q&A, and full transcripts
              </p>
            </div>

            {/* Meeting Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setMeetingFilter("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  meetingFilter === "all"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent"
                }`}
              >
                All ({meetings.length})
              </button>
              <button
                onClick={() => setMeetingFilter("google_meet")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  meetingFilter === "google_meet"
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/40"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent"
                }`}
              >
                Google Meet
              </button>
              <button
                onClick={() => setMeetingFilter("physical")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  meetingFilter === "physical"
                    ? "bg-rose-600/20 text-rose-300 border border-rose-500/40"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent"
                }`}
              >
                In-Person
              </button>
              <button
                onClick={() => setMeetingFilter("ready_for_review")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  meetingFilter === "ready_for_review"
                    ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent"
                }`}
              >
                Needs Review
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings by title, topic, or agenda..."
              className="w-full rounded-xl bg-[#111827] border border-slate-800/90 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Meeting Cards List */}
          <div className="space-y-3">
            {filteredMeetings.length === 0 ? (
              <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-12 text-center text-xs text-slate-400">
                <FileText className="h-8 w-8 text-slate-500 mx-auto mb-2 opacity-50" />
                No meetings match your selected filter or search query.
              </div>
            ) : (
              filteredMeetings.map((meeting) => {
                const statusCfg = getStatusBadgeConfig(meeting.status);

                return (
                  <div
                    key={meeting.id}
                    onClick={() => onSelectMeeting(meeting.id)}
                    className="group rounded-2xl bg-[#111827] border border-slate-800/90 p-5 hover:border-slate-700 hover:bg-[#151E2E] cursor-pointer shadow-xl transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Source Tag */}
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                          {meeting.source === "google_meet" && <Video className="h-3.5 w-3.5 text-blue-400" />}
                          {meeting.source === "physical" && <Mic className="h-3.5 w-3.5 text-rose-400" />}
                          {meeting.source === "audio_upload" && <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />}
                          {meeting.source === "transcript_paste" && <FileText className="h-3.5 w-3.5 text-violet-400" />}
                          {getSourceLabel(meeting.source)}
                        </span>

                        <span className="text-slate-600">•</span>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${statusCfg.className}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.indicatorClassName}`} />
                          {statusCfg.label}
                        </span>

                        {/* Tag Pills (Matching Image 2) */}
                        <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                          AI Intelligence
                        </span>
                        {meeting.source === "google_meet" && (
                          <span className="rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                            Sync Drive
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-400 font-mono">
                        {formatDateTime(meeting.scheduledAt)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {meeting.title}
                    </h4>

                    {meeting.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {meeting.description}
                      </p>
                    )}

                    {/* Error / Retry Banner */}
                    {meeting.status === "failed" && meeting.errorMessage && (
                      <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-semibold block">Processing Error:</span>
                          {meeting.errorMessage}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            alert("Retrying AI transcription pipeline with high-resolution parameters...");
                          }}
                          className="rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </button>
                      </div>
                    )}

                    {/* MoM Actions Bar */}
                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                      <MoMWorkflowActions
                        meeting={meeting}
                        onUpdateMeeting={onUpdateMeeting}
                        onSelectMeeting={onSelectMeeting}
                        variant="compact"
                      />

                      <div className="flex items-center gap-1 text-indigo-400 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                        <span>Open Workspace</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/40">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          {formatDuration(meeting.durationMinutes)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-500" />
                          {meeting.attendees.length} Attendees
                        </span>
                        {meeting.mom && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-400 font-medium">
                              {meeting.mom.decisions.length} Decisions
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 4 Columns: Decisions & Action Items (Directly matching Image 2 & 3 right drawer) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Confirmed Decisions Widget (Image 2 Right Pane) */}
          <div className="rounded-2xl bg-[#111827] border border-slate-800/90 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Decisions</h4>
                <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                  {quickDecisions.length} Captured
                </span>
              </div>
              <button
                onClick={() => onSelectMeeting(meetings[0]?.id || "")}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {quickDecisions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No decisions recorded yet.
                </div>
              ) : (
                quickDecisions.slice(0, 4).map((dec, idx) => (
                  <div
                    key={dec.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <p className="text-xs text-slate-200 leading-snug">
                        {dec.decisionText}
                      </p>
                    </div>
                    {dec.decidedBy && (
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Decided by <strong className="text-slate-300">{dec.decidedBy}</strong></span>
                        {dec.timestamp && (
                          <span className="font-mono text-indigo-400">{dec.timestamp}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tasks & Action Items Checklist (Image 2 & 3 Checklist) */}
          <div className="rounded-2xl bg-[#111827] border border-slate-800/90 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Tasks & Actions</h4>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                  {pendingActions.length} Pending
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {pendingActions.length === 0 ? (
                <div className="rounded-xl bg-slate-900/60 p-6 text-center text-xs text-slate-400">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
                  All action items completed!
                </div>
              ) : (
                pendingActions.slice(0, 4).map((action) => {
                  const priorityCfg = getPriorityBadge(action.priority);

                  return (
                    <div
                      key={action.id}
                      className="group p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onToggleActionStatus(action.id)}
                          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-950 hover:border-indigo-500 transition-colors"
                          title="Mark complete"
                        >
                          {action.status === "completed" && (
                            <Check className="h-3 w-3 text-indigo-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-semibold text-white leading-snug">
                            {action.title}
                          </h5>
                          <div className="mt-2 flex flex-wrap items-center justify-between text-[10px] text-slate-400">
                            <span className="text-indigo-400 font-medium">
                              {action.ownerName}
                            </span>
                            <span className="font-mono text-slate-400">
                              Due {action.dueDate}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Participants Widget (Image 2 Right Pane) */}
          <div className="rounded-2xl bg-[#111827] border border-slate-800/90 p-5 shadow-xl">
            <h4 className="text-sm font-bold text-white mb-3">Participants</h4>
            <div className="space-y-2.5">
              {[
                { name: "Alex Rivera", role: "Organizer · Product Lead", active: true },
                { name: "Dr. Elena Rostova", role: "Principal Biologist", active: true },
                { name: "Marcus Chen", role: "Lead Systems Architect", active: false },
                { name: "Sarah Jenkins", role: "Regulatory Affairs", active: false },
              ].map((participant, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                      {participant.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200 block">
                        {participant.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {participant.role}
                      </span>
                    </div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${participant.active ? "bg-emerald-400" : "bg-slate-600"}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
