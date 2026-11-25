"use client";

import React, { useState } from "react";
import {
  FileText,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Upload,
} from "lucide-react";

interface TranscriptInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitTranscript?: (data: {
    title: string;
    text: string;
    language: string;
  }) => void;
}

export function TranscriptInputModal({
  isOpen,
  onClose,
  onSubmitTranscript,
}: TranscriptInputModalProps) {
  const [title, setTitle] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setTranscriptText(content);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcriptText.trim()) return;

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        if (onSubmitTranscript) {
          onSubmitTranscript({
            title: title || "Pasted Meeting Transcript",
            text: transcriptText,
            language,
          });
        }
        onClose();
      }, 1000);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0F172A] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Input Meeting Transcript</h3>
              <p className="text-[11px] text-slate-400">
                Paste existing transcript text or upload .txt/.vtt/.srt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Retrospective & Architecture Review"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Transcript Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="de-DE">German</option>
                <option value="fr-FR">French</option>
                <option value="ja-JP">Japanese</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-750 hover:text-white cursor-pointer transition-colors">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload .txt / .vtt File</span>
                <input
                  type="file"
                  accept=".txt,.vtt,.srt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Transcript Text / Dialogue *
              </label>
              <span className="text-[11px] text-slate-500">
                Supports timestamps like [00:15] and speaker tags
              </span>
            </div>
            <textarea
              required
              rows={8}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Paste transcript here, for example:&#10;[00:15] Alex: Welcome everyone to the architecture review.&#10;[00:30] Sarah: We verified that Gemini 3.8 Flash structured output eliminates hallucinations.&#10;[01:05] Marcus: I will complete the database schema by Friday."
              className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {isSuccess && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Transcript parsed and normalized. Generating structured MoM...</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isProcessing || !transcriptText.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Extracting MoM...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate MoM via Gemini
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
