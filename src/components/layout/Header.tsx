"use client";

import React from "react";
import {
  Menu,
  Mic,
  Upload,
  CalendarPlus,
  Search,
  Bell,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { mockCurrentUser } from "@/lib/mock/data";

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenRecordModal: () => void;
  onOpenUploadModal: () => void;
  onOpenCreateModal: () => void;
  title?: string;
  subtitle?: string;
}

export function Header({
  onToggleMobileMenu,
  onOpenRecordModal,
  onOpenUploadModal,
  onOpenCreateModal,
  title = "Overview",
  subtitle,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-800/80 bg-[#090D16]/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleMobileMenu}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Gemini AI Active
            </span>
          </div>
          {subtitle && (
            <p className="hidden md:block text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Quick Action Buttons & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Physical Record Action */}
        <button
          onClick={onOpenRecordModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/40 active:scale-95 transition-all"
        >
          <Mic className="h-3.5 w-3.5 text-rose-400" />
          <span className="hidden sm:inline">Record</span>
        </button>

        {/* Quick Upload Audio Action */}
        <button
          onClick={onOpenUploadModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 transition-all"
        >
          <Upload className="h-3.5 w-3.5 text-slate-300" />
          <span className="hidden sm:inline">Upload Audio</span>
        </button>

        {/* Schedule Meet Action */}
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Meeting</span>
        </button>

        <div className="hidden sm:block h-5 w-[1px] bg-slate-800 mx-1" />

        {/* Notification Bell */}
        <button className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500" />
        </button>

        {/* User Avatar */}
        <img
          src={mockCurrentUser.avatarUrl}
          alt={mockCurrentUser.name}
          className="h-8 w-8 rounded-full object-cover border border-indigo-500/30 ml-1"
        />
      </div>
    </header>
  );
}
