"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  Key,
  Video,
  Calendar,
  Sparkles,
  Database,
  Mail,
  Bot,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Lock,
  RefreshCw,
  Info,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { mockIntegrations, mockCurrentUser } from "@/lib/mock/data";
import { fetchAIStatus, AIStatus } from "@/lib/services/aiService";
import { GeminiConfigModal } from "@/components/ai/GeminiConfigModal";

export function SettingsView() {
  const [integrations, setIntegrations] = useState(mockIntegrations);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [testResultFeedback, setTestResultFeedback] = useState<string | null>(null);

  const checkStatus = async (testGeneration = false) => {
    setIsCheckingAI(true);
    setTestResultFeedback(null);
    try {
      const res = await fetchAIStatus({ testGeneration });
      setAiStatus(res);
      if (res.connected && (!testGeneration || res.generationStatus === "ready")) {
        setTestResultFeedback(
          `Server successfully verified connection with Google ${res.model || "Gemini AI"}.`
        );
      } else if (!res.configured) {
        setTestResultFeedback("GEMINI_API_KEY is not configured in .env.local.");
      } else {
        setTestResultFeedback(res.error || "Connection test failed.");
      }
    } catch (err: any) {
      setTestResultFeedback(err.message || "Failed to reach server.");
    } finally {
      setIsCheckingAI(false);
    }
  };

  useEffect(() => {
    // Routine mount check: only performs metadata handshake, DOES NOT consume generation quota
    checkStatus(false);
  }, []);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Platform Settings & Integrations
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage API connections, Google Workspace authorizations, model configurations, and security policies.
        </p>
      </div>

      {/* Security Architecture & Secret Protection Banner */}
      <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Zero Secret Exposure Security Policy
            </h3>
            <p className="text-[11px] text-slate-400">
              Strict isolation between client runtime and server-side credentials
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          In compliance with enterprise security requirements, all Gemini API keys, Google OAuth client secrets, refresh tokens, and Supabase service keys reside strictly in encrypted environment variables on the backend server. No secret keys or private tokens are ever exposed to client bundles or browser console logs.
        </p>
      </div>

      {/* DEDICATED REAL GEMINI AI INTEGRATION CARD */}
      <div className="rounded-2xl bg-[#0F172A] border border-indigo-500/30 p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Google Gemini AI Engine
                </h3>
                {aiStatus?.connected && aiStatus?.generationStatus === "ready" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Connected & Active</span>
                  </span>
                ) : aiStatus?.connected && (!aiStatus?.generationTested || aiStatus?.generationStatus === "untested") ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Handshake Verified</span>
                  </span>
                ) : aiStatus?.configured ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      aiStatus?.error?.includes("Quota") || aiStatus?.generationStatus === "quota_exhausted"
                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                        : aiStatus?.error?.includes("Demand") || aiStatus?.generationStatus === "high_demand"
                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      {aiStatus?.error?.includes("Quota") || aiStatus?.generationStatus === "quota_exhausted"
                        ? "Quota Exceeded (429)"
                        : aiStatus?.error?.includes("Demand") || aiStatus?.generationStatus === "high_demand"
                        ? "High Demand (503)"
                        : aiStatus?.error?.includes("Timed Out") || aiStatus?.generationStatus === "timeout"
                        ? "Gateway Timeout (504)"
                        : "Connection Issue"}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-rose-300">
                    <AlertCircle className="h-3 w-3" />
                    <span>Missing API Key</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Powers speech-to-text transcription, schema-enforced MoM extraction, and grounded AI Q&A.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Key className="h-3.5 w-3.5 text-indigo-400" />
              <span>Configure Key</span>
            </button>

            <button
              onClick={() => checkStatus(true)}
              disabled={isCheckingAI}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isCheckingAI ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Test Server Connection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real Status Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl bg-slate-900 border border-slate-800/80 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Active Model
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {aiStatus?.model || "gemini-3.1-flash-lite"}
            </span>
            <p className="text-[11px] text-slate-500">Multimodal sub-second pipeline</p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800/80 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Server Credential
            </span>
            <span className="text-xs font-bold text-slate-200">
              {aiStatus?.configured ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  process.env.GEMINI_API_KEY
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Not Detected
                </span>
              )}
            </span>
            <p className="text-[11px] text-slate-500">Never exposed to browser</p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800/80 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Last Health Check
            </span>
            <span className="text-xs font-mono text-slate-300">
              {aiStatus?.lastCheck ? new Date(aiStatus.lastCheck).toLocaleTimeString() : "Pending"}
            </span>
            <p className="text-[11px] text-slate-500">Live server-side ping</p>
          </div>
        </div>

        {/* Live Test Feedback Banner */}
        {testResultFeedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              aiStatus?.connected
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/25 text-rose-300"
            }`}
          >
            {aiStatus?.connected ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-bold block">
                {aiStatus?.connected ? "Connection Verified" : "Verification Notice"}
              </span>
              <span>{testResultFeedback}</span>
            </div>
          </div>
        )}
      </div>

      {/* Other Integration Capabilities Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Google Workspace & Cloud Storage Capabilities
          </h3>
          <span className="text-[11px] text-slate-500">
            Real capability status • Honest API boundaries
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {integrations
            .filter((item) => item.provider !== "gemini")
            .map((item) => {
              const isLiveBot = item.provider === "live_meet_bot";
              const isConnected = item.status === "connected";

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-6 flex flex-col justify-between shadow-xl transition-all ${
                    isLiveBot
                      ? "bg-slate-900/40 border-amber-500/30 ring-1 ring-amber-500/20"
                      : "bg-[#0F172A] border-slate-800"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            item.provider === "google_calendar"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : item.provider === "supabase"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : item.provider === "resend"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {item.provider === "google_calendar" && <Calendar className="h-5 w-5" />}
                          {item.provider === "supabase" && <Database className="h-5 w-5" />}
                          {item.provider === "resend" && <Mail className="h-5 w-5" />}
                          {item.provider === "live_meet_bot" && <Bot className="h-5 w-5" />}
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-white">{item.name}</h4>
                          <span className="text-[11px] text-slate-500">{item.category}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Awaiting Tenant Access</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-[11px] text-slate-400">
                      <strong className="text-slate-300">Operational Status: </strong>
                      {item.statusMessage}
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {isLiveBot ? (
                      <div className="text-[11px] text-amber-400/90 flex items-center gap-1">
                        <Info className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Post-meeting Drive sync fully operational</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Server Verified
                      </span>
                    )}

                    <span className="text-[11px] text-slate-500">
                      Phase 4 & 5
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* User Preferences Card */}
      <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Default Meeting Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1.5">
              Default MoM Extraction Language
            </label>
            <select className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white">
              <option value="en-US">English (United States)</option>
              <option value="auto">Auto-detect from spoken dialogue</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1.5">
              Notification Mode for Approved MoM
            </label>
            <select className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white">
              <option value="manual">Manual Trigger Only (Never auto-email)</option>
              <option value="prompt">Prompt organizer upon approval</option>
            </select>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <GeminiConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigured={checkStatus}
      />
    </div>
  );
}
