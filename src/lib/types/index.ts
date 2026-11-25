export type MeetingSource =
  | "google_meet"
  | "physical"
  | "audio_upload"
  | "transcript_paste";

export type MeetingStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "awaiting_transcript"
  | "uploaded"
  | "processing"
  | "ready_for_review"
  | "published"
  | "failed"
  | "cancelled";

export type ActionItemStatus = "open" | "in_progress" | "completed" | "blocked";

export type ActionItemPriority = "low" | "medium" | "high" | "urgent";

export interface Attendee {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "organizer" | "participant";
  isConfirmed?: boolean;
}

export interface TranscriptSegment {
  id: string;
  speakerName: string;
  speakerRole?: string;
  timestampMs: number;
  startTimeFormatted: string;
  text: string;
  confidence?: number;
}

export interface Transcript {
  id: string;
  meetingId: string;
  rawText: string;
  segments: TranscriptSegment[];
  language: string;
  detectedSpeakers: string[];
  durationSeconds: number;
  wordCount: number;
}

export interface Decision {
  id: string;
  decisionText: string;
  decidedBy: string;
  context?: string;
  timestamp?: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  title: string;
  description?: string;
  ownerName: string;
  ownerEmail?: string;
  ownerAvatar?: string;
  dueDate: string;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  transcriptReference?: {
    segmentId: string;
    timestamp: string;
    quote: string;
  };
  createdAt: string;
  completedAt?: string;
}

export interface MoMDocument {
  id: string;
  meetingId: string;
  title: string;
  meetingDate: string;
  durationMinutes: number;
  attendeesSummary: string[];
  executiveSummary: string;
  agendaTopics: {
    topic: string;
    summary: string;
    timestamp?: string;
  }[];
  decisions: Decision[];
  actionItems: ActionItem[];
  risksAndBlockers: {
    risk: string;
    impact: "low" | "medium" | "high";
    mitigation?: string;
  }[];
  unresolvedQuestions: string[];
  nextSteps: string[];
  status: "draft" | "approved" | "published";
  version: number;
  publishedAt?: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  source: MeetingSource;
  status: MeetingStatus;
  scheduledAt: string;
  durationMinutes: number;
  locationOrRoom?: string;
  meetUrl?: string;
  calendarEventId?: string;
  recordingUrl?: string;
  recordingFileSizeMb?: number;
  recordingDurationSeconds?: number;
  audioBlob?: Blob;
  attendees: Attendee[];
  transcript?: Transcript;
  mom?: MoMDocument;
  actionItemsCount?: {
    total: number;
    completed: number;
    pending: number;
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QnAMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  citations?: {
    segmentId: string;
    speakerName: string;
    timestamp: string;
    quote: string;
  }[];
  timestamp: string;
}

export interface IntegrationCapability {
  id: string;
  name: string;
  provider: "google_meet" | "google_calendar" | "gemini" | "supabase" | "resend" | "live_meet_bot";
  category: "Calendar" | "AI Processing" | "Storage" | "Notifications" | "Live Bot";
  description: string;
  status: "connected" | "not_configured" | "pending_access" | "error";
  statusMessage: string;
  isConfigured: boolean;
  requiredScopes?: string[];
  lastSyncedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  organization: string;
}
