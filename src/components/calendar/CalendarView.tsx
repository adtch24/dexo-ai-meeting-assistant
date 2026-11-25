"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Users,
  Plus,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  CalendarDays,
} from "lucide-react";
import { Meeting } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

interface CalendarViewProps {
  meetings: Meeting[];
  onSelectMeeting: (meetingId: string) => void;
  onOpenCreateModal: () => void;
}

export function CalendarView({
  meetings,
  onSelectMeeting,
  onOpenCreateModal,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedDay, setSelectedDay] = useState<number>(4);

  // Month days setup (November 2026 for demonstration)
  const daysInMonth = 30;
  const startDayOfWeek = 3; // Wednesday

  // Days with meetings
  const meetingDays = [2, 4, 8, 12, 17, 24];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Meeting Calendar
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronize scheduled sessions, view upcoming agendas, and manage attendee invites.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-[#111827] border border-slate-800 p-1">
            <button
              onClick={() => setViewMode("month")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "month"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "week"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Week
            </button>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* Google Calendar Integration Status Banner */}
      <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Google Calendar Two-Way Sync</span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px]">
                Active
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Authorized via OAuth 2.0. Meeting recordings automatically ingest from Google Drive post-call.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 text-xs font-semibold transition-colors shrink-0"
        >
          Sync Now
        </button>
      </div>

      {/* Main Grid: Calendar & Day Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl bg-[#111827] border border-slate-800/90 p-6 shadow-xl">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-white">
              November 2026
            </h3>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots before first day */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 rounded-xl bg-slate-900/20 opacity-30" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDay === day;
              const hasMeeting = meetingDays.includes(day);

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-20 rounded-xl p-2 cursor-pointer transition-all flex flex-col justify-between border ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/20"
                      : hasMeeting
                      ? "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
                      : "bg-slate-900/30 border-slate-800/40 hover:bg-slate-900/60"
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      isSelected
                        ? "text-indigo-400 font-bold"
                        : hasMeeting
                        ? "text-white"
                        : "text-slate-400"
                    }`}
                  >
                    {day}
                  </span>

                  {hasMeeting && (
                    <div className="flex flex-col gap-1">
                      <div className="w-full truncate rounded bg-indigo-500/20 text-indigo-300 px-1 py-0.5 text-[9px] font-semibold border border-indigo-500/30">
                        {day === 4 ? "Sprint Review" : "Sync Call"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-[#111827] border border-slate-800/90 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Agenda for Nov {selectedDay}, 2026
                </h4>
                <span className="text-[11px] text-slate-400">
                  {meetings.length} sessions scheduled
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {meetings.slice(0, 3).map((meeting) => (
                <div
                  key={meeting.id}
                  onClick={() => onSelectMeeting(meeting.id)}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-[#151E2E] cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                    <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                      <Clock className="h-3 w-3" />
                      10:00 - 10:45 AM
                    </span>
                    <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                      Google Meet
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-white mb-2">
                    {meeting.title}
                  </h5>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {meeting.attendees.length} Attendees
                    </span>
                    <span className="text-indigo-400 font-semibold hover:underline">
                      Open MoM →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

