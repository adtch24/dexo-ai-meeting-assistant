"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  X,
  Volume2,
  ArrowRight,
  Download,
  Save,
  Loader2,
} from "lucide-react";
import { formatSecondsToTime } from "@/lib/utils";
import { DexoAudioPlayer } from "./DexoAudioPlayer";

interface PhysicalRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete?: (recordingData: {
    title: string;
    durationSeconds: number;
    audioBlob?: Blob;
    audioUrl?: string;
  }) => void | Promise<void>;
}

export function PhysicalRecordingModal({
  isOpen,
  onClose,
  onRecordingComplete,
}: PhysicalRecordingModalProps) {
  // Studio Step Machine:
  // consent -> ready -> recording -> paused -> review -> complete
  const [step, setStep] = useState<
    "consent" | "ready" | "recording" | "paused" | "review" | "complete"
  >("consent");

  // Form State
  const [hasConsent, setHasConsent] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [roomName, setRoomName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // High-precision timing state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [verifiedDurationSeconds, setVerifiedDurationSeconds] = useState(0);

  // Audio Result State
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Monotonic Timing Refs (performance.now)
  const startTimeRef = useRef<number | null>(null);
  const accumulatedDurationRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Hardware & Web Audio API Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isSavedRef = useRef<boolean>(false);

  // Monotonic elapsed time calculation (strictly excludes pause time)
  const getMonotonicElapsedMs = (): number => {
    let total = accumulatedDurationRef.current;
    if (startTimeRef.current !== null) {
      total += (performance.now() - startTimeRef.current);
    }
    return total;
  };

  const startTimerLoop = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = window.setInterval(() => {
      const ms = getMonotonicElapsedMs();
      const secs = Math.floor(ms / 1000);
      setElapsedSeconds(secs);
    }, 100); // 100ms interval syncs to performance.now with zero drift
  };

  const stopTimerLoop = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Full cleanup of hardware, timers, and Web Audio nodes
  const cleanupMedia = () => {
    stopTimerLoop();
    startTimeRef.current = null;
    accumulatedDurationRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (_) {}
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Reset when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      cleanupMedia();
      // Only revoke temporary object URL if the recording was DISCARDED or NOT saved to session
      if (!isSavedRef.current && audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
      setAudioBlob(null);
      setElapsedSeconds(0);
      setVerifiedDurationSeconds(0);
      chunksRef.current = [];
      setMimeType("");
      setStep("consent");
      setErrorMessage(null);
      isSavedRef.current = false;
    }
  }, [isOpen]);

  // Detect browser supported audio MIME type
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
      return "";
    }
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/aac",
    ];
    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
    return "";
  };

  // Format file bytes into human-readable string
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Determine file extension from mime type
  const getFileExtension = (mime: string): string => {
    if (mime.includes("webm")) return "webm";
    if (mime.includes("ogg")) return "ogg";
    if (mime.includes("mp4") || mime.includes("aac")) return "mp4";
    if (mime.includes("wav")) return "wav";
    return "webm";
  };

  // Real-time Canvas Waveform Animation using Web Audio API
  const startWaveformVisualization = (analyser: AnalyserNode) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount; // 32 frequency bins for fftSize=64
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 32;
      const barSpacing = 4;
      const totalSpacing = barSpacing * (numBars - 1);
      const barWidth = Math.max(2, (width - totalSpacing) / numBars);

      for (let i = 0; i < numBars; i++) {
        const binIndex = Math.floor((i / numBars) * bufferLength);
        const value = dataArray[binIndex] || 0;
        const percent = value / 255;
        // Idle height is 6px, expands with volume
        const barHeight = Math.max(6, percent * (height - 8));
        const x = i * (barWidth + barSpacing);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "#f43f5e"); // rose-500
        gradient.addColorStop(0.5, "#a855f7"); // purple-500
        gradient.addColorStop(1, "#6366f1"); // indigo-500

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 3);
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, barWidth, barHeight, radius);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
    };

    render();
  };

  // Start Actual Recording using MediaRecorder and Web Audio API
  const handleStartRecording = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage("Microphone capture is not supported in this browser environment.");
        return;
      }

      // 1. Request actual microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      streamRef.current = stream;

      // 2. Resolve supported audio format
      const detectedMime = getSupportedMimeType();
      const options = detectedMime ? { mimeType: detectedMime } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const finalMime = mediaRecorder.mimeType || detectedMime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });

        if (blob.size === 0) {
          setErrorMessage("No audio data was recorded. Please check your microphone.");
          setStep("ready");
          return;
        }

        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setMimeType(finalMime);

        // Ground-truth duration verification from actual audio samples
        const monotonicSecs = Math.max(1, Math.round(accumulatedDurationRef.current / 1000));
        let decodedDurationSecs = monotonicSecs;

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtxClass) {
            const tempCtx = new AudioCtxClass();
            const decoded = await tempCtx.decodeAudioData(arrayBuffer);
            if (decoded && isFinite(decoded.duration) && decoded.duration > 0) {
              decodedDurationSecs = decoded.duration;
            }
            await tempCtx.close();
          }
        } catch (decodeErr) {
          console.warn("Could not decode audio buffer duration, falling back to monotonic clock duration:", decodeErr);
        }

        setVerifiedDurationSeconds(decodedDurationSecs);
        setElapsedSeconds(Math.max(1, Math.round(decodedDurationSecs)));
        setStep("review");
      };

      // 3. Initialize Web Audio API AnalyserNode
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const audioCtx = new AudioCtxClass();
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;
          sourceRef.current = source;
        }
      } catch (audioErr) {
        console.warn("Web Audio API visualization could not be started:", audioErr);
      }

      // 4. Start recording with monotonic clock
      mediaRecorder.start(250);
      accumulatedDurationRef.current = 0;
      startTimeRef.current = performance.now();
      setElapsedSeconds(0);
      setVerifiedDurationSeconds(0);
      startTimerLoop();
      setStep("recording");
    } catch (err: any) {
      console.error("Microphone capture error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Microphone access was denied. Please allow microphone access in your browser address bar.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No microphone device was detected. Please connect an audio input device and retry.");
      } else {
        setErrorMessage(`Microphone error: ${err.message || "Unable to access microphone"}`);
      }
      cleanupMedia();
    }
  };

  // Launch visualization loop when canvas mounts in recording step
  useEffect(() => {
    if (step === "recording" && analyserRef.current && canvasRef.current) {
      startWaveformVisualization(analyserRef.current);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [step]);

  // Pause Recording (accurately excludes paused time from monotonic duration)
  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();

      if (startTimeRef.current !== null) {
        accumulatedDurationRef.current += (performance.now() - startTimeRef.current);
        startTimeRef.current = null;
      }
      stopTimerLoop();
      setElapsedSeconds(Math.floor(accumulatedDurationRef.current / 1000));

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setStep("paused");
    }
  };

  // Resume Recording (continues from exact accumulated elapsed time)
  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();

      startTimeRef.current = performance.now();
      startTimerLoop();

      if (analyserRef.current && canvasRef.current) {
        startWaveformVisualization(analyserRef.current);
      }
      setStep("recording");
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (startTimeRef.current !== null) {
      accumulatedDurationRef.current += (performance.now() - startTimeRef.current);
      startTimeRef.current = null;
    }
    stopTimerLoop();

    const finalSecs = Math.max(1, Math.round(accumulatedDurationRef.current / 1000));
    setElapsedSeconds(finalSecs);
    setVerifiedDurationSeconds(finalSecs);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Stop all audio hardware tracks immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
  };

  // Discard & Re-record
  const handleDiscard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    isSavedRef.current = false;
    setAudioBlob(null);
    setElapsedSeconds(0);
    setVerifiedDurationSeconds(0);
    accumulatedDurationRef.current = 0;
    startTimeRef.current = null;
    setMimeType("");
    setStep("ready");
  };

  // Confirm and Save Recording to Session
  const handleSaveToSession = async () => {
    if (isSaving) return;
    setIsSaving(true);
    isSavedRef.current = true;
    try {
      if (onRecordingComplete) {
        const finalSecs = Math.max(1, Math.round(verifiedDurationSeconds || elapsedSeconds));
        await onRecordingComplete({
          title: meetingTitle || "In-Person Discussion",
          durationSeconds: finalSecs,
          audioBlob: audioBlob || undefined,
          audioUrl: audioUrl || undefined,
        });
      }
      setStep("complete");
    } catch (err) {
      console.error("Save recording error:", err);
      setErrorMessage("Failed to save audio recording to database. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const downloadFileName = `dexo-${(meetingTitle || "in-person-recording")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")}-${Date.now()}.${getFileExtension(mimeType)}`;

  const finalDisplayDuration = Math.max(1, Math.round(verifiedDurationSeconds || elapsedSeconds));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0B1120] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                In-Person Recording Studio
              </h3>
              <p className="text-[11px] text-slate-400">
                Native browser microphone capture with monotonic timing synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Studio Body */}
        <div className="p-6 overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 flex items-start gap-3 text-rose-300">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <span className="font-bold block text-white mb-0.5">Recording Notice</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* STEP 1: Mandatory Consent and Statutory Disclosure */}
          {step === "consent" && (
            <div className="space-y-5">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                      Mandatory Consent & Statutory Notice
                    </h4>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Recording in-person meetings requires notifying all participants in accordance with statutory privacy regulations.
                    </p>
                    <ul className="text-[11px] text-slate-400 mt-2 space-y-1 list-disc list-inside">
                      <li>Inform all attendees that this session is being recorded for Minutes of Meeting.</li>
                      <li>Never record in secret or without full consensus.</li>
                      <li>Audio is captured locally in your browser memory for immediate review.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Meeting Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Executive Strategy Review"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Room / Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Boardroom A / Lab 2"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasConsent}
                    onChange={(e) => setHasConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-300 leading-snug">
                    I confirm that all participants in this room have been informed and explicitly agreed to be recorded.
                  </span>
                </label>
              </div>

              <button
                type="button"
                disabled={!hasConsent || !meetingTitle.trim()}
                onClick={() => setStep("ready")}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Confirm Consent & Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Ready to Record */}
          {step === "ready" && (
            <div className="text-center py-6 space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                <Mic className="h-8 w-8 text-rose-500" />
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  Ready to Record In-Person
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Place device centrally on the conference table. Clicking start will request microphone permission.
                </p>
                <div className="mt-2 text-xs text-slate-300 font-medium">
                  Meeting: <span className="text-white font-bold">{meetingTitle}</span>
                  {roomName && <span className="text-slate-400"> • {roomName}</span>}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 py-2 px-4 rounded-full max-w-fit mx-auto">
                <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Microphone will be requested upon clicking start</span>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-rose-400 active:scale-95 transition-all"
                >
                  <div className="h-3 w-3 rounded-full bg-white animate-ping" />
                  <span>Start Recording Microphone</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep("consent")}
                  className="text-xs text-slate-400 hover:text-white py-1 transition-colors block mx-auto"
                >
                  ← Edit Title & Consent
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: Active Recording & Paused States */}
          {(step === "recording" || step === "paused") && (
            <div className="text-center py-6 space-y-6">
              {/* Live Status Pill & Format Badge */}
              <div className="flex items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border bg-slate-900 border-slate-800">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      step === "recording"
                        ? "bg-rose-500 animate-pulse"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className={step === "recording" ? "text-rose-400" : "text-amber-400"}>
                    {step === "recording" ? "RECORDING IN PROGRESS" : "RECORDING PAUSED"}
                  </span>
                </div>

                {mimeType && (
                  <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[10px] font-mono text-indigo-300">
                    {mimeType.split(";")[0]}
                  </span>
                )}
              </div>

              {/* Monotonically-timed Live Duration Timer */}
              <div className="font-mono text-5xl font-bold tracking-tight text-white">
                {formatSecondsToTime(elapsedSeconds)}
              </div>

              {/* REAL-TIME CANVAS WAVEFORM (Web Audio API Analyser) */}
              <div className="relative w-full rounded-2xl bg-slate-950 border border-slate-800/90 p-3 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>Real-Time Acoustic Input</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    AnalyserNode (FFT 64)
                  </span>
                </div>

                <canvas
                  ref={canvasRef}
                  width={480}
                  height={64}
                  className="w-full h-16 rounded-xl bg-slate-900/40"
                />

                {step === "paused" && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-xs">
                    <span className="text-xs font-semibold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                      Audio capture paused
                    </span>
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex items-center justify-center gap-4">
                {step === "recording" ? (
                  <button
                    type="button"
                    onClick={handlePauseRecording}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-5 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResumeRecording}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 active:scale-95 transition-all"
                >
                  <Square className="h-4 w-4 fill-white" />
                  <span>Stop & Review</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Real Audio Review & Playback with DexoAudioPlayer */}
          {step === "review" && (
            <div className="space-y-6">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {meetingTitle || "In-Person Recording"}
                    </h4>
                    {roomName && (
                      <p className="text-xs text-slate-400 mt-0.5">{roomName}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold">
                    Audio Blob Verified
                  </span>
                </div>

                {/* Real Synchronized Audio Player Component */}
                {(audioUrl || audioBlob) && (
                  <DexoAudioPlayer
                    src={audioUrl || undefined}
                    blob={audioBlob || undefined}
                    initialDuration={finalDisplayDuration}
                    title="Acoustic Recording Playback"
                  />
                )}

                {/* Audio Recording Metadata */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {formatSecondsToTime(finalDisplayDuration)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">File Size</span>
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {formatBytes(audioBlob?.size || 0)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Format</span>
                    <span className="text-xs font-mono font-bold text-cyan-400 truncate block">
                      {getFileExtension(mimeType).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Discard & Re-record</span>
                </button>

                <div className="flex items-center gap-2">
                  {audioUrl && (
                    <a
                      href={audioUrl}
                      download={downloadFileName}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 text-xs font-semibold transition-colors"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-300" />
                      <span>Download File</span>
                    </a>
                  )}

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveToSession}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 active:scale-95 disabled:opacity-60 transition-all"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving to Workspace...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Save to Workspace</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Complete Confirmation */}
          {step === "complete" && (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-white">
                Audio Recording Saved!
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                The recording ({formatSecondsToTime(finalDisplayDuration)} • {formatBytes(audioBlob?.size || 0)}) has been preserved in your current browser meeting session.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
              >
                <span>Go to Meeting Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
