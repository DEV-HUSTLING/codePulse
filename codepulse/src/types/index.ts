export interface Repository {
  repo_name: string;
  owner: string;
  name: string;
  stars: number;
  language: string;
  license: string;
  readme_path: string;
  readme_size: number;
  repo_url: string;
  tier?: string;
  has_cached_analysis?: boolean;
  cached_score?: number;
  cached_grade?: string;
}

export interface CategoryScore {
  score: number;
  assessment: string;
}

export interface CategoryBreakdown {
  project_clarity: CategoryScore;
  getting_started: CategoryScore;
  examples: CategoryScore;
  structure: CategoryScore;
  completeness: CategoryScore;
  readability: CategoryScore;
  visual_presentation: CategoryScore;
  trust_signals: CategoryScore;
  [key: string]: CategoryScore;
}

export interface Recommendation {
  priority: "high" | "medium" | "low" | string;
  issue: string;
  recommendation: string;
}

export interface RewriteSuggestion {
  section: string;
  original: string;
  suggested: string;
  reason?: string;
}

export interface AnalysisResult {
  repo_name: string;
  owner: string;
  name: string;
  stars: number;
  language: string;
  license: string;
  repo_url: string;
  readme_path: string;
  readme_size: number;
  overall_score: number;
  grade: "Excellent" | "Good" | "Needs Improvement" | "Poor" | string;
  main_issue: string;
  summary: string;
  categories: CategoryBreakdown;
  category_weights: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  rewrite_suggestions: RewriteSuggestion[];
  raw_readme_snippet?: string;
  cached?: boolean;
  is_custom?: boolean;
}

export interface InsightItem {
  type: "disparity" | "underdog" | "leader" | "trend" | string;
  title: string;
  description: string;
  badge: string;
}

export interface InsightsData {
  total_analyzed: number;
  average_score: number;
  top_performer?: AnalysisResult | null;
  lowest_performer?: AnalysisResult | null;
  high_star_low_doc?: AnalysisResult | null;
  low_star_high_doc?: AnalysisResult | null;
  category_averages: Record<string, number>;
  insights_list: InsightItem[];
}
