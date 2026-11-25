import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MeetingSource, MeetingStatus, ActionItemStatus, ActionItemPriority } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function formatSecondsToTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getSourceLabel(source: MeetingSource): string {
  switch (source) {
    case "google_meet":
      return "Google Meet";
    case "physical":
      return "In-Person Recording";
    case "audio_upload":
      return "Audio File Upload";
    case "transcript_paste":
      return "Transcript Input";
  }
}

export function getStatusBadgeConfig(status: MeetingStatus): {
  label: string;
  className: string;
  indicatorClassName: string;
} {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        className: "bg-slate-800 text-slate-300 border-slate-700",
        indicatorClassName: "bg-slate-400",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        indicatorClassName: "bg-blue-400",
      };
    case "in_progress":
      return {
        label: "In Progress",
        className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        indicatorClassName: "bg-amber-400 animate-pulse",
      };
    case "awaiting_transcript":
      return {
        label: "Awaiting Sync",
        className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        indicatorClassName: "bg-purple-400",
      };
    case "uploaded":
      return {
        label: "Audio Uploaded",
        className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        indicatorClassName: "bg-indigo-400",
      };
    case "processing":
      return {
        label: "AI Processing",
        className: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
        indicatorClassName: "bg-indigo-400 animate-spin",
      };
    case "ready_for_review":
      return {
        label: "Ready for Review",
        className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        indicatorClassName: "bg-cyan-400",
      };
    case "published":
      return {
        label: "Published",
        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        indicatorClassName: "bg-emerald-400",
      };
    case "failed":
      return {
        label: "Processing Failed",
        className: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        indicatorClassName: "bg-rose-400",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-slate-800 text-slate-400 border-slate-700",
        indicatorClassName: "bg-slate-500",
      };
  }
}

export function getActionStatusBadge(status: ActionItemStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "open":
      return { label: "Open", className: "bg-slate-800 text-slate-300 border-slate-700" };
    case "in_progress":
      return { label: "In Progress", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" };
    case "completed":
      return { label: "Completed", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "blocked":
      return { label: "Blocked", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
  }
}

export function getPriorityBadge(priority: ActionItemPriority): {
  label: string;
  className: string;
} {
  switch (priority) {
    case "low":
      return { label: "Low", className: "text-slate-400 bg-slate-800/60" };
    case "medium":
      return { label: "Medium", className: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    case "high":
      return { label: "High", className: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    case "urgent":
      return { label: "Urgent", className: "text-rose-400 bg-rose-500/10 border-rose-500/20 font-semibold" };
  }
}
