"use client";

import React, { useState } from "react";
import {
  Search,
  Sparkles,
  Send,
  Calendar,
  FileCheck2,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Meeting } from "@/lib/types";

interface GlobalSearchViewProps {
  meetings: Meeting[];
  onSelectMeeting: (meetingId: string) => void;
}

export function GlobalSearchView({
  meetings,
  onSelectMeeting,
}: GlobalSearchViewProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    answer: string;
    relevantMeetings: { meeting: Meeting; quote: string }[];
  } | null>(null);

  const handleSearch = (customQuery?: string) => {
    const q = customQuery || query;
    if (!q.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setSearchResult({
        answer: `Across your meetings, key architectural consensus includes **adopting Gemini 3.8 Flash with strict JSON schemas** to prevent hallucination, and **prioritizing post-meeting Google Drive transcript synchronization** while awaiting official Google Meet Media API tenant approval. Database migrations with multi-tenant Row Level Security are scheduled for Friday, November 2nd.`,
        relevantMeetings: [
          {
            meeting: meetings[0],
            quote: "We decided today that we will officially ship post-meeting calendar and drive transcript syncing first...",
          },
          {
            meeting: meetings[1],
            quote: "Adopt Next.js 15+ App Router as the unified monolithic framework.",
          },
        ],
      });
    }, 700);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Search & AI Intelligence Knowledge Base
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Ask questions across all meeting transcripts, decisions, and action items. Answers are grounded strictly in your conversational history.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything, e.g. 'What did we decide about Google Meet live bot?' or 'Who is handling database migrations?'"
              className="w-full rounded-xl bg-slate-900 border border-slate-700/80 pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-40 transition-all"
          >
            {isSearching ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>Ask Dexo</span>
          </button>
        </form>

        {/* Suggested Prompts */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] text-slate-500 font-medium">Try asking:</span>
          {[
            "What did we decide regarding the Google Meet live bot?",
            "Who owns the database schema and what is the deadline?",
            "What were the key takeaways from the Customer Advisory Board?",
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(prompt);
                handleSearch(prompt);
              }}
              className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-[11px] text-slate-300 hover:border-indigo-500 hover:text-white transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* AI Answer & Source Meetings */}
      {searchResult && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0F172A] border border-indigo-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Synthesized Answer</h3>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {searchResult.answer}
            </p>

            <div className="pt-4 border-t border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Cited Source Meetings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResult.relevantMeetings.map(({ meeting, quote }, i) => (
                  <div
                    key={i}
                    onClick={() => onSelectMeeting(meeting.id)}
                    className="rounded-xl bg-slate-900 border border-slate-800 p-4 hover:border-slate-700 cursor-pointer space-y-2 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">
                        {meeting.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-indigo-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                      "{quote}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
