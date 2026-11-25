"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronRight,
  Printer,
  Sparkles,
} from "lucide-react";
import { Meeting } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { MoMWorkflowActions } from "./MoMWorkflowActions";

interface MoMViewProps {
  meetings: Meeting[];
  onSelectMeeting: (meetingId: string) => void;
  onUpdateMeeting?: (updated: Meeting) => void | Promise<void>;
}

export function MoMView({ meetings, onSelectMeeting, onUpdateMeeting }: MoMViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const momMeetings = meetings.filter((m) => m.mom);
  const pendingMeetings = meetings.filter(
    (m) => !m.mom && (m.audioBlob || m.recordingUrl || (m.transcript && m.transcript.rawText.trim()))
  );

  const filtered = momMeetings.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.mom?.executiveSummary.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || m.mom?.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Minutes of Meeting (MoM) Documents
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured records, confirmed decisions, and approved executive deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300">
            {momMeetings.length} Documents Available
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-4 shadow-lg flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search MoM executive summaries and decisions..."
            className="w-full rounded-xl bg-slate-900 border border-slate-700/80 pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {[
            { id: "all", label: "All MoMs" },
            { id: "published", label: "Published" },
            { id: "draft", label: "Ready for Review" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MoM Cards Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-12 text-center space-y-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 max-w-fit mx-auto">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No MoM Documents Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "No Minutes of Meeting match your current search and filter criteria."
                : "Minutes of Meeting documents are synthesized when recordings or transcripts undergo AI processing in Phase 3. Meetings with saved audio or transcripts are accessible from the Meetings tab."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((meeting) => {
            const mom = meeting.mom!;
            const isPub = mom.status === "published";

            return (
              <div
                key={mom.id}
                onClick={() => onSelectMeeting(meeting.id)}
                className="group rounded-2xl bg-[#0F172A] border border-slate-800 p-6 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer shadow-xl flex flex-col justify-between transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                        isPub
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isPub ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"
                        }`}
                      />
                      {isPub ? "Published & Approved" : "Ready for Human Review"}
                    </span>

                    <span className="text-[11px] font-mono text-slate-400">
                      {mom.meetingDate}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {meeting.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {mom.executiveSummary}
                  </p>

                  {/* Key counts */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {mom.decisions.length} Decisions
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      {mom.actionItems.length} Action Items
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <MoMWorkflowActions
                    meeting={meeting}
                    onUpdateMeeting={onUpdateMeeting}
                    onSelectMeeting={onSelectMeeting}
                    variant="compact"
                  />

                  <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                    <span>Open MoM</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Sessions Section: Meetings with Audio or Transcripts ready for MoM Generation */}
      {pendingMeetings.length > 0 && (
        <div className="mt-8 pt-8 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>Sessions Ready for MoM Generation ({pendingMeetings.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                These meetings have audio recordings or transcripts stored in IndexedDB but have not yet undergone Gemini MoM extraction.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingMeetings.map((pm) => (
              <div
                key={pm.id}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono">{formatDateTime(pm.scheduledAt || pm.createdAt)}</span>
                    <span className="text-indigo-400 font-medium">
                      {pm.audioBlob || pm.recordingUrl ? "Audio Stream Available" : "Transcript Stored"}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{pm.title}</h4>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <MoMWorkflowActions
                    meeting={pm}
                    onUpdateMeeting={onUpdateMeeting}
                    onSelectMeeting={onSelectMeeting}
                    variant="compact"
                  />

                  <button
                    onClick={() => onSelectMeeting(pm.id)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <span>View Session</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
