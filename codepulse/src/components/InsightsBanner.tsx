import React, { useState } from "react";
import { Sparkles, AlertTriangle, Award, Compass, ArrowUpRight, Info, X, CheckCircle, Calculator, ShieldCheck, Zap } from "lucide-react";
import { InsightsData, AnalysisResult } from "../types";
import { ScoreBadge } from "./ScoreBadge";

interface InsightsBannerProps {
  insights: InsightsData;
  onSelectRepo: (repo: AnalysisResult) => void;
}

export const InsightsBanner: React.FC<InsightsBannerProps> = ({ insights, onSelectRepo }) => {
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  if (!insights || insights.total_analyzed === 0) return null;

  const isCustomTopPerformer = insights.top_performer?.is_custom || (insights.top_performer?.repo_url === null && !insights.top_performer?.repo_name.includes("/"));

  return (
    <div className="w-full space-y-4">
      {/* Top Level Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Cohort Average Health with Info Button */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col justify-between relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Cohort Average Health</span>
            <button
              type="button"
              onClick={() => setShowFormulaModal(true)}
              className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-all flex items-center gap-1 text-[11px]"
              title="Click to see how health scores are calculated"
            >
              <Info className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[10px] text-indigo-300 hidden sm:inline">How it's scored</span>
            </button>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white">{insights.average_score}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Across {insights.total_analyzed} repositories</span>
        </div>

        {/* Top Performer Card */}
        {insights.top_performer && (
          <div
            onClick={() => onSelectRepo(insights.top_performer!)}
            className={`glass-panel glass-panel-hover p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
              isCustomTopPerformer
                ? "border-amber-500/40 bg-gradient-to-br from-amber-950/20 to-slate-900/90 ring-1 ring-amber-500/30 shadow-lg shadow-amber-950/30"
                : "border-emerald-500/20 bg-emerald-950/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold flex items-center gap-1 ${
                isCustomTopPerformer ? "text-amber-400" : "text-emerald-400"
              }`}>
                <Award className="h-3.5 w-3.5" />
                {isCustomTopPerformer ? "Custom Top Performer 🎉" : "Top Performer"}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-white block truncate" title={insights.top_performer.repo_name}>
                {insights.top_performer.repo_name}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <ScoreBadge score={insights.top_performer.overall_score} size="sm" />
                <span className="text-[11px] text-slate-400">
                  {insights.top_performer.stars > 0 ? `★ ${insights.top_performer.stars.toLocaleString()}` : "Custom Audit"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* High Star / Low Doc Anomaly */}
        {insights.high_star_low_doc && (
          <div
            onClick={() => onSelectRepo(insights.high_star_low_doc!)}
            className="glass-panel glass-panel-hover p-4 rounded-2xl border border-rose-500/20 cursor-pointer flex flex-col justify-between bg-rose-950/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> High Stars / Low Docs
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-white block truncate" title={insights.high_star_low_doc.repo_name}>
                {insights.high_star_low_doc.repo_name}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <ScoreBadge score={insights.high_star_low_doc.overall_score} size="sm" />
                <span className="text-[11px] text-slate-400">★ {insights.high_star_low_doc.stars.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Underdog Gem */}
        {insights.low_star_high_doc && (
          <div
            onClick={() => onSelectRepo(insights.low_star_high_doc!)}
            className="glass-panel glass-panel-hover p-4 rounded-2xl border border-cyan-500/20 cursor-pointer flex flex-col justify-between bg-cyan-950/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Underdog Gem
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-white block truncate" title={insights.low_star_high_doc.repo_name}>
                {insights.low_star_high_doc.repo_name}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <ScoreBadge score={insights.low_star_high_doc.overall_score} size="sm" />
                <span className="text-[11px] text-slate-400">★ {insights.low_star_high_doc.stars.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insight Narrative Cards */}
      {insights.insights_list && insights.insights_list.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-white/10 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="h-4 w-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Comparative Intelligence & Anomalies
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.insights_list.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200">{item.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Calculation Explanatory Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">How Documentation Health is Scored</h3>
                  <p className="text-xs text-slate-400">Deterministic scoring model & 8-category weighting</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formula Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/20 space-y-2">
              <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Scoring Formula</div>
              <div className="font-mono text-sm text-cyan-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                Overall Health Score = Σ (Category Score × Category Weight)
              </div>
              <p className="text-xs text-slate-400">
                Gemini AI grades each category from 0–100 objectively. The backend calculates the final score mathematically using fixed weights.
              </p>
            </div>

            {/* Category Breakdown Table */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">8 Weighted Evaluation Categories</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>1. Project Clarity</span>
                    <span className="text-indigo-400">20% Weight</span>
                  </div>
                  <p className="text-[11px] text-slate-400">First 5-10 lines, target audience, problem solved, and why to use it.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>2. Getting Started</span>
                    <span className="text-indigo-400">20% Weight</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Installation commands, prerequisites, configuration, quickstart.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>3. Examples & Snippets</span>
                    <span className="text-indigo-400">15% Weight</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Realistic code samples, CLI/API usage, parameters, outputs.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>4. Completeness</span>
                    <span className="text-indigo-400">15% Weight</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Feature list, config options, troubleshooting, FAQ, license, contributing.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>5. Structure & Flow</span>
                    <span className="text-indigo-400">10% Weight</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Logical headings hierarchy, scannability, table of contents.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>6. Readability</span>
                    <span className="text-indigo-400">10% Weight</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Clarity, conciseness, formatting quality, avoiding jargon walls.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>7. Visual Presentation</span>
                    <span className="text-indigo-400">5% Weight</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Badges, diagrams, syntax highlighting, clear visual hierarchy.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>8. Trust Signals</span>
                    <span className="text-indigo-400">5% Weight</span>
                  </div>
                  <p className="text-[11px] text-slate-400">CI status, license, release info, security, active maintenance.</p>
                </div>
              </div>
            </div>

            {/* Grade Scale */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-300">Grade Thresholds:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">90–100: Excellent</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">75–89: Good</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">60–74: Needs Improvement</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">&lt;60: Poor</span>
            </div>

            {/* Top Performer Rule */}
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-2.5 text-xs text-slate-300">
              <Award className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Top Performer Benchmark:</strong> The repository with the highest overall score in the entire cohort is designated the Top Performer. If your custom repository scores higher than existing catalog entries, it automatically claims the #1 benchmark spot!
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
