import React from "react";
import { Database, FileText, Sparkles, CheckCircle2, Loader2, BarChart2 } from "lucide-react";

interface AnalysisProgressProps {
  currentStep: number;
  currentRepoIndex: number;
  totalRepos: number;
  currentRepoName?: string;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  currentStep,
  currentRepoIndex,
  totalRepos,
  currentRepoName
}) => {
  const steps = [
    { title: "BigQuery Catalog", desc: "Selecting repository targets", icon: Database },
    { title: "README Retrieval", desc: "Fetching markdown AST from BigQuery", icon: FileText },
    { title: "Gemini 2.5 Evaluation", desc: "Objective 8-category analysis", icon: Sparkles },
    { title: "Deterministic Scoring", desc: "Computing weighted health index", icon: BarChart2 },
    { title: "Cohort Insights", desc: "Ranking & disparity analytics", icon: CheckCircle2 },
  ];

  const progressPercent = totalRepos > 0 
    ? Math.min(100, Math.round(((currentRepoIndex + (currentStep / 5)) / totalRepos) * 100))
    : 20;

  return (
    <div className="w-full glass-panel rounded-2xl p-6 border border-indigo-500/30 shadow-2xl bg-gradient-to-b from-[#111827]/90 to-[#0b0f19]/90 relative overflow-hidden animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Evaluating Documentation Health</span>
              {currentRepoName && (
                <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/50">
                  {currentRepoName}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Analyzing {currentRepoIndex + 1} of {totalRepos} repositories via Gemini AI & BigQuery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-cyan-400">{progressPercent}%</span>
          <div className="w-28 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={step.title}
              className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${
                isDone
                  ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400"
                  : isCurrent
                  ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-500/10"
                  : "bg-slate-900/30 border-slate-800/50 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${isDone ? "text-emerald-400" : isCurrent ? "text-cyan-400 animate-pulse" : "text-slate-600"}`} />
                <span className="text-[10px] font-mono opacity-70">0{idx + 1}</span>
              </div>
              <span className="text-xs font-semibold text-slate-200 mt-1">{step.title}</span>
              <span className="text-[10px] text-slate-400 line-clamp-1">{step.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
