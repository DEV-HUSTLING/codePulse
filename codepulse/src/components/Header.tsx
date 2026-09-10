import React from "react";
import { Activity, Database, Sparkles, ShieldCheck } from "lucide-react";

interface HeaderProps {
  analyzedCount?: number;
  avgScore?: number;
}

export const Header: React.FC<HeaderProps> = ({ analyzedCount = 0, avgScore = 0 }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090d16]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="h-full w-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
              <Activity className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                codepulse
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              README Documentation Health Analyzer
            </p>
          </div>
        </div>

        {/* Integration Badges & Stats */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span>BigQuery</span>
            <span className="text-slate-600">•</span>
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Gemini 2.5 Flash</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>GCP Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
