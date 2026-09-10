import React, { useState } from "react";
import { 
  X, ExternalLink, Star, Code2, Shield, FileText, CheckCircle2, 
  AlertOctagon, AlertTriangle, ArrowRight, Sparkles, BookOpen, 
  Layers, Compass, Copy, Check, Eye
} from "lucide-react";
import { AnalysisResult } from "../types";
import { ScoreBadge, getScoreColor } from "./ScoreBadge";

interface RepoDetailModalProps {
  repo: AnalysisResult | null;
  onClose: () => void;
}

type ModalTab = "overview" | "categories" | "recommendations" | "rewrites" | "raw_readme";

export const RepoDetailModal: React.FC<RepoDetailModalProps> = ({ repo, onClose }) => {
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!repo) return null;

  const scoreConfig = getScoreColor(repo.overall_score);
  const categories = repo.categories || {};

  const handleCopyRewrite = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const categoryLabels: Record<string, { label: string; desc: string; weight: string }> = {
    project_clarity: { label: "Project Clarity", desc: "Explains purpose, target audience, & value proposition", weight: "20%" },
    getting_started: { label: "Getting Started", desc: "Prerequisites, installation, & quickstart commands", weight: "20%" },
    examples: { label: "Examples & Demos", desc: "Concrete code snippets, CLI/API samples, & outputs", weight: "15%" },
    completeness: { label: "Completeness", desc: "Features, configuration, API references, & FAQ", weight: "15%" },
    structure: { label: "Structure & Flow", desc: "Headings, scannability, & logical section hierarchy", weight: "10%" },
    readability: { label: "Readability & Tone", desc: "Clarity, conciseness, formatting, & accessible jargon", weight: "10%" },
    visual_presentation: { label: "Visual Presentation", desc: "Badges, diagrams, screenshots, & syntax highlighting", weight: "5%" },
    trust_signals: { label: "Trust & Maturity", desc: "License, CI build status, releases, & security", weight: "5%" }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl max-h-[92vh] bg-[#0c101d] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-slate-900/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border ${scoreConfig.bg} ${scoreConfig.border} flex flex-col items-center justify-center shrink-0`}>
              <span className={`text-3xl font-extrabold ${scoreConfig.text}`}>{repo.overall_score}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{scoreConfig.grade}</span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{repo.repo_name}</h2>
                {repo.repo_url && (
                  <a
                    href={repo.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* Meta tags */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-amber-300 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-amber-300/20" /> {repo.stars.toLocaleString()} stars
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Code2 className="h-3.5 w-3.5 text-cyan-400" /> {repo.language}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Shield className="h-3.5 w-3.5 text-indigo-400" /> {repo.license}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <FileText className="h-3.5 w-3.5" /> {(repo.readme_size / 1024).toFixed(1)} KB README
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-end md:self-center p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 border-b border-white/10 bg-slate-950/60 flex items-center gap-2 overflow-x-auto">
          {[
            { id: "overview", label: "Executive Summary", icon: Compass },
            { id: "categories", label: "8-Category Breakdown", icon: Layers },
            { id: "recommendations", label: `Actionable Fixes (${repo.recommendations?.length || 0})`, icon: AlertTriangle },
            { id: "rewrites", label: `AI Rewrites (${repo.rewrite_suggestions?.length || 0})`, icon: Sparkles },
            { id: "raw_readme", label: "Raw README Source", icon: BookOpen }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ModalTab)}
                className={`flex items-center gap-2 px-3.5 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "border-indigo-500 text-indigo-300 bg-indigo-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Summary banner */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> AI Documentation Diagnosis
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed font-normal">
                  {repo.summary}
                </p>
              </div>

              {/* Strengths & Weaknesses Split Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-5 rounded-2xl bg-emerald-950/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>What's Working (Strengths)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {repo.strengths?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-5 rounded-2xl bg-rose-950/10 border border-rose-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <AlertOctagon className="h-4 w-4" />
                    <span>What Needs Improvement (Deficits)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {repo.weaknesses?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Mini Category Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Category Snapshot
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(categoryLabels).map(([key, meta]) => {
                    const catScore = categories[key]?.score ?? 50;
                    const cConfig = getScoreColor(catScore);
                    return (
                      <div
                        key={key}
                        onClick={() => setActiveTab("categories")}
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="truncate">{meta.label}</span>
                          <span className="text-[10px] text-slate-500">{meta.weight}</span>
                        </div>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className={`text-xl font-bold ${cConfig.text}`}>{catScore}</span>
                          <span className="text-[10px] text-slate-500">/100</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 8 CATEGORY BREAKDOWN */}
          {activeTab === "categories" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(categoryLabels).map(([key, meta]) => {
                  const catData = categories[key] || { score: 50, assessment: "No assessment available" };
                  const cConfig = getScoreColor(catData.score);

                  return (
                    <div
                      key={key}
                      className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{meta.label}</h4>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                Weight: {meta.weight}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{meta.desc}</p>
                          </div>

                          <div className={`px-2.5 py-1 rounded-xl border ${cConfig.bg} ${cConfig.border} ${cConfig.text} font-bold text-sm shrink-0`}>
                            {catData.score}/100
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${catData.score}%`, backgroundColor: cConfig.fill }}
                          />
                        </div>
                      </div>

                      {/* Assessment narrative */}
                      <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                        {catData.assessment}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ACTIONABLE RECOMMENDATIONS */}
          {activeTab === "recommendations" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-xs text-slate-400">
                Prioritized documentation fixes generated by Gemini AI to improve developer adoption and usability:
              </p>

              <div className="space-y-3">
                {repo.recommendations?.map((rec, idx) => {
                  const isHigh = rec.priority.toLowerCase() === "high";
                  const isMed = rec.priority.toLowerCase() === "medium";
                  const pColor = isHigh
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : isMed
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/30";

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${pColor}`}>
                            {rec.priority} Priority
                          </span>
                          <span className="font-semibold text-xs text-slate-200">
                            Problem: {rec.issue}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-indigo-300 font-semibold block mb-0.5">Recommended Action:</strong>
                            <span>{rec.recommendation}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: BEFORE / AFTER AI REWRITES */}
          {activeTab === "rewrites" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Section-Level AI Refactoring
                </h4>
                <p className="text-xs text-slate-300">
                  Targeted rewrites generated for specific weak sections rather than replacing the whole document.
                </p>
              </div>

              {(!repo.rewrite_suggestions || repo.rewrite_suggestions.length === 0) ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No section rewrites generated for this repository.
                </div>
              ) : (
                repo.rewrite_suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                          Section: {sug.section}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyRewrite(sug.suggested, idx)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-slate-400" />
                            <span>Copy Rewrite</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Side by side comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-rose-400" /> Original Snippet
                        </span>
                        <pre className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/20 text-slate-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-60 leading-relaxed">
                          {sug.original || "(No explicit section excerpt)"}
                        </pre>
                      </div>

                      {/* Suggested */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" /> AI Suggested Improvement
                        </span>
                        <pre className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-emerald-200 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-60 leading-relaxed">
                          {sug.suggested}
                        </pre>
                      </div>
                    </div>

                    {/* Reason */}
                    {sug.reason && (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-400">
                        <strong className="text-slate-300">Why this improves developer experience:</strong> {sug.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: RAW README */}
          {activeTab === "raw_readme" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Displaying original README markdown stream from BigQuery</span>
                <span>Path: <code className="text-slate-300 font-mono">{repo.readme_path || "README.md"}</code></span>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[60vh] leading-relaxed select-text">
                {repo.raw_readme_snippet || "README content stream unavailable"}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>Evaluated via Gemini 2.5 Flash on Vertex AI & BigQuery</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
