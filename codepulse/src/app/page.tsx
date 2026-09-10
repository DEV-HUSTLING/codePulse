"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "../components/Header";
import { CustomRepoAnalyzer } from "../components/CustomRepoAnalyzer";
import { SampleBenchmarkSection } from "../components/SampleBenchmarkSection";
import { AnalysisProgress } from "../components/AnalysisProgress";
import { InsightsBanner } from "../components/InsightsBanner";
import { RankingTable } from "../components/RankingTable";
import { RepoDetailModal } from "../components/RepoDetailModal";
import { Repository, AnalysisResult, InsightsData } from "../types";
import { Sparkles, AlertCircle, RefreshCw, BarChart3, Database } from "lucide-react";

export default function Home() {
  // State for repository sample catalog (BigQuery)
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [sampleMode, setSampleMode] = useState<"mixed" | "popular">("mixed");
  const [sampleLimit, setSampleLimit] = useState<number>(10);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(true);

  // State for Custom Repo Analyzer
  const [customRepoName, setCustomRepoName] = useState<string>("my-org/super-agent");
  const [customReadme, setCustomReadme] = useState<string>(
`# SuperAgent

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
  );

  // State for analysis execution
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingSource, setAnalyzingSource] = useState<"custom" | "sample">("custom");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentRepoIndex, setCurrentRepoIndex] = useState<number>(0);
  const [currentRepoName, setCurrentRepoName] = useState<string>("");
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [selectedModalRepo, setSelectedModalRepo] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch sample repositories list from BigQuery
  const fetchRepositories = useCallback(async (currentMode = sampleMode, currentLimit = sampleLimit) => {
    setIsLoadingRepos(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/repositories?mode=${currentMode}&limit=${currentLimit}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const repos: Repository[] = data.repositories || [];
      setRepositories(repos);
      // Auto-select all by default in the sample batch
      setSelectedRepos(repos.map(r => r.repo_name));
    } catch (err: any) {
      console.error("Failed to fetch repositories:", err);
      setErrorMessage("Could not connect to BigQuery repository service. Ensure the backend server is running.");
    } finally {
      setIsLoadingRepos(false);
    }
  }, [sampleMode, sampleLimit]);

  // Fetch existing rankings and cohort insights
  const fetchRankingsAndInsights = useCallback(async () => {
    try {
      const [rankingsRes, insightsRes] = await Promise.all([
        fetch("/api/rankings"),
        fetch("/api/insights")
      ]);

      if (rankingsRes.ok) {
        const rankData = await rankingsRes.json();
        if (rankData.rankings && rankData.rankings.length > 0) {
          setAnalyses(rankData.rankings);
        }
      }

      if (insightsRes.ok) {
        const insData = await insightsRes.json();
        setInsights(insData);
      }
    } catch (err) {
      console.error("Failed to load existing rankings:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRepositories("mixed", 10);
    fetchRankingsAndInsights();
  }, [fetchRepositories, fetchRankingsAndInsights]);

  // Handle sample mode change
  const handleSampleModeChange = (newMode: "mixed" | "popular") => {
    setSampleMode(newMode);
    fetchRepositories(newMode, sampleLimit);
  };

  // Handle sample limit change
  const handleSampleLimitChange = (newLimit: number) => {
    setSampleLimit(newLimit);
    fetchRepositories(sampleMode, newLimit);
  };

  // Toggle selection in sample list
  const handleToggleRepo = (repoName: string) => {
    setSelectedRepos(prev => 
      prev.includes(repoName) ? prev.filter(n => n !== repoName) : [...prev, repoName]
    );
  };

  const handleSelectAll = () => {
    setSelectedRepos(repositories.map(r => r.repo_name));
  };

  const handleClearSelection = () => {
    setSelectedRepos([]);
  };

  // Analyze Custom Repo Action
  const handleRunCustomAnalysis = async () => {
    if (!customRepoName.trim() || !customReadme.trim()) return;

    setErrorMessage(null);
    setIsAnalyzing(true);
    setAnalyzingSource("custom");
    setCurrentStep(1);
    setCurrentRepoIndex(0);
    setCurrentRepoName(customRepoName);

    try {
      setCurrentStep(2); // AI Analysis
      const res = await fetch("/api/analyze-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_name: customRepoName.trim(),
          readme_content: customReadme,
          stars: 0,
          language: "Python",
          license: "MIT"
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Custom analysis failed");
      }

      const analysisData: AnalysisResult = await res.json();
      analysisData.is_custom = true;

      // Update analyses in place
      setAnalyses(prev => {
        const filtered = prev.filter(a => a.repo_name !== analysisData.repo_name);
        return [analysisData, ...filtered].sort((a, b) => b.overall_score - a.overall_score);
      });

      setSelectedModalRepo(analysisData);
      setCurrentStep(4);
      await fetchRankingsAndInsights();
    } catch (err: any) {
      console.error("Custom analysis error:", err);
      setErrorMessage(err.message || "An error occurred while evaluating your custom README.");
    } finally {
      setIsAnalyzing(false);
      setCurrentRepoName("");
    }
  };

  // Analyze Sample Repos Action
  const handleRunSampleAnalysis = async () => {
    if (selectedRepos.length === 0) return;

    setErrorMessage(null);
    setIsAnalyzing(true);
    setAnalyzingSource("sample");
    setCurrentStep(0);
    setCurrentRepoIndex(0);

    try {
      const reposToAnalyze = [...selectedRepos];
      const newResults: AnalysisResult[] = [];

      for (let i = 0; i < reposToAnalyze.length; i++) {
        const repoName = reposToAnalyze[i];
        setCurrentRepoIndex(i);
        setCurrentRepoName(repoName);
        setCurrentStep(1); // Fetching README from BigQuery
        
        await new Promise(r => setTimeout(r, 100));
        setCurrentStep(2); // Gemini AI evaluation

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo_names: [repoName] })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            newResults.push(data.results[0]);
            // Update live list
            setAnalyses(prev => {
              const map = new Map<string, AnalysisResult>();
              [...prev, ...newResults].forEach(item => map.set(item.repo_name, item));
              return Array.from(map.values()).sort((a, b) => b.overall_score - a.overall_score);
            });
          }
        }

        setCurrentStep(3); // Scoring & Caching
        await new Promise(r => setTimeout(r, 100));
      }

      setCurrentStep(4); // Insights
      await fetchRankingsAndInsights();
    } catch (err: any) {
      console.error("Sample analysis execution error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during sample documentation analysis.");
    } finally {
      setIsAnalyzing(false);
      setCurrentRepoName("");
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative">
      {/* Dynamic Background Glow Elements */}
      <div className="fixed inset-0 bg-radial-gradient pointer-events-none opacity-80" />
      <div className="fixed inset-0 bg-radial-subtle pointer-events-none opacity-60" />

      {/* Main Header */}
      <Header analyzedCount={analyses.length} avgScore={insights?.average_score || 0} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 relative z-10">
        {/* Hero Section */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>AI Documentation Health & Developer Experience Benchmark</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            README Health
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            AI-powered documentation quality evaluator powered by Google Gemini 2.5 and BigQuery. Audit your own project's README or benchmark against industry open-source repositories to discover documentation flaws, deterministic health scores, and instant AI section rewrites.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <div className="flex-1">{errorMessage}</div>
            <button
              type="button"
              onClick={() => fetchRepositories(sampleMode, sampleLimit)}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* SECTION 1 (GOLDEN FEATURE): Custom Project Documentation Auditor */}
        <CustomRepoAnalyzer
          customRepoName={customRepoName}
          onCustomRepoChange={setCustomRepoName}
          customReadme={customReadme}
          onCustomReadmeChange={setCustomReadme}
          onAnalyze={handleRunCustomAnalysis}
          isAnalyzing={isAnalyzing && analyzingSource === "custom"}
        />

        {/* SECTION 2 (EXPLORATION & SAMPLES): BigQuery Catalog Benchmark */}
        <SampleBenchmarkSection
          repositories={repositories}
          selectedRepos={selectedRepos}
          onToggleRepo={handleToggleRepo}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          mode={sampleMode}
          onModeChange={handleSampleModeChange}
          limit={sampleLimit}
          onLimitChange={handleSampleLimitChange}
          onFetchRepos={() => fetchRepositories(sampleMode, sampleLimit)}
          onAnalyze={handleRunSampleAnalysis}
          isAnalyzing={isAnalyzing && analyzingSource === "sample"}
          isLoadingRepos={isLoadingRepos}
        />

        {/* Active Analysis Progress Bar */}
        {isAnalyzing && (
          <AnalysisProgress
            currentStep={currentStep}
            currentRepoIndex={currentRepoIndex}
            totalRepos={analyzingSource === "custom" ? 1 : selectedRepos.length}
            currentRepoName={currentRepoName}
          />
        )}

        {/* Cohort Insights & Anomalies Banner */}
        {insights && insights.total_analyzed > 0 && (
          <InsightsBanner
            insights={insights}
            onSelectRepo={repo => setSelectedModalRepo(repo)}
          />
        )}

        {/* Leaderboard & Ranking Table */}
        {analyses.length > 0 ? (
          <RankingTable
            analyses={analyses}
            onSelectRepo={repo => setSelectedModalRepo(repo)}
          />
        ) : (
          !isAnalyzing && (
            <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Repositories Analyzed Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Audit your custom README above or select sample repositories from BigQuery to generate your documentation health leaderboard.
                </p>
              </div>
            </div>
          )
        )}
      </main>

      {/* Detailed Modal Drawer */}
      <RepoDetailModal
        repo={selectedModalRepo}
        onClose={() => setSelectedModalRepo(null)}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#070a12] py-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Codepulse • README Documentation Health Analyzer</span>
          <span className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-cyan-400" /> BigQuery + <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Gemini AI
          </span>
        </div>
      </footer>
    </div>
  );
}
