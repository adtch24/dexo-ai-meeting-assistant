"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Plus,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { ActionItem, ActionItemStatus, ActionItemPriority } from "@/lib/types";
import { getActionStatusBadge, getPriorityBadge } from "@/lib/utils";

interface ActionItemsViewProps {
  actionItems: ActionItem[];
  onToggleStatus: (actionId: string) => void;
  onSelectMeeting?: (meetingId: string) => void;
}

export function ActionItemsView({
  actionItems: initialItems,
  onToggleStatus,
  onSelectMeeting,
}: ActionItemsViewProps) {
  const [items, setItems] = useState<ActionItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleToggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus: ActionItemStatus =
            item.status === "completed" ? "open" : "completed";
          return {
            ...item,
            status: nextStatus,
            completedAt: nextStatus === "completed" ? new Date().toISOString() : undefined,
          };
        }
        return item;
      })
    );
    onToggleStatus(id);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.meetingTitle?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" || item.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Action Items & Deliverables
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-meeting actionable tasks extracted by Gemini with verified owners and deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300">
            {items.filter((i) => i.status === "completed").length} / {items.length} Completed
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title, owner, or meeting name..."
              className="w-full rounded-xl bg-slate-900 border border-slate-700/80 pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: "all", label: "All Statuses" },
              { id: "open", label: "Open" },
              { id: "in_progress", label: "In Progress" },
              { id: "completed", label: "Completed" },
              { id: "blocked", label: "Blocked" },
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
      </div>

      {/* Task List Table */}
      <div className="rounded-2xl bg-[#0F172A] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/60">
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Action Item</th>
                <th className="py-3.5 px-4">Meeting Context</th>
                <th className="py-3.5 px-4">Assignee</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4 text-right">Source Quote</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No action items found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const statusCfg = getActionStatusBadge(item.status);
                  const priorityCfg = getPriorityBadge(item.priority);
                  const isDone = item.status === "completed";

                  return (
                    <tr
                      key={item.id}
                      className={`group hover:bg-slate-900/40 transition-colors ${
                        isDone ? "opacity-60" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggle(item.id)}
                          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                            isDone
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "border-slate-700 bg-slate-900 hover:border-indigo-500"
                          }`}
                        >
                          {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                      </td>

                      {/* Title & Description */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div
                          className={`font-semibold text-slate-100 ${
                            isDone ? "line-through text-slate-400" : ""
                          }`}
                        >
                          {item.title}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </td>

                      {/* Related Meeting */}
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        {onSelectMeeting && item.meetingId ? (
                          <button
                            onClick={() => onSelectMeeting(item.meetingId)}
                            className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline text-left truncate block max-w-[200px]"
                          >
                            {item.meetingTitle || "View Meeting"}
                          </button>
                        ) : (
                          <span className="text-slate-400">
                            {item.meetingTitle || "General"}
                          </span>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-[10px] font-bold text-indigo-300 flex items-center justify-center">
                            {item.ownerName.charAt(0)}
                          </div>
                          <span className="text-slate-200 font-medium">
                            {item.ownerName}
                          </span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-300">
                        {item.dueDate}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${priorityCfg.className}`}
                        >
                          {priorityCfg.label}
                        </span>
                      </td>

                      {/* Citation Reference */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {item.transcriptReference ? (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-slate-900 border border-slate-800 px-2 py-1 text-[10px] font-mono text-slate-400"
                            title={item.transcriptReference.quote}
                          >
                            [{item.transcriptReference.timestamp}]
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
