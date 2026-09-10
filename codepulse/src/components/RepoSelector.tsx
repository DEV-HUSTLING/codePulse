import React, { useState } from "react";
import { Sparkles, Layers, Flame, Search, FileCode, Play, RefreshCw, CheckCircle } from "lucide-react";
import { Repository } from "../types";

interface RepoSelectorProps {
  repositories: Repository[];
  selectedRepos: string[];
  onToggleRepo: (repoName: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  mode: "mixed" | "popular" | "custom";
  onModeChange: (mode: "mixed" | "popular" | "custom") => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  onFetchRepos: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  isLoadingRepos: boolean;
  customRepoName: string;
  onCustomRepoChange: (name: string) => void;
  customReadme: string;
  onCustomReadmeChange: (content: string) => void;
}

export const RepoSelector: React.FC<RepoSelectorProps> = ({
  repositories,
  selectedRepos,
  onToggleRepo,
  onSelectAll,
  onClearSelection,
  mode,
  onModeChange,
  limit,
  onLimitChange,
  onFetchRepos,
  onAnalyze,
  isAnalyzing,
  isLoadingRepos,
  customRepoName,
  onCustomRepoChange,
  customReadme,
  onCustomReadmeChange
}) => {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredRepos = repositories.filter(r => 
    r.repo_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    r.language.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="w-full glass-panel rounded-2xl p-5 md:p-6 border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute -right-20 -top-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Mode Switcher & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Repository Selection</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal border border-slate-700">
              BigQuery Source
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose a preset strategy or custom repository to benchmark README documentation health.
          </p>
        </div>

        {/* Strategy Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onModeChange("mixed")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "mixed"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span>Mixed Sample (Contrast)</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("popular")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "popular"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>Top Starred</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("custom")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "custom"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileCode className="h-3.5 w-3.5 text-emerald-400" />
            <span>Custom / Paste</span>
          </button>
        </div>
      </div>

      {mode !== "custom" ? (
        <>
          {/* Sub-controls: Limit, Refresh, Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Sample Size:</span>
              {[5, 10, 15].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    onLimitChange(n);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    limit === n
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                      : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50"
                  }`}
                >
                  {n} repos
                </button>
              ))}

              <button
                type="button"
                onClick={onFetchRepos}
                disabled={isLoadingRepos || isAnalyzing}
                className="ml-2 p-1.5 rounded-md bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                title="Fetch fresh sample from BigQuery"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingRepos ? "animate-spin text-indigo-400" : ""}`} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter repositories..."
                  value={filterQuery}
                  onChange={e => setFilterQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
                />
              </div>

              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded hover:bg-indigo-500/10"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onClearSelection}
                className="text-xs text-slate-400 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-800"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Repository Cards Grid */}
          {isLoadingRepos ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
              <p className="text-sm text-slate-400">Querying BigQuery repository catalog...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1 py-2">
              {filteredRepos.map(repo => {
                const isSelected = selectedRepos.includes(repo.repo_name);
                const tierColor = 
                  repo.tier === "high" ? "border-amber-500/30 text-amber-400 bg-amber-500/5" :
                  repo.tier === "medium" ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/5" :
                  "border-purple-500/30 text-purple-400 bg-purple-500/5";

                return (
                  <div
                    key={repo.repo_name}
                    onClick={() => onToggleRepo(repo.repo_name)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all select-none flex items-start justify-between gap-2 ${
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/30"
                        : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white truncate" title={repo.repo_name}>
                          {repo.repo_name}
                        </span>
                        {repo.tier && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium uppercase ${tierColor}`}>
                            {repo.tier}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                        <span className="text-amber-300 font-medium">★ {repo.stars.toLocaleString()}</span>
                        <span>•</span>
                        <span className="text-slate-300 truncate">{repo.language}</span>
                        {repo.has_cached_analysis && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle className="h-3 w-3 inline" /> {repo.cached_score}/100
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "border-slate-700 bg-slate-950"
                    }`}>
                      {isSelected && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Custom Repository / Paste Mode */
        <div className="pt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Repository Name / Identifier
            </label>
            <input
              type="text"
              placeholder="e.g. facebook/react or my-org/awesome-tool"
              value={customRepoName}
              onChange={e => onCustomRepoChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              README Content (Markdown)
            </label>
            <textarea
              rows={6}
              placeholder="# Project Name&#10;&#10;A brief description of what this project does...&#10;&#10;## Getting Started&#10;npm install my-package"
              value={customReadme}
              onChange={e => onCustomReadmeChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono resize-y"
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-4 border-t border-white/10">
        <div className="text-xs text-slate-400">
          {mode !== "custom" ? (
            <span>
              Selected <strong className="text-white font-semibold">{selectedRepos.length}</strong> of {repositories.length} repositories
            </span>
          ) : (
            <span>Ready to analyze custom documentation</span>
          )}
        </div>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing || (mode !== "custom" && selectedRepos.length === 0) || (mode === "custom" && (!customRepoName.trim() || !customReadme.trim()))}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
            isAnalyzing || (mode !== "custom" && selectedRepos.length === 0)
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
              : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/30 hover:shadow-indigo-600/50 cursor-pointer active:scale-98"
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-white" />
              <span>Analyzing Documentation Health...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-cyan-200" />
              <span>Analyze {mode !== "custom" ? `${selectedRepos.length} Selected` : "Documentation"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
