"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileAudio,
  X,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface AudioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (data: {
    title: string;
    fileName: string;
    fileSizeBytes: number;
    audioBlob?: Blob;
  }) => void;
}

export function AudioUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: AudioUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const allowedTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/m4a",
    "audio/x-m4a",
    "audio/aac",
    "audio/webm",
    "audio/ogg",
  ];
  const maxSizeBytes = 100 * 1024 * 1024; // 100MB

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(mp3|wav|m4a|aac|webm|ogg)$/i)) {
      setError("Unsupported format. Please upload MP3, M4A, WAV, AAC, or WebM audio.");
      return;
    }
    if (selectedFile.size > maxSizeBytes) {
      setError("File exceeds 100MB limit. Please compress the audio or split into chapters.");
      return;
    }
    setFile(selectedFile);
    if (!title) {
      // Auto-populate title from filename without extension
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleStartUpload = () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          setIsUploading(false);
          setIsSuccess(true);
          setTimeout(() => {
            if (onUploadSuccess) {
              onUploadSuccess({
                title: title || file.name,
                fileName: file.name,
                fileSizeBytes: file.size,
                audioBlob: file,
              });
            }
            onClose();
          }, 1200);
          return 100;
        }
        return prev + 25;
      });
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0F172A] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Upload Meeting Audio</h3>
              <p className="text-[11px] text-slate-400">
                MP3, M4A, WAV, AAC, WebM up to 100MB
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

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {!file ? (
            /* Drag and drop zone */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                dragActive
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-slate-700 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-600"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.aac,.webm,.ogg,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3.5 rounded-full bg-slate-800 text-cyan-400 mb-3 border border-slate-700">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">
                Drag and drop your audio file here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                or click to browse from your device
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
                <span>MP3, M4A, WAV, AAC, WebM</span>
                <span>•</span>
                <span>Max 100MB</span>
              </div>
            </div>
          ) : (
            /* Selected File State */
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <FileAudio className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design Partner Feedback Interview"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Context / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add attendee names or relevant background..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {isUploading && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Uploading audio to secure storage...</span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {isSuccess && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Upload verified. Dispatching Gemini pipeline...</span>
                </div>
              )}
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

            {file && !isSuccess && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleStartUpload}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 disabled:opacity-50 transition-all"
              >
                {isUploading ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Upload & Extract MoM
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
