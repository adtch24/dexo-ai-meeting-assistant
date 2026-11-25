"use client";

import React, { useState } from "react";
import {
  X,
  Video,
  Mic,
  UploadCloud,
  FileText,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { MeetingSource, Meeting } from "@/lib/types";

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchPhysicalRecord: () => void;
  onLaunchAudioUpload: () => void;
  onLaunchTranscriptInput: () => void;
  onCreatedMeeting?: (meeting: Partial<Meeting>) => void;
}

export function CreateMeetingModal({
  isOpen,
  onClose,
  onLaunchPhysicalRecord,
  onLaunchAudioUpload,
  onLaunchTranscriptInput,
  onCreatedMeeting,
}: CreateMeetingModalProps) {
  const [selectedSource, setSelectedSource] = useState<MeetingSource>("google_meet");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("2026-10-30");
  const [time, setTime] = useState("14:00");
  const [duration, setDuration] = useState("45");
  const [attendeesInput, setAttendeesInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSource === "physical") {
      onClose();
      onLaunchPhysicalRecord();
      return;
    }
    if (selectedSource === "audio_upload") {
      onClose();
      onLaunchAudioUpload();
      return;
    }
    if (selectedSource === "transcript_paste") {
      onClose();
      onLaunchTranscriptInput();
      return;
    }

    // Google Meet workflow
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        if (onCreatedMeeting) {
          onCreatedMeeting({
            title: title || "Scheduled Google Meet Discussion",
            description,
            source: "google_meet",
            status: "scheduled",
            scheduledAt: `${date}T${time}:00Z`,
            durationMinutes: parseInt(duration),
            meetUrl: "https://meet.google.com/dexo-new-room",
          });
        }
      }, 1200);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0F172A] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">Create New Meeting</h2>
            <p className="text-xs text-slate-400">
              Select your meeting source to initiate AI transcription, MoM generation, and decision tracking.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Source Selection Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Meeting Source
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Google Meet */}
              <button
                type="button"
                onClick={() => setSelectedSource("google_meet")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  selectedSource === "google_meet"
                    ? "bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 ring-1 ring-indigo-500"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <div className={`p-2.5 rounded-lg mb-2.5 ${selectedSource === "google_meet" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}>
                  <Video className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold block">Google Meet</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Calendar & Drive</span>
              </button>

              {/* Physical Recording */}
              <button
                type="button"
                onClick={() => setSelectedSource("physical")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  selectedSource === "physical"
                    ? "bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 ring-1 ring-indigo-500"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <div className={`p-2.5 rounded-lg mb-2.5 ${selectedSource === "physical" ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                  <Mic className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold block">In-Person</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Live Recorder</span>
              </button>

              {/* Audio Upload */}
              <button
                type="button"
                onClick={() => setSelectedSource("audio_upload")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  selectedSource === "audio_upload"
                    ? "bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 ring-1 ring-indigo-500"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <div className={`p-2.5 rounded-lg mb-2.5 ${selectedSource === "audio_upload" ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                  <UploadCloud className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold block">Audio Upload</span>
                <span className="text-[10px] text-slate-400 mt-0.5">MP3, M4A, WAV</span>
              </button>

              {/* Transcript Paste */}
              <button
                type="button"
                onClick={() => setSelectedSource("transcript_paste")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  selectedSource === "transcript_paste"
                    ? "bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 ring-1 ring-indigo-500"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <div className={`p-2.5 rounded-lg mb-2.5 ${selectedSource === "transcript_paste" ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold block">Transcript</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Paste or VTT</span>
              </button>
            </div>
          </div>

          {/* Source specific hints */}
          {selectedSource === "google_meet" && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-blue-200">
                    Google Calendar & Meet Synchronization
                  </div>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    Dexo will create an event on your Google Calendar, invite participants, and automatically sync post-meeting recordings or transcripts saved to your authorized Google Drive.
                  </p>
                  <p className="text-[11px] text-blue-300/80 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Note: Real-time bot call joining requires Google Meet Media API tenant access. Post-meeting Drive sync is currently operational.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedSource === "physical" && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4">
              <div className="flex items-start gap-3">
                <Mic className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-rose-200">
                  <div className="font-semibold">In-Person Meeting Studio</div>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    Clicking continue will open the mobile-optimized physical recording studio with consent validation, live waveform visualizer, and microphone controls.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedSource === "audio_upload" && (
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4">
              <div className="flex items-start gap-3">
                <UploadCloud className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-cyan-200">
                  <div className="font-semibold">Audio File Ingestion</div>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    Upload pre-recorded audio from Zoom, Teams, voice memos, or podcasts. Supports MP3, WAV, M4A, AAC up to 100MB.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedSource === "transcript_paste" && (
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-violet-200">
                  <div className="font-semibold">Direct Transcript Normalization</div>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    Paste raw text or upload a .vtt/.srt file to extract executive summaries, decisions, and action items via Gemini.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields (Active for Google Meet / Scheduled) */}
          {selectedSource === "google_meet" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Executive Strategy Alignment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Objective or Agenda
                </label>
                <textarea
                  rows={2}
                  placeholder="Summarize key discussion goals, context, and expected decisions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  Attendee Emails (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="sarah@acmebiotech.io, marcus@acmebiotech.io"
                  value={attendeesInput}
                  onChange={(e) => setAttendeesInput(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Meeting...
                </>
              ) : showSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Meeting Scheduled!
                </>
              ) : selectedSource === "physical" ? (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  Launch Recorder
                </>
              ) : selectedSource === "audio_upload" ? (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
                  Proceed to Upload
                </>
              ) : selectedSource === "transcript_paste" ? (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  Input Transcript
                </>
              ) : (
                <>
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule Google Meet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
