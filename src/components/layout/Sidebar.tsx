"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  FileCheck2,
  CheckSquare,
  Search,
  Settings,
  PlusCircle,
  ShieldCheck,
  Building2,
  ChevronDown,
  Sparkles,
  Zap,
  CalendarDays,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Logo } from "./Logo";
import { mockCurrentUser, mockActionItems, mockMeetings } from "@/lib/mock/data";

export type NavViewType =
  | "overview"
  | "meetings"
  | "transcripts"
  | "mom"
  | "action-items"
  | "search"
  | "calendar"
  | "integrations"
  | "settings"
  | "detail";

interface SidebarProps {
  currentView: string;
  onSelectView: (view: any) => void;
  onOpenCreateModal?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  currentView,
  onSelectView,
  onOpenCreateModal,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const pendingActionCount = mockActionItems.filter(
    (a) => a.status === "open" || a.status === "in_progress"
  ).length;

  const readyMoMCount = mockMeetings.filter(
    (m) => m.status === "ready_for_review"
  ).length;

  const navItems = [
    {
      id: "overview",
      name: "Overview",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "meetings",
      name: "Meetings",
      icon: Calendar,
      badge: mockMeetings.length.toString(),
      badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
    },
    {
      id: "transcripts",
      name: "Transcripts",
      icon: FileText,
      badge: null,
    },
    {
      id: "mom",
      name: "Minutes of Meeting",
      icon: FileCheck2,
      badge: readyMoMCount > 0 ? `${readyMoMCount} new` : null,
      badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    },
    {
      id: "action-items",
      name: "My Action Items",
      icon: CheckSquare,
      badge: pendingActionCount.toString(),
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    },
    {
      id: "search",
      name: "Search & AI Q&A",
      icon: Search,
      badge: null,
    },
    {
      id: "calendar",
      name: "Calendar",
      icon: CalendarDays,
      badge: "Sync",
      badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    },
    {
      id: "integrations",
      name: "Integrations",
      icon: Layers,
      badge: "6 Active",
      badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    {
      id: "settings",
      name: "Settings",
      icon: Settings,
      badge: null,
    },
  ];

  const handleNavClick = (viewId: string) => {
    onSelectView(viewId);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0B1120] border-r border-slate-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800/80">
          <button
            onClick={() => handleNavClick("overview")}
            className="flex items-center text-left focus:outline-none"
          >
            <Logo size="md" showTagline={true} />
          </button>
        </div>

        {/* Workspace Selector Dropdown */}
        <div className="px-4 pt-4 pb-1">
          <div className="relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="flex w-full items-center justify-between rounded-xl bg-slate-900/80 border border-slate-800/90 px-3.5 py-2.5 text-left text-xs transition-all hover:border-slate-700 hover:bg-slate-800/60 focus:outline-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-100 truncate">
                    Acme Biotech Labs
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    Enterprise · 14 Seats
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
            </button>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="px-4 py-3">
          <button
            onClick={() => {
              if (onOpenCreateModal) onOpenCreateModal();
              if (onMobileClose) onMobileClose();
            }}
            className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-600/40 active:scale-[0.98] transition-all"
          >
            <PlusCircle className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
            <span>Create Meeting</span>
          </button>
        </div>

        {/* Primary Navigation List */}
        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Workspaces
          </div>

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive
                        ? "text-indigo-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                      item.badgeColor ||
                      "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Plan / Usage Widget (Matching Reference UI) */}
        <div className="p-4 mx-3 mb-2 rounded-2xl bg-[#111827] border border-slate-800/90 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-300">
              AI Processing Quota
            </span>
            <span className="text-[11px] font-semibold text-indigo-400">
              12 / 15 hrs
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full"
              style={{ width: "80%" }}
            />
          </div>
          <button
            onClick={() => handleNavClick("settings")}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition-colors"
          >
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Manage Plan</span>
            <ArrowUpRight className="h-3 w-3 text-slate-400 ml-auto" />
          </button>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <img
              src={mockCurrentUser.avatarUrl}
              alt={mockCurrentUser.name}
              className="h-9 w-9 rounded-full object-cover border border-indigo-500/40"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-white truncate">
                {mockCurrentUser.name}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {mockCurrentUser.email}
              </span>
            </div>
            <button
              onClick={() => handleNavClick("settings")}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
