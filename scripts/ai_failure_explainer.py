#!/usr/bin/env python3
"""AI Failure Explainer: Diagnoses CI/CD or runtime test failure logs and provides copy-paste fixes.

Can be run locally or in GitHub Actions.
Usage:
  python scripts/ai_failure_explainer.py [--log-file PATH] [--output-file PATH] [--mock]
"""

import argparse
import os
import sys
from typing import Optional
import httpx

SYSTEM_PROMPT = """You are the Lead DevOps & Site Reliability AI for 'LabelLens India'.
A continuous integration job or deployment health check has failed.
Analyze the provided execution log and generate an actionable diagnostic report in GitHub-flavored Markdown:

Format:
## 🚨 LabelLens AI Incident & CI Failure Diagnosis

### 🔍 Probable Root Cause
(Concise 2-3 sentence analysis of exactly why the failure occurred)

### 📁 Affected Component & File
- **Service/Module**: (e.g., `labellens-api`, `docker-compose`, `RulesEngine`)
- **Failing Location**: (file path, line number, or command)

### 🛠️ Copy-Paste Remediation Fix
```bash
# or code snippet with exact instructions to resolve the failure
```

### 🛡️ Prevention Strategy
(How to prevent this regression from reoccurring in CI/CD)
"""


def get_log_content(log_file: Optional[str] = None) -> str:
    """Read log content from file or stdin."""
    if log_file and os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

    if not sys.stdin.isatty():
        return sys.stdin.read()

    return "No failure logs supplied. (Sample simulated pytest/Docker error for diagnostics testing)"


def run_gemini_diagnosis(log_content: str, api_key: str) -> str:
    """Send failure logs to Gemini 1.5 Flash via REST API."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": SYSTEM_PROMPT},
                    {"text": f"Here are the failure logs:\n\n```text\n{log_content[:25000]}\n```"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
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


def run_mock_diagnosis(log_content: str) -> str:
    """Deterministic local diagnostic simulation when running offline."""
    return f"""## 🚨 LabelLens AI Incident & CI Failure Diagnosis (Simulated Analysis)

### 🔍 Probable Root Cause
The failure was triggered by environment or configuration mismatch during service startup or validation. Common patterns include port bindings (e.g. 8000 or 3000 already in use), missing `.env` parameters (`LLM_PROVIDER`, `GEMINI_API_KEY`), or strict Pydantic model validation errors on nutrition schema contracts.

### 📁 Affected Component & File
- **Service/Module**: `labellens-api` / Docker runtime
- **Failing Location**: Integration test or container healthcheck endpoint (`/health`)

### 🛠️ Copy-Paste Remediation Fix
```bash
# 1. Ensure local environment file is created
cp .env.example .env

# 2. Re-verify Docker Compose container health
docker compose down -v
docker compose up -d --build

# 3. Test API health endpoint
curl -f http://localhost:8000/health
```

### 🛡️ Prevention Strategy
- Always run pre-flight pytest suites (`pytest -v`) before pushing commits.
- Ensure all services provide `/health` endpoints with Docker Compose healthcheck dependencies.
"""


def main():
    parser = argparse.ArgumentParser(description="AI Failure Explainer for LabelLens India")
    parser.add_argument("--log-file", help="Path to a log file")
    parser.add_argument("--output-file", help="Path to write the diagnosis output")
    parser.add_argument("--mock", action="store_true", help="Force deterministic mock diagnosis")
    args = parser.parse_args()

    log_content = get_log_content(args.log_file)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()

    if api_key and not args.mock:
        diagnosis = run_gemini_diagnosis(log_content, api_key)
    else:
        diagnosis = run_mock_diagnosis(log_content)

    print(diagnosis)

    if args.output_file:
        with open(args.output_file, "w", encoding="utf-8") as f:
            f.write(diagnosis)
        print(f"\n✓ Saved diagnosis output to {args.output_file}")


if __name__ == "__main__":
    main()
