import React from "react";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const getScoreColor = (score: number) => {
  if (score >= 90) {
    return {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      fill: "#10b981",
      glow: "shadow-emerald-500/20",
      grade: "Excellent",
      description: "Superb clarity, quickstarts, examples & trust signals"
    };
  }
  if (score >= 75) {
    return {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      fill: "#06b6d4",
      glow: "shadow-cyan-500/20",
      grade: "Good",
      description: "Solid foundation with minor areas for enhancement"
    };
  }
  if (score >= 60) {
    return {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      fill: "#f59e0b",
      glow: "shadow-amber-500/20",
      grade: "Needs Improvement",
      description: "Missing crucial quickstarts, examples or structure"
    };
  }
  return {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    fill: "#f43f5e",
    glow: "shadow-rose-500/20",
    grade: "Poor",
    description: "Incomplete, unclear or lacks key setup instructions"
  };
};

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, size = "md", showLabel = true }) => {
  const config = getScoreColor(score);

  if (size === "sm") {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${config.bg} ${config.border} ${config.text}`}>
        <span>{score}</span>
        {showLabel && <span className="text-[10px] opacity-80">/ 100</span>}
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${config.bg} ${config.border} ${config.glow} shadow-xl`}>
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${config.text}`}>{score}</span>
          <span className="text-sm font-medium text-slate-400">/ 100</span>
        </div>
        {showLabel && (
          <div className={`mt-1.5 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-black/40 border ${config.border} ${config.text}`}>
            {config.grade}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-sm font-medium ${config.bg} ${config.border} ${config.text}`}>
      <span className="font-bold">{score}</span>
      {showLabel && (
        <>
          <span className="text-slate-500">•</span>
          <span className="text-xs">{config.grade}</span>
        </>
      )}
    </div>
  );
};
