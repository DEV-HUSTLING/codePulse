import React, { useState } from "react";
import { ArrowUpDown, ExternalLink, ChevronRight, Search, FileText, CheckCircle, AlertTriangle, XCircle, Info, Sparkles, Trophy, Zap } from "lucide-react";
import { AnalysisResult } from "../types";
import { ScoreBadge, getScoreColor } from "./ScoreBadge";

interface RankingTableProps {
  analyses: AnalysisResult[];
  onSelectRepo: (repo: AnalysisResult) => void;
}

type SortField = "overall_score" | "stars" | "repo_name";

export const RankingTable: React.FC<RankingTableProps> = ({ analyses, onSelectRepo }) => {
  const [sortField, setSortField] = useState<SortField>("overall_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredAnalyses = analyses.filter(item => {
    const matchesSearch = 
      item.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.main_issue.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterGrade === "all") return matchesSearch;
    return matchesSearch && item.grade.toLowerCase().replace(" ", "_") === filterGrade;
  });

  const sortedAnalyses = [...filteredAnalyses].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === "string") {
      return sortOrder === "asc" 
        ? (valA as string).localeCompare(valB as string)
        : (valB as string).localeCompare(valA as string);
    }

    return sortOrder === "asc"
      ? (valA as number) - (valB as number)
      : (valB as number) - (valA as number);
  });

  return (
    <div className="w-full glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-slate-900/80">
      {/* Table Header & Toolbar */}
      <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Documentation Quality Leaderboard</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              {sortedAnalyses.length} of {analyses.length} Evaluated Repositories
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked by AI-evaluated documentation health index and category fidelity.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by repo, lang, issue..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
            />
          </div>

          {/* Grade filter */}
          <select
            value={filterGrade}
            onChange={e => setFilterGrade(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Grades</option>
            <option value="excellent">Excellent (90-100)</option>
            <option value="good">Good (75-89)</option>
            <option value="needs_improvement">Needs Improvement (60-74)</option>
            <option value="poor">Poor (0-59)</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th 
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none"
                onClick={() => handleSort("repo_name")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Repository</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th 
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none text-right"
                onClick={() => handleSort("stars")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Stars</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th 
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none"
                onClick={() => handleSort("overall_score")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Health Score</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 hidden lg:table-cell">Category Spectrum</th>
              <th className="py-3 px-4">Primary Problem / Focus</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {sortedAnalyses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  No repositories match your current filters.
                </td>
              </tr>
            ) : (
              sortedAnalyses.map((item, index) => {
                const categories = item.categories || {};
                const isCustom = item.is_custom || (!item.repo_url && !item.repo_name.includes("/"));
                const isTop1 = index === 0;
                
                return (
                  <tr
                    key={item.repo_name}
                    onClick={() => onSelectRepo(item)}
                    className={`cursor-pointer transition-colors group ${
                      isTop1
                        ? "bg-indigo-950/20 hover:bg-indigo-950/40"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      {isTop1 ? (
                        <div className="flex items-center justify-center">
                          <Trophy className="h-4 w-4 text-amber-400" />
                        </div>
                      ) : (
                        <span className="text-slate-500 group-hover:text-indigo-400">
                          {index + 1}
                        </span>
                      )}
                    </td>

                    {/* Repository Name & Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                            {item.repo_name}
                          </span>
                          {isCustom && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                              <Zap className="h-2.5 w-2.5 text-amber-400" /> Custom Audit
                            </span>
                          )}
                          {item.repo_url && (
                            <a
                              href={item.repo_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-slate-500 hover:text-white transition-colors"
                              title="Open on GitHub"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            {item.language || "Unknown"}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500 truncate max-w-[120px]">{item.license || "No License"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Stars */}
                    <td className="py-3.5 px-4 text-right font-medium text-amber-300 font-mono">
                      {item.stars > 0 ? `★ ${item.stars.toLocaleString()}` : <span className="text-slate-500 text-[11px]">Personal</span>}
                    </td>

                    {/* Health Score & Grade Badge */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={item.overall_score} size="md" />
                      </div>
                    </td>

                    {/* Category Mini-Bars Spectrum */}
                    <td className="py-3.5 px-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1 w-32" title="Category breakdown sparkline">
                        {["project_clarity", "getting_started", "examples", "structure", "completeness", "readability", "visual_presentation", "trust_signals"].map(cat => {
                          const catScore = categories[cat]?.score ?? 50;
                          const heightPx = Math.max(4, Math.round((catScore / 100) * 16));
                          const barColor = 
                            catScore >= 80 ? "bg-emerald-400" :
                            catScore >= 65 ? "bg-cyan-400" :
                            catScore >= 50 ? "bg-amber-400" : "bg-rose-400";

                          return (
                            <div
                              key={cat}
                              className="flex-1 bg-slate-800 h-4 rounded-sm flex items-end overflow-hidden"
                              title={`${cat.replace('_', ' ')}: ${catScore}/100`}
                            >
                              <div
                                className={`w-full ${barColor} rounded-sm transition-all`}
                                style={{ height: `${heightPx}px` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Main Issue */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-start gap-1.5 text-slate-300">
                        {item.overall_score < 75 ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <span className="line-clamp-2 text-xs text-slate-300">
                          {item.main_issue || "No major documentation defects detected."}
                        </span>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectRepo(item);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold transition-all group-hover:border-indigo-500/40"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
