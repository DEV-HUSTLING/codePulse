import React from "react";
import { Sparkles, FileText, ArrowRight, RefreshCw, Wand2, Trash2, Code, Zap } from "lucide-react";

interface CustomRepoAnalyzerProps {
  customRepoName: string;
  onCustomRepoChange: (name: string) => void;
  customReadme: string;
  onCustomReadmeChange: (content: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const TEMPLATES = [
  {
    label: "Full Library Template",
    repo: "my-org/super-agent",
    readme: `# SuperAgent

SuperAgent is a lightweight, type-safe Python SDK for building autonomous multi-agent pipelines in seconds.

## Why SuperAgent?
- ⚡ **Blazing Fast**: Async-first execution architecture.
- 🔒 **Deterministic**: Zero prompt drift with structured Pydantic outputs.
- 🔌 **Universal Compatibility**: Works with Gemini 2.5, OpenAI, and Anthropic.

## Quickstart

### Installation
\`\`\`bash
pip install superagent-sdk
\`\`\`

### Basic Usage
\`\`\`python
from superagent import Agent, Task

agent = Agent(name="Researcher", model="gemini-2.5-flash")
task = Task("Summarize quantum computing breakthroughs")
result = agent.execute(task)

print(result.summary)
\`\`\`

## Configuration
Configure environment variables via \`.env\`:
| Variable | Description | Default |
| :--- | :--- | :--- |
| \`AGENT_API_KEY\` | Your API key | \`None\` |
| \`AGENT_TIMEOUT\` | Max task runtime in seconds | \`30\` |

## Contributing
Pull requests are welcome! Read our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License
MIT License © 2026 SuperAgent Team`
  },
  {
    label: "CLI Tool Starter",
    repo: "developer/git-pulse",
    readme: `# GitPulse

A lightning-fast command-line tool to visualize team velocity and repository documentation health.

## Installation
\`\`\`bash
npm install -g git-pulse-cli
\`\`\`

## Usage
\`\`\`bash
git-pulse scan ./my-project
\`\`\`

## License
MIT`
  }
];

export const CustomRepoAnalyzer: React.FC<CustomRepoAnalyzerProps> = ({
  customRepoName,
  onCustomRepoChange,
  customReadme,
  onCustomReadmeChange,
  onAnalyze,
  isAnalyzing
}) => {
  const charCount = customReadme.length;
  const isReady = customRepoName.trim().length > 0 && customReadme.trim().length > 0;

  return (
    <div className="w-full glass-panel rounded-2xl p-5 md:p-7 border border-indigo-500/30 shadow-2xl relative overflow-hidden bg-gradient-to-b from-indigo-950/30 via-slate-900/80 to-slate-950/90">
      {/* Background Accent Gradients */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold uppercase tracking-wider">
              <Zap className="h-3 w-3 text-amber-400" /> Standalone Auditor
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/40">
              Personal & Custom Projects
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <span>Audit Your Repository Documentation</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Test and benchmark your own project's README. Gemini AI will evaluate it across 8 health criteria, calculate your deterministic score, and generate copy-paste section improvements.
          </p>
        </div>

        {/* Quick Starters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">Starters:</span>
          {TEMPLATES.map((tmpl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onCustomRepoChange(tmpl.repo);
                onCustomReadmeChange(tmpl.readme);
              }}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-indigo-400/50 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Wand2 className="h-3 w-3 text-indigo-400" />
              <span>{tmpl.label}</span>
            </button>
          ))}
          {customReadme.trim() && (
            <button
              type="button"
              onClick={() => {
                onCustomRepoChange("");
                onCustomReadmeChange("");
              }}
              className="p-1.5 text-xs rounded-lg bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 transition-all"
              title="Clear inputs"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Input Form */}
      <div className="pt-5 space-y-4">
        {/* Repo Name */}
        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
            Repository Identifier or Project Name
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. your-github-username/project-name or my-startup-api"
              value={customRepoName}
              onChange={e => onCustomRepoChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Readme Content */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-400" />
              <span>README Content (Markdown)</span>
            </label>
            <span className={`text-[11px] font-mono ${charCount > 20000 ? "text-amber-400" : "text-slate-400"}`}>
              {charCount.toLocaleString()} chars
            </span>
          </div>
          <textarea
            rows={7}
            placeholder="# Your Project Title&#10;&#10;Explain what this project does and who it is for in 2-3 concise sentences...&#10;&#10;## Quickstart&#10;```bash&#10;npm install your-package&#10;```"
            value={customReadme}
            onChange={e => onCustomReadmeChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 text-xs font-mono resize-y leading-relaxed transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-4 border-t border-white/10">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Code className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>If your score outperforms the cohort, your project will claim the <strong>#1 Top Performer</strong> badge.</span>
        </div>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing || !isReady}
          className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-xl ${
            isAnalyzing || !isReady
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
              : "bg-gradient-to-r from-amber-500 via-indigo-600 to-cyan-500 hover:from-amber-400 hover:via-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/40 hover:shadow-indigo-600/60 cursor-pointer active:scale-98"
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-white" />
              <span>Auditing with Gemini AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-amber-200" />
              <span>Audit & Score My Documentation</span>
              <ArrowRight className="h-4 w-4 text-cyan-200" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
