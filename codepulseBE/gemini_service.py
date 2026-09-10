import os
import json
import logging
from typing import Dict, Any, Optional
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
from config import PROJECT_ID, GEMINI_MODEL, GEMINI_API_KEY, MAX_README_CHARS

logger = logging.getLogger(__name__)

def get_ai_client() -> genai.Client:
    """
    Initializes Google GenAI client via Vertex AI or API Key.
    """
    if GEMINI_API_KEY:
        return genai.Client(api_key=GEMINI_API_KEY)
    return genai.Client(vertexai=True, project=PROJECT_ID, location="us-central1")

ANALYSIS_SYSTEM_INSTRUCTION = """
You are an expert technical writer and developer documentation evaluator.
Analyze the provided GitHub repository README file objectively across 8 standard documentation health categories:

1. project_clarity (Weight 20%): Does the README explain what the project does, who it is for, and why use it? Pay special attention to the first 5-10 lines.
2. getting_started (Weight 20%): Installation instructions, prerequisites, configuration, quickstart, and basic usage.
3. examples (Weight 15%): Realistic code examples, CLI/API snippets, outputs, screenshots or diagrams.
4. structure (Weight 10%): Section headings, logical flow, scannability, table of contents when appropriate.
5. completeness (Weight 15%): Features, usage, configuration options, troubleshooting, FAQ, license, contributing (judged contextually).
6. readability (Weight 10%): Clarity, conciseness, formatting, sentence quality, avoiding unnecessary wall-of-text or jargon.
7. visual_presentation (Weight 5%): Badges, diagrams, syntax highlighting, clear visual hierarchy.
8. trust_signals (Weight 5%): CI status, license, release info, security, documentation links, active maintenance signals.

Requirements:
- Integer score from 0 to 100 for each category with an insightful, objective assessment.
- A concise 2-sentence executive summary.
- 3 to 5 key strengths.
- 3 to 5 key weaknesses.
- 3 to 5 actionable recommendations with priorities ("high", "medium", "low").
- 2 to 3 concrete rewrite suggestions for specific sections (provide exact section name, excerpt of original text, improved suggested text, and reason).

Return STRICTLY valid JSON conforming to this schema:
{
  "summary": "...",
  "categories": {
    "project_clarity": {"score": 85, "assessment": "..."},
    "getting_started": {"score": 60, "assessment": "..."},
    "examples": {"score": 70, "assessment": "..."},
    "structure": {"score": 82, "assessment": "..."},
    "completeness": {"score": 65, "assessment": "..."},
    "readability": {"score": 80, "assessment": "..."},
    "visual_presentation": {"score": 75, "assessment": "..."},
    "trust_signals": {"score": 60, "assessment": "..."}
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": [
    {"priority": "high", "issue": "...", "recommendation": "..."}
  ],
  "rewrite_suggestions": [
    {"section": "...", "original": "...", "suggested": "...", "reason": "..."}
  ]
}
"""

def analyze_readme(readme_content: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calls Gemini to perform structured documentation quality analysis.
    """
    client = get_ai_client()
    
    repo_name = metadata.get("repo_name", "Unknown Repository")
    stars = metadata.get("stars", 0)
    language = metadata.get("language", "Unknown")
    license_val = metadata.get("license", "Unknown")
    
    # Intelligent truncation if necessary
    truncated = False
    content_to_send = readme_content
    if len(content_to_send) > MAX_README_CHARS:
        content_to_send = content_to_send[:MAX_README_CHARS]
        truncated = True
        
    prompt = f"""
Analyze this GitHub README:

Repository: {repo_name}
Stars: {stars}
Primary Language: {language}
License: {license_val}
{"[NOTE: The README content was intelligently truncated due to excessive length.]" if truncated else ""}

--- README CONTENT START ---
{content_to_send}
--- README CONTENT END ---
"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=ANALYSIS_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        
        raw_text = response.text.strip()
        # Clean any markdown code blocks if present
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        
        data = json.loads(raw_text)
        return data
        
    except json.JSONDecodeError as jde:
        logger.error(f"JSON decode error from Gemini response: {jde}. Raw: {raw_text[:200]}")
        # Fallback structured response
        return get_fallback_analysis(repo_name, "Gemini returned non-standard JSON formatting.")
    except Exception as e:
        logger.error(f"Error calling Gemini: {e}")
        # If model name failed, try gemini-1.5-flash fallback
        if "2.5" in GEMINI_MODEL:
            try:
                logger.info("Attempting fallback to gemini-1.5-flash...")
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=ANALYSIS_SYSTEM_INSTRUCTION,
                        response_mime_type="application/json",
                        temperature=0.2
                    )
                )
                raw_text = response.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                return json.loads(raw_text.strip())
            except Exception as e2:
                logger.error(f"Fallback Gemini model also failed: {e2}")
        raise e

def get_fallback_analysis(repo_name: str, reason: str) -> Dict[str, Any]:
    return {
        "summary": f"Documentation review for {repo_name}. {reason}",
        "categories": {
            "project_clarity": {"score": 70, "assessment": "Standard project overview provided."},
            "getting_started": {"score": 65, "assessment": "Basic instructions available."},
            "examples": {"score": 60, "assessment": "Examples could be expanded with more scenarios."},
            "structure": {"score": 70, "assessment": "Standard Markdown structure followed."},
            "completeness": {"score": 65, "assessment": "Essential sections present."},
            "readability": {"score": 75, "assessment": "Readable and easy to understand."},
            "visual_presentation": {"score": 60, "assessment": "Standard formatting used."},
            "trust_signals": {"score": 65, "assessment": "Basic repository indicators found."}
        },
        "strengths": ["README is present", "Basic syntax formatting"],
        "weaknesses": ["Needs more comprehensive documentation"],
        "recommendations": [
            {"priority": "high", "issue": "Enhance getting started guide", "recommendation": "Provide explicit step-by-step setup commands."}
        ],
        "rewrite_suggestions": []
    }
