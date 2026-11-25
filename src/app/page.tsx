"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { OverviewView } from "@/components/dashboard/OverviewView";
import { MeetingsListView } from "@/components/meetings/MeetingsListView";
import { MeetingDetailView } from "@/components/meetings/MeetingDetailView";
import { ActionItemsView } from "@/components/action-items/ActionItemsView";
import { MoMView } from "@/components/mom/MoMView";
import { TranscriptsView } from "@/components/transcript/TranscriptsView";
import { GlobalSearchView } from "@/components/search/GlobalSearchView";
import { SettingsView } from "@/components/settings/SettingsView";
import { CalendarView } from "@/components/calendar/CalendarView";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { PhysicalRecordingModal } from "@/components/recording/PhysicalRecordingModal";
import { AudioUploadModal } from "@/components/upload/AudioUploadModal";
import { TranscriptInputModal } from "@/components/transcript/TranscriptInputModal";
import { mockMeetings, mockActionItems } from "@/lib/mock/data";
import { Meeting, ActionItem, ActionItemStatus } from "@/lib/types";
import {
  initAndSeedData,
  saveMeeting,
  updateActionItemStatus,
} from "@/lib/db";

export default function DexoDashboardPage() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<
    "overview" | "meetings" | "transcripts" | "mom" | "action-items" | "search" | "settings" | "detail" | "calendar" | "integrations"
  >("overview");

  // Selected Meeting for Workspace
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("meet_001");

  // App Data State (Initialized with persistent IndexedDB layer or fallback)
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings);
  const [actionItems, setActionItems] = useState<ActionItem[]>(mockActionItems);
  const [isDBLoading, setIsDBLoading] = useState<boolean>(true);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);

  // Modals State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);

  // 1. Initial Load & Hydration from IndexedDB
  useEffect(() => {
    let isMounted = true;

    async function loadDataFromPersistence() {
      try {
        const { meetings: persistedMeetings, actionItems: persistedActions } =
          await initAndSeedData(mockMeetings, mockActionItems);

        if (isMounted) {
          setMeetings(persistedMeetings);
          setActionItems(persistedActions);
          if (persistedMeetings.length > 0) {
            setSelectedMeetingId(persistedMeetings[0].id);
          }
          setIsDBLoading(false);
        }
      } catch (err) {
        console.warn("IndexedDB initialization warning:", err);
        if (isMounted) {
          setStorageNotice("Running in memory mode. Local storage is unavailable in this context.");
          setIsDBLoading(false);
        }
      }
    }

    loadDataFromPersistence();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Meeting Selection
  const handleSelectMeeting = (id: string) => {
    setSelectedMeetingId(id);
    setCurrentView("detail");
  };

  // Handle Action Item Status Toggle
  const handleToggleActionStatus = async (actionId: string) => {
    let nextStatus: ActionItemStatus = "completed";
    let completedAt: string | undefined = new Date().toISOString();

    // 1. Update global action items state
    setActionItems((prev) =>
      prev.map((act) => {
        if (act.id === actionId) {
          nextStatus = act.status === "completed" ? "open" : "completed";
          completedAt = nextStatus === "completed" ? new Date().toISOString() : undefined;
          return {
            ...act,
            status: nextStatus,
            completedAt,
          };
        }
        return act;
      })
    );

    // 2. Update status in IndexedDB
    try {
      await updateActionItemStatus(actionId, nextStatus, completedAt);
    } catch (err) {
      console.error("Failed to persist action item status update:", err);
    }

    // 3. Keep any parent meeting's MoM action items in sync
    setMeetings((prevMeetings) =>
      prevMeetings.map((m) => {
        if (m.mom?.actionItems?.some((a) => a.id === actionId)) {
          const updatedMoMItems = m.mom.actionItems.map((a) =>
            a.id === actionId ? { ...a, status: nextStatus, completedAt } : a
          );
          const updatedMeeting: Meeting = {
            ...m,
            mom: {
              ...m.mom,
              actionItems: updatedMoMItems,
              updatedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          };
          saveMeeting(updatedMeeting).catch((err) =>
            console.error("Failed to persist updated meeting MoM items:", err)
          );
          return updatedMeeting;
        }
        return m;
      })
    );
  };

  // Handle Meeting Content Update (MoM Edits, Publication, Metadata changes)
  const handleUpdateMeeting = async (updatedMeeting: Meeting) => {
    // 1. Update in-memory meetings state
    setMeetings((prev) =>
      prev.map((m) => (m.id === updatedMeeting.id ? updatedMeeting : m))
    );

    // 2. Sync any updated MoM action items into the global actionItems state
    if (updatedMeeting.mom?.actionItems) {
      setActionItems((prevActions) => {
        const otherActions = prevActions.filter(
          (act) => act.meetingId !== updatedMeeting.id
        );
        return [...otherActions, ...(updatedMeeting.mom?.actionItems || [])];
      });
    }

    // 3. Persist to IndexedDB
    try {
      await saveMeeting(updatedMeeting);
    } catch (err) {
      console.error("Failed to persist updated meeting to IndexedDB:", err);
      throw err;
    }
  };

  // Handle New Meeting Creation from Modal
  const handleCreatedMeeting = async (newMeetingData: Partial<Meeting>) => {
    const newMeeting: Meeting = {
      id: `meet_${Date.now()}`,
      title: newMeetingData.title || "New Meeting",
      description: newMeetingData.description || "",
      source: newMeetingData.source || "google_meet",
      status: newMeetingData.status || "scheduled",
      scheduledAt: newMeetingData.scheduledAt || new Date().toISOString(),
      durationMinutes: newMeetingData.durationMinutes || 45,
      meetUrl: newMeetingData.meetUrl || "https://meet.google.com/dexo-new-call",
      attendees: [
        {
          id: "att_organizer",
          name: "Alex Rivera",
          email: "alex.rivera@acmebiotech.io",
          role: "organizer",
          isConfirmed: true,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMeetings((prev) => [newMeeting, ...prev]);
    setSelectedMeetingId(newMeeting.id);
    setCurrentView("detail");

    try {
      await saveMeeting(newMeeting);
    } catch (err) {
      console.error("Failed to persist newly created meeting:", err);
    }
  };

  // Handle Physical Recording Complete (Acoustic Studio)
  const handlePhysicalRecordingComplete = async (data: {
    title: string;
    durationSeconds: number;
    audioBlob?: Blob;
    audioUrl?: string;
  }) => {
    const activeUrl = data.audioUrl || (data.audioBlob ? URL.createObjectURL(data.audioBlob) : undefined);

    const newMeeting: Meeting = {
      id: `meet_rec_${Date.now()}`,
      title: data.title,
      source: "physical",
      status: "ready_for_review",
      scheduledAt: new Date().toISOString(),
      durationMinutes: Math.max(1, Math.round(data.durationSeconds / 60)),
      locationOrRoom: "In-Person Recording",
      recordingUrl: activeUrl,
      recordingFileSizeMb: data.audioBlob ? parseFloat((data.audioBlob.size / (1024 * 1024)).toFixed(2)) : undefined,
      recordingDurationSeconds: data.durationSeconds,
      audioBlob: data.audioBlob,
      attendees: [
        {
          id: "att_1",
          name: "Alex Rivera",
          email: "alex.rivera@acmebiotech.io",
          role: "organizer",
        },
      ],
      // AI-generated MoM is not yet available (awaiting Phase 3 Gemini pipeline)
      mom: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Guarantee persistence to IndexedDB before switching views
    try {
      await saveMeeting(newMeeting, data.audioBlob);
    } catch (err) {
      console.error("Failed to persist in-person recording to IndexedDB:", err);
      throw err;
    }

    setMeetings((prev) => [newMeeting, ...prev]);
    setSelectedMeetingId(newMeeting.id);
    setCurrentView("detail");
  };

  // Handle Audio Upload Success
  const handleAudioUploadSuccess = async (data: {
    title: string;
    fileName: string;
    fileSizeBytes: number;
    audioBlob?: Blob;
  }) => {
    const activeUrl = data.audioBlob ? URL.createObjectURL(data.audioBlob) : undefined;

    const newMeeting: Meeting = {
      id: `meet_up_${Date.now()}`,
      title: data.title,
      source: "audio_upload",
      status: "ready_for_review",
      scheduledAt: new Date().toISOString(),
      durationMinutes: 30,
      recordingUrl: activeUrl,
      recordingFileSizeMb: +(data.fileSizeBytes / (1024 * 1024)).toFixed(2),
      audioBlob: data.audioBlob,
      attendees: [
        {
          id: "att_1",
          name: "Alex Rivera",
          email: "alex.rivera@acmebiotech.io",
          role: "organizer",
        },
      ],
      // AI-generated MoM is not yet available (awaiting Phase 3 Gemini pipeline)
      mom: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveMeeting(newMeeting, data.audioBlob);
    } catch (err) {
      console.error("Failed to persist audio upload to IndexedDB:", err);
      throw err;
    }

    setMeetings((prev) => [newMeeting, ...prev]);
    setSelectedMeetingId(newMeeting.id);
    setCurrentView("detail");
  };

  // Handle Transcript Input
  const handleSubmitTranscript = async (data: {
    title: string;
    text: string;
    language: string;
  }) => {
    const newMeeting: Meeting = {
      id: `meet_tr_${Date.now()}`,
      title: data.title,
      source: "transcript_paste",
      status: "ready_for_review",
      scheduledAt: new Date().toISOString(),
      durationMinutes: 25,
      attendees: [
        {
          id: "att_1",
          name: "Alex Rivera",
          email: "alex.rivera@acmebiotech.io",
          role: "organizer",
        },
      ],
      transcript: {
        id: `tr_${Date.now()}`,
        meetingId: `meet_tr_${Date.now()}`,
        rawText: data.text,
        language: data.language,
        detectedSpeakers: ["Alex Rivera", "Collaborator"],
        durationSeconds: 1500,
        wordCount: data.text.split(/\s+/).length,
        segments: [
          {
            id: `seg_${Date.now()}`,
            speakerName: "Alex Rivera",
            timestampMs: 0,
            startTimeFormatted: "00:00",
            text: data.text.slice(0, 300) + (data.text.length > 300 ? "..." : ""),
          },
        ],
      },
      // AI-generated MoM is not yet available (awaiting Phase 3 Gemini pipeline)
      mom: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveMeeting(newMeeting);
    } catch (err) {
      console.error("Failed to persist transcript meeting to IndexedDB:", err);
      throw err;
    }

    setMeetings((prev) => [newMeeting, ...prev]);
    setSelectedMeetingId(newMeeting.id);
    setCurrentView("detail");
  };

  // Loading Screen: Render high-fidelity skeleton during initial database load
  if (isDBLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090D16] text-slate-100">
        <div className="flex flex-col items-center gap-4 p-6 text-center animate-in fade-in duration-300">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/20">
            <span className="text-xl font-black text-white">D</span>
            <div className="absolute inset-0 rounded-2xl border border-indigo-400/30 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight">Initializing Dexo Workspace</h2>
            <p className="text-xs text-slate-400">Loading persistent meetings, audio streams, and action items...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId) || meetings[0];

  return (
    <div className="flex min-h-screen bg-[#090D16] text-slate-100">
      {/* Persistent Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace Area (offset by sidebar width on lg) */}
      <div className="flex flex-1 flex-col lg:pl-72 min-w-0">
        {/* Main Header */}
        <Header
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenRecordModal={() => setRecordModalOpen(true)}
          onOpenUploadModal={() => setUploadModalOpen(true)}
          onOpenCreateModal={() => setCreateModalOpen(true)}
          title={
            currentView === "overview"
              ? "Dashboard Overview"
              : currentView === "meetings"
              ? "Meetings & Sessions"
              : currentView === "transcripts"
              ? "Transcripts Repository"
              : currentView === "mom"
              ? "Minutes of Meeting (MoM)"
              : currentView === "action-items"
              ? "Action Items"
              : currentView === "search"
              ? "Search & AI Intelligence"
              : currentView === "calendar"
              ? "Meeting Calendar"
              : currentView === "integrations"
              ? "Workspace Integrations"
              : currentView === "settings"
              ? "Platform Settings"
              : selectedMeeting?.title || "Meeting Workspace"
          }
          subtitle={
            currentView === "overview"
              ? "Every conversation. Clear decisions. Actionable outcomes."
              : undefined
          }
        />

        {/* Optional Storage Notice Banner if private browsing limits IndexedDB */}
        {storageNotice && (
          <div className="mx-4 sm:mx-8 mt-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            {storageNotice}
          </div>
        )}

        {/* Dynamic Main Workspace Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentView === "overview" && (
            <OverviewView
              meetings={meetings}
              actionItems={actionItems}
              onOpenCreateModal={() => setCreateModalOpen(true)}
              onOpenRecordModal={() => setRecordModalOpen(true)}
              onOpenUploadModal={() => setUploadModalOpen(true)}
              onOpenTranscriptModal={() => setTranscriptModalOpen(true)}
              onSelectMeeting={handleSelectMeeting}
              onToggleActionStatus={handleToggleActionStatus}
              onUpdateMeeting={handleUpdateMeeting}
            />
          )}

          {currentView === "meetings" && (
            <MeetingsListView
              meetings={meetings}
              onSelectMeeting={handleSelectMeeting}
              onOpenCreateModal={() => setCreateModalOpen(true)}
              onUpdateMeeting={handleUpdateMeeting}
            />
          )}

          {currentView === "detail" && selectedMeeting && (
            <MeetingDetailView
              meeting={selectedMeeting}
              onBack={() => setCurrentView("overview")}
              onUpdateActionStatus={handleToggleActionStatus}
              onUpdateMeeting={handleUpdateMeeting}
            />
          )}

          {currentView === "action-items" && (
            <ActionItemsView
              actionItems={actionItems}
              onToggleStatus={handleToggleActionStatus}
              onSelectMeeting={handleSelectMeeting}
            />
          )}

          {currentView === "mom" && (
            <MoMView
              meetings={meetings}
              onSelectMeeting={handleSelectMeeting}
              onUpdateMeeting={handleUpdateMeeting}
            />
          )}

          {currentView === "transcripts" && (
            <TranscriptsView
              meetings={meetings}
              onSelectMeeting={handleSelectMeeting}
            />
          )}

          {currentView === "search" && (
            <GlobalSearchView
              meetings={meetings}
              onSelectMeeting={handleSelectMeeting}
            />
          )}

          {currentView === "calendar" && (
            <CalendarView
              meetings={meetings}
              onSelectMeeting={handleSelectMeeting}
              onOpenCreateModal={() => setCreateModalOpen(true)}
            />
          )}

          {currentView === "integrations" && <SettingsView />}

          {currentView === "settings" && <SettingsView />}
        </main>
      </div>

      {/* Workflow Intake Modals */}
      <CreateMeetingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onLaunchPhysicalRecord={() => setRecordModalOpen(true)}
        onLaunchAudioUpload={() => setUploadModalOpen(true)}
        onLaunchTranscriptInput={() => setTranscriptModalOpen(true)}
        onCreatedMeeting={handleCreatedMeeting}
      />

      <PhysicalRecordingModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onRecordingComplete={handlePhysicalRecordingComplete}
      />

      <AudioUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={handleAudioUploadSuccess}
      />

      <TranscriptInputModal
        isOpen={transcriptModalOpen}
        onClose={() => setTranscriptModalOpen(false)}
        onSubmitTranscript={handleSubmitTranscript}
      />
    </div>
  );
}
