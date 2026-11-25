"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { fetchAIStatus, AIStatus } from "@/lib/services/aiService";

interface GeminiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: () => void;
}

export function GeminiConfigModal({
  isOpen,
  onClose,
  onConfigured,
}: GeminiConfigModalProps) {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const current = await fetchAIStatus();
      setStatus(current);
      if (current.connected && onConfigured) {
        onConfigured();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const exampleEnvText = `GEMINI_API_KEY=your_actual_gemini_api_key_here\nGEMINI_MODEL=gemini-3.1-flash-lite`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exampleEnvText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0F172A] border border-slate-800 shadow-2xl p-6 overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Google Gemini API Setup
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Required for real transcription, MoM synthesis & AI Q&A
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status indicator */}
        <div className="mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium bg-slate-900/80 border-slate-800">
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300">
                  Gemini API Connected ({status.model})
                </span>
              </>
            ) : status?.configured ? (
              <>
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-amber-300">
                  Key configured, but server connection failed. Check quota or validity.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span className="text-rose-300">
                  GEMINI_API_KEY is not configured
                </span>
              </>
            )}
          </div>

          <button
            onClick={checkStatus}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Verify</span>
          </button>
        </div>

        {/* Setup Instructions */}
        <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Dexo adheres to a <strong>Zero Secret Exposure Policy</strong>. Your Gemini API key is never exposed to the browser; it stays strictly on the Next.js server.
          </p>

          <div className="space-y-2">
            <span className="font-semibold text-slate-200 block">
              How to configure:
            </span>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
              <li>
                Get a free API key from{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Create or open the <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">.env.local</code> file in the project root:
              </li>
            </ol>
          </div>

          {/* Code snippet */}
          <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-slate-200">
            <pre className="overflow-x-auto whitespace-pre">{exampleEnvText}</pre>
            <button
              onClick={copyToClipboard}
              className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Copy snippet"
            >
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-300 flex items-start gap-2">
            <Terminal className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              After updating <code className="bg-amber-950/50 px-1 rounded">.env.local</code>, restart the Next.js development server so the server process reads the new environment variable.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Model: {status?.model || "gemini-3.1-flash-lite"}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

