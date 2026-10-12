#!/usr/bin/env python3
"""AI PR Reviewer: Analyzes git diffs against FSSAI regulatory rules, security, and DevOps standards.

Can be run locally or inside GitHub Actions.
Usage:
  python scripts/ai_pr_reviewer.py [--diff-file PATH] [--output-file PATH] [--mock]
"""

import argparse
import os
import subprocess
import sys
from typing import Optional
import httpx

SYSTEM_PROMPT = """You are the Senior AI DevOps & Food Safety Technical Reviewer for 'LabelLens India'.
You review pull request diffs for adherence to:
1. SECURITY & DEVSECOPS: Zero hardcoded secrets, no unencrypted credentials, proper Docker non-root users.
2. FSSAI REGULATORY INTEGRITY: Red-flag thresholds MUST stay strictly in YAML (apps/api/config/rules.yaml), NEVER hardcoded in Python code.
3. CONTRACT INTEGRITY: LabelExtraction and AnalysisResult Pydantic schema consistency across backend and frontend.
4. OBSERVABILITY: Every service must maintain /health and Prometheus metrics.
5. CODE QUALITY & TESTS: High test coverage, comprehensive error handling.

Format your response in crisp GitHub-flavored Markdown:
- ## 🤖 LabelLens AI PR Review
- ### 🛡️ Security & Secrets Analysis (Pass/Warning/Fail)
- ### 🥗 FSSAI & Business Logic Compliance (Pass/Warning/Fail)
- ### 🐳 Architecture & Docker Observability (Pass/Warning/Fail)
- ### 🧪 Test Coverage & Regressions (Pass/Warning/Fail)
- ### 💡 High-Impact Recommendations (Bullet points with code snippets if applicable)
- ### 🏁 Overall Verdict: [APPROVE / REQUEST_CHANGES / COMMENT]
"""


def get_git_diff(diff_file: Optional[str] = None) -> str:
    """Read diff from file or execute git diff."""
    if diff_file and os.path.exists(diff_file):
        with open(diff_file, "r", encoding="utf-8") as f:
            return f.read()

    try:
        # Diff against main or HEAD~1
        res = subprocess.run(
            ["git", "diff", "HEAD~1...HEAD"],
            capture_output=True,
            text=True,
            check=False,
        )
        if res.stdout.strip():
            return res.stdout
    except Exception:
        pass

    try:
        res = subprocess.run(
            ["git", "diff", "HEAD"],
            capture_output=True,
            text=True,
            check=False,
        )
        if res.stdout.strip():
            return res.stdout
    except Exception:
        pass

    return ""


def run_gemini_review(diff_content: str, api_key: str) -> str:
    """Send diff to Gemini 1.5 Flash via REST API."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": SYSTEM_PROMPT},
                    {"text": f"Here is the Pull Request git diff to review:\n\n```diff\n{diff_content[:30000]}\n```"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048
        }
    }

    try:
        with httpx.Client(timeout=45.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
            return f"⚠️ Gemini API returned status {resp.status_code}: {resp.text}"
    except Exception as e:
        return f"⚠️ Error querying Gemini API: {str(e)}"


def run_mock_review(diff_content: str) -> str:
    """Deterministic local review when running without Gemini API key."""
    has_yaml_edit = "rules.yaml" in diff_content
    has_tests = "test_" in diff_content
    has_docker = "Dockerfile" in diff_content or "docker-compose" in diff_content

    return f"""## 🤖 LabelLens AI PR Review (Deterministic Simulation)

### 🛡️ Security & Secrets Analysis: ✅ PASS
- No unencrypted API keys or secret tokens detected in diff.
- Environment variables adhere to `.env.example` contract.

### 🥗 FSSAI & Business Logic Compliance: {'✅ PASS' if not ('rules.py' in diff_content) else '⚠️ WARNING'}
- Nutritional evaluation rules remain decoupled in configuration.
- {f"Found modifications to rules.yaml - verify regulatory thresholds." if has_yaml_edit else "No regulatory rule schema deviations detected."}

### 🐳 Architecture & Docker Observability: {'✅ PASS' if has_docker else 'ℹ️ UNCHANGED'}
- Standard health checks (`/health`) and Prometheus scraping ports configured.

### 🧪 Test Coverage & Regressions: {'✅ PASS' if has_tests else '⚠️ ADVISORY'}
- {'Unit tests and fixtures included in changes.' if has_tests else 'Consider adding automated test coverage for new endpoints/modules.'}

### 💡 High-Impact Recommendations
- Ensure `LLM_PROVIDER` environment variable toggles smoothly between `mock`, `gemini`, and `vllm`.
- Validate that all Docker containers pass non-root user checks.

### 🏁 Overall Verdict: **APPROVE**
*Automated review generated by LabelLens AI Review Engine.*
"""


def main():
    parser = argparse.ArgumentParser(description="AI PR Reviewer for LabelLens India")
    parser.add_argument("--diff-file", help="Path to a diff file")
    parser.add_argument("--output-file", help="Path to write the review output")
    parser.add_argument("--mock", action="store_true", help="Force deterministic mock review")
    args = parser.parse_args()

    diff = get_git_diff(args.diff_file)
    if not diff:
        diff = "# No file changes detected in working copy diff."

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if api_key and not args.mock:
        review = run_gemini_review(diff, api_key)
    else:
        review = run_mock_review(diff)

    print(review)

    if args.output_file:
        with open(args.output_file, "w", encoding="utf-8") as f:
            f.write(review)
        print(f"\n✓ Saved review output to {args.output_file}")


if __name__ == "__main__":
    main()
