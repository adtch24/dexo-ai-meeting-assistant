"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Meeting } from "@/lib/types";
import { formatDateTime, formatDuration, getSourceLabel } from "@/lib/utils";

interface TranscriptsViewProps {
  meetings: Meeting[];
  onSelectMeeting: (meetingId: string) => void;
}

export function TranscriptsView({
  meetings,
  onSelectMeeting,
}: TranscriptsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const meetingsWithTranscripts = meetings.filter((m) => m.transcript);

  const filtered = meetingsWithTranscripts.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = m.title.toLowerCase().includes(q);
    const textMatch = m.transcript?.segments.some((s) =>
      s.text.toLowerCase().includes(q)
    );
    return titleMatch || textMatch;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Meeting Transcripts Repository
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full conversational dialogue with speaker diarization and timestamp grounding.
          </p>
        </div>

        <span className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-300">
          {meetingsWithTranscripts.length} Transcripts Indexed
        </span>
      </div>

      {/* Search Input */}
      <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-4 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcripts by spoken words, quotes, or speaker name..."
            className="w-full rounded-xl bg-slate-900 border border-slate-700/80 pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Transcript Items */}
      <div className="space-y-4">
        {filtered.map((meeting) => {
          const transcript = meeting.transcript!;

          return (
            <div
              key={transcript.id}
              onClick={() => onSelectMeeting(meeting.id)}
              className="group rounded-2xl bg-[#0F172A] border border-slate-800 p-5 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer shadow-xl transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                    {getSourceLabel(meeting.source)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {transcript.language} • {transcript.wordCount} words
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {formatDateTime(meeting.scheduledAt)}
                </span>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                {meeting.title}
              </h3>

              {/* Sample segments snippet */}
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-2">
                {transcript.segments.slice(0, 2).map((seg) => (
                  <div key={seg.id} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="font-mono text-[10px] text-slate-500 flex-shrink-0 mt-0.5">
                      [{seg.startTimeFormatted}]
                    </span>
                    <div>
                      <strong className="text-indigo-300">{seg.speakerName}: </strong>
                      <span className="text-slate-300">{seg.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    Speakers: {transcript.detectedSpeakers.join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>View Full Transcript</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
