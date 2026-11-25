"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { formatSecondsToTime } from "@/lib/utils";

interface DexoAudioPlayerProps {
  src?: string;
  blob?: Blob;
  initialDuration?: number;
  title?: string;
  className?: string;
  compact?: boolean;
}

export function DexoAudioPlayer({
  src,
  blob,
  initialDuration = 0,
  title,
  className = "",
  compact = false,
}: DexoAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Managed Object URL for passed Blob (ensures clean lifecycle)
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    if (typeof window !== "undefined" && blob) {
      try {
        return URL.createObjectURL(blob);
      } catch (_) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(null);
    }
  }, [blob]);

  // Determine active playable source
  const effectiveSrc = blobUrl || src || "";

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(initialDuration);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Sync initialDuration if it updates from parent
  useEffect(() => {
    if (initialDuration > 0 && (!duration || duration === Infinity)) {
      setDuration(initialDuration);
    }
  }, [initialDuration, duration]);

  // Reset player state when source changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoaded(false);
    setAudioError(null);
    if (initialDuration > 0) {
      setDuration(initialDuration);
    }
    if (audioRef.current && effectiveSrc) {
      audioRef.current.load();
    }
  }, [effectiveSrc, initialDuration]);

  // Handle HTML5 Audio Errors
  const handleAudioError = () => {
    // If there is no effective source, do not trigger a spurious error
    if (!effectiveSrc) return;

    const audio = audioRef.current;
    let message = "Audio playback failed.";
    if (audio?.error) {
      switch (audio.error.code) {
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          message = "Audio source missing or format unsupported.";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          message = "Audio decoding error.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          message = "Network error loading audio.";
          break;
        case MediaError.MEDIA_ERR_ABORTED:
          message = "Audio playback aborted.";
          break;
        default:
          message = `Audio playback error (${audio.error.message || "playback error"}).`;
      }
    }
    setAudioError(message);
    setIsPlaying(false);
  };

  // Chromium WebM Duration Fix & Metadata handler
  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioError(null);

    if (isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
      setIsLoaded(true);
    } else if (initialDuration > 0) {
      setDuration(initialDuration);
      setIsLoaded(true);
    } else {
      // Chromium bug workaround: seeking to a huge timestamp forces Chromium to decode the duration
      audio.currentTime = 1e101;
      audio.ontimeupdate = () => {
        audio.ontimeupdate = null;
        audio.currentTime = 0;
        if (isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        } else if (initialDuration > 0) {
          setDuration(initialDuration);
        }
        setIsLoaded(true);
      };
    }
  };

  const handleTimeUpdate = () => {
    if (!isSeeking && audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);

      // If duration was Infinity initially but now resolved by browser
      if (
        isFinite(audioRef.current.duration) &&
        audioRef.current.duration > 0 &&
        (!duration || duration === Infinity)
      ) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (duration > 0) {
      setCurrentTime(duration);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!effectiveSrc) {
      setAudioError("Audio source is unavailable.");
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If at end or within 0.3s of end, restart from beginning
      const effectiveDuration = duration > 0 ? duration : (audio.duration || 0);
      if (audio.ended || (effectiveDuration > 0 && Math.abs(currentTime - effectiveDuration) < 0.3)) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(null);
        })
        .catch((err) => {
          console.warn("Audio playback interrupted or not permitted:", err);
          setAudioError("Playback was interrupted or blocked by the browser.");
          setIsPlaying(false);
        });
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const target = e.currentTarget as HTMLInputElement;
    const newTime = parseFloat(target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
    setIsSeeking(false);
  };

  const skipSeconds = (delta: number) => {
    if (!audioRef.current) return;
    const effectiveDuration = duration > 0 ? duration : (audioRef.current.duration || 0);
    const targetTime = Math.max(0, Math.min(effectiveDuration, currentTime + delta));
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const effectiveDuration = Math.max(duration, initialDuration, 0.1);
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  // Compact Mode (used in Meeting Header)
  if (compact) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <audio
          ref={audioRef}
          src={effectiveSrc || undefined}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleAudioError}
          className="hidden"
        />

        {audioError ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{audioError}</span>
            </div>
            {effectiveSrc && (
              <button
                type="button"
                onClick={() => {
                  setAudioError(null);
                  if (audioRef.current) {
                    audioRef.current.load();
                  }
                }}
                className="p-1 rounded text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors"
                title="Retry playback"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            {/* Play / Pause Toggle Button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={!effectiveSrc}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-all active:scale-95 ${
                effectiveSrc
                  ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-white" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
              )}
            </button>

            {/* Scrubber Progress Bar */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="relative flex items-center h-4 w-full group">
                <div className="absolute inset-x-0 h-1.5 rounded-full bg-slate-800 overflow-hidden pointer-events-none">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-75"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <input
                  type="range"
                  min="0"
                  max={effectiveDuration}
                  step="0.05"
                  value={currentTime}
                  disabled={!effectiveSrc}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekStart}
                  onMouseUp={handleSeekEnd}
                  onTouchStart={handleSeekStart}
                  onTouchEnd={handleSeekEnd}
                  className="absolute inset-x-0 w-full h-4 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                  aria-label="Seek audio position"
                />
              </div>
            </div>

            {/* Time Stamp Display */}
            <div className="font-mono text-[11px] text-slate-400 shrink-0">
              <span className="text-white font-medium">{formatSecondsToTime(Math.floor(currentTime))}</span>
              <span className="text-slate-600"> / </span>
              <span>{formatSecondsToTime(Math.ceil(effectiveDuration))}</span>
            </div>

            {/* Compact Volume Control */}
            <div className="relative flex items-center shrink-0">
              <button
                type="button"
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>

              {showVolumeSlider && (
                <div
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  className="absolute bottom-full right-0 mb-2 p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex items-center gap-2 z-30 animate-in fade-in duration-150"
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1.5 accent-indigo-500 cursor-pointer"
                    aria-label="Volume level"
                  />
                  <span className="font-mono text-[10px] text-slate-400 w-6 text-right">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full-featured Player (used in Review & Detail dialogs)
  return (
    <div className={`rounded-xl bg-slate-950 p-4 border border-slate-800 shadow-inner space-y-3 ${className}`}>
      <audio
        ref={audioRef}
        src={effectiveSrc || undefined}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleAudioError}
        className="hidden"
      />

      {title && (
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold truncate">{title}</span>
          <span className="font-mono text-[10px] text-indigo-400">
            {audioError ? "Error" : isLoaded ? "Ready" : "Buffering..."}
          </span>
        </div>
      )}

      {audioError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span className="flex-1">{audioError}</span>
          {effectiveSrc && (
            <button
              type="button"
              onClick={() => {
                setAudioError(null);
                if (audioRef.current) {
                  audioRef.current.load();
                }
              }}
              className="px-2 py-1 rounded bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 text-xs font-medium transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Main Scrubber Track */}
      <div className="space-y-1.5">
        <div className="relative flex items-center h-5 w-full group">
          <div className="absolute inset-x-0 h-2 rounded-full bg-slate-900 border border-slate-800/80 overflow-hidden pointer-events-none">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-indigo-500 to-violet-500 rounded-full transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <input
            type="range"
            min="0"
            max={effectiveDuration}
            step="0.05"
            value={currentTime}
            disabled={!effectiveSrc}
            onChange={handleSeekChange}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchEnd={handleSeekEnd}
            className="absolute inset-x-0 w-full h-5 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            aria-label="Seek position"
          />

          <div
            className="absolute h-3.5 w-3.5 -ml-1.5 rounded-full bg-white border border-indigo-500 shadow-md pointer-events-none transition-transform group-hover:scale-125"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Timestamps Row */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-indigo-300 font-bold">
            {formatSecondsToTime(Math.floor(currentTime))}
          </span>
          <span className="text-slate-400">
            {formatSecondsToTime(Math.ceil(effectiveDuration))}
          </span>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {/* Rewind 5s */}
          <button
            type="button"
            onClick={() => skipSeconds(-5)}
            disabled={!effectiveSrc}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Rewind 5 seconds"
          >
            <Rewind className="h-4 w-4" />
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={!effectiveSrc}
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-white transition-all shadow-md active:scale-95 ${
              effectiveSrc
                ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-white" />
            ) : (
              <Play className="h-4 w-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Forward 5s */}
          <button
            type="button"
            onClick={() => skipSeconds(5)}
            disabled={!effectiveSrc}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Forward 5 seconds"
          >
            <FastForward className="h-4 w-4" />
          </button>

          {/* Restart */}
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            disabled={!effectiveSrc}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors ml-1 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Restart from beginning"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Volume & Mute Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1.5 accent-indigo-500 cursor-pointer"
              aria-label="Volume level"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
