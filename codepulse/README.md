# Codepulse Frontend (`codepulse`)

Next.js 16 + React 19 web application for **Codepulse (README Documentation Health Analyzer)**. Built with TypeScript, TailwindCSS 4, and Lucide Icons.

---

## Key Features

1. **Custom Project Documentation Auditor**:
   - Primary developer tool to audit, benchmark, and score personal or public repository READMEs.
   - Built-in starter templates (Full Library Starter, CLI Tool Starter, and clean markdown editor).
   - Real-time character count and direct AI evaluation trigger.

2. **Open-Source Benchmark Playground (BigQuery Catalog)**:
   - Live querying of GitHub repository samples from Google BigQuery.
   - Preset sampling strategies: `Mixed Sample (Contrast Tiers)` and `Top Starred Giants`.
   - Sample size selectors (`5`, `10`, `15` repos), multi-select filters, and batch analysis execution.

3. **Cohort Intelligence & Top Performer Showcase**:
   - Displays Cohort Average Health score with interactive **Score Calculation Modal** detailing the 8-category weighting matrix.
   - Highlights the **Top Performer** benchmark repository (with celebratory styling when a user's custom submission takes #1).
   - Identifies ecosystem bottlenecks and popularity-vs-quality anomalies.

4. **Leaderboard & Detailed Inspection Drawer**:
   - Interactive ranking table with category sparklines, star counts, and primary issue tags.
   - Deep-dive modal drawer featuring full category radar assessments, strengths, weaknesses, and **Gemini AI Markdown Section Rewrites** (ready to copy and paste).

---

## Directory & Component Structure

```
codepulse/
├── src/
│   ├── app/
│   │   ├── page.tsx               # Main Dashboard Container
│   │   ├── layout.tsx             # Global Layout & Fonts
│   │   ├── globals.css            # Dark Mode Design System Tokens
│   │   └── documentation/page.tsx # Framework & Methodology Docs
│   ├── components/
│   │   ├── Header.tsx                 # Top Navigation & Status
│   │   ├── CustomRepoAnalyzer.tsx     # Dedicated Personal Project Auditor
│   │   ├── SampleBenchmarkSection.tsx # BigQuery Open-Source Playground
│   │   ├── InsightsBanner.tsx         # KPIs, Calculation Modal & Anomalies
│   │   ├── RankingTable.tsx           # Sortable Leaderboard Table
│   │   ├── RepoDetailModal.tsx        # Drawer with AI Section Rewrites
│   │   ├── AnalysisProgress.tsx       # Live Evaluation Stepper
│   │   └── ScoreBadge.tsx             # Color-Coded Score Badges
│   └── types/
│       └── index.ts                   # TypeScript Interfaces & Schemas
├── next.config.ts                 # API Rewrites to FastAPI Backend (8000)
└── package.json
```

---

## API Proxy Configuration

The Next.js frontend automatically routes all requests matching `/api/:path*` to the FastAPI backend running on port 8000 via `next.config.ts`:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};
```

---

## Getting Started

### 1. Install Dependencies
```bash
cd codepulse
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

The application will be available at: **[http://localhost:3000](http://localhost:3000)**

### 3. Build for Production
```bash
npm run build
npm run start
```
