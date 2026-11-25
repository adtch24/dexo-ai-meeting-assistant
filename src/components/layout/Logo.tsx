import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export function Logo({
  className = "",
  size = "md",
  showTagline = false,
}: LogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Abstract Soundwave / Conversation Motif */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-2 shadow-lg shadow-indigo-600/30 border border-indigo-400/20`}
      >
        <div className="flex items-center justify-center gap-[2.5px] h-full w-full">
          <span className="w-[3px] h-[35%] bg-white/70 rounded-full animate-wave-1" />
          <span className="w-[3px] h-[65%] bg-white/90 rounded-full animate-wave-2" />
          <span className="w-[3px] h-[95%] bg-white rounded-full animate-wave-3" />
          <span className="w-[3px] h-[60%] bg-white/90 rounded-full animate-wave-4" />
          <span className="w-[3px] h-[40%] bg-white/70 rounded-full animate-wave-5" />
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-bold tracking-tight text-white font-sans ${textSizes[size]}`}
          >
            Dexo
          </span>
          <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">
            AI
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] text-slate-400 font-medium tracking-tight">
            Meeting Intelligence
          </span>
        )}
      </div>
    </div>
  );
}
