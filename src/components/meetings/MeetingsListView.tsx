"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  PlusCircle,
  Calendar,
  Clock,
  Video,
  Mic,
  UploadCloud,
  FileText,
  Users,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Meeting, MeetingSource, MeetingStatus } from "@/lib/types";
import { MoMWorkflowActions } from "@/components/mom/MoMWorkflowActions";
import {
  formatDateTime,
  formatDuration,
  getSourceLabel,
  getStatusBadgeConfig,
} from "@/lib/utils";

interface MeetingsListViewProps {
  meetings: Meeting[];
  onSelectMeeting: (meetingId: string) => void;
  onOpenCreateModal: () => void;
  onUpdateMeeting?: (updated: Meeting) => void | Promise<void>;
}

export function MeetingsListView({
  meetings,
  onSelectMeeting,
  onOpenCreateModal,
  onUpdateMeeting,
}: MeetingsListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filteredMeetings = meetings.filter((meeting) => {
    // Search query filter
    const matchesQuery =
      !searchQuery ||
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.attendees.some((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Source filter
    const matchesSource =
      selectedSource === "all" || meeting.source === selectedSource;

    // Status filter
    const matchesStatus =
      selectedStatus === "all" || meeting.status === selectedStatus;

    return matchesQuery && matchesSource && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            All Meetings & Conversations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage scheduled Google Meets, in-person recordings, audio uploads, and transcript ingestions.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Meeting</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings by title, description, or attendee..."
              className="w-full rounded-xl bg-slate-900 border border-slate-700/80 pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Source Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: "all", label: "All Sources" },
              { id: "google_meet", label: "Google Meet" },
              { id: "physical", label: "In-Person" },
              { id: "audio_upload", label: "Audio Upload" },
              { id: "transcript_paste", label: "Transcript" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedSource(tab.id)}
                className={`rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                  selectedSource === tab.id
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Meeting Cards List */}
      <div className="space-y-3">
        {filteredMeetings.length === 0 ? (
          <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-12 text-center space-y-3">
            <Calendar className="h-10 w-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No meetings match your filters</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search terms or filter parameters, or create a new meeting to begin.
            </p>
          </div>
        ) : (
          filteredMeetings.map((meeting) => {
            const statusCfg = getStatusBadgeConfig(meeting.status);

            return (
              <div
                key={meeting.id}
                onClick={() => onSelectMeeting(meeting.id)}
                className="group rounded-2xl bg-[#0F172A] border border-slate-800 p-5 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer shadow-lg transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Source tag */}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                      {meeting.source === "google_meet" && <Video className="h-3.5 w-3.5 text-blue-400" />}
                      {meeting.source === "physical" && <Mic className="h-3.5 w-3.5 text-rose-400" />}
                      {meeting.source === "audio_upload" && <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />}
                      {meeting.source === "transcript_paste" && <FileText className="h-3.5 w-3.5 text-violet-400" />}
                      {getSourceLabel(meeting.source)}
                    </span>

                    <span className="text-slate-600">•</span>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusCfg.className}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.indicatorClassName}`} />
                      {statusCfg.label}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    {formatDateTime(meeting.scheduledAt)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {meeting.title}
                </h3>

                {meeting.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {meeting.description}
                  </p>
                )}

                {/* MoM Actions Bar */}
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                  <MoMWorkflowActions
                    meeting={meeting}
                    onUpdateMeeting={onUpdateMeeting}
                    onSelectMeeting={onSelectMeeting}
                    variant="compact"
                  />

                  <div className="flex items-center gap-1 text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Open Hub</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/40">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {formatDuration(meeting.durationMinutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      {meeting.attendees.length} Attendees
                    </span>
                    {meeting.mom && (
                      <span className="text-indigo-400 font-semibold">
                        {meeting.mom.decisions.length} Decisions • {meeting.mom.actionItems.length} Actions
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
