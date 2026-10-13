# LabelLens India — AI-assisted DevOps Project

Snap a photo of any packaged-food label → get a structured nutrition breakdown, a health score, and **red flags** for missing or misleading information (FSSAI-aware).

## 0. Master prompt for Antigravity (paste this first)

> You are my senior DevOps + AI engineer. Work inside `C:\Ankit\AI_Projects\AI_assisted_devOps`.
> Build "LabelLens India" exactly as described in ARCHITECTURE.md. Work phase by phase (section 9).
> After each phase: run it in Docker, run tests, show me the output, then commit with a conventional-commit message.
> Rules: never hardcode secrets (use .env + .env.example); every service has a Dockerfile and a /health endpoint;
> the LLM provider must be swappable via env var `LLM_PROVIDER=vllm|gemini|mock`; red-flag rules live in YAML, not in code.
> Do not move to the next phase until I say "next".

## 1. Goals
1. Solve a real problem: weak label awareness in India.
2. Demonstrate an **AI-assisted DevOps** workflow: Antigravity writes code/IaC, AI reviews PRs and explains pipeline failures, AI runs on AMD GPU infra.
3. Run free after the AMD credits expire.

## 2. High-level architecture

### A. Local Simulation (Docker Compose)
```
 Browser / phone (PWA, camera upload)
            │ HTTPS / HTTP
            ▼
 ┌──────────────────────── Docker Network ────────────────────────┐
 │  web (React + Vite + Nginx Reverse Proxy on Port 3000)         │
 │        │  POST /api/analyze (image)                            │
 │        ▼                                                       │
 │  api (FastAPI, Port 8000)                                      │
 │   1. validate + strip EXIF + resize image (Pillow)             │
 │   2. extractor  ──► LLM provider (pluggable: vllm|gemini|mock) │
 │   3. rules engine (YAML) → FSSAI red flags + 100-pt score      │
 │   4. save result (in-memory SCAN_STORE / SQLite)               │
 │        │                                                       │
 │        ├──► vllm  (AMD MI300X GPU droplet, ROCm, Qwen2.5-VL)   │
 │        └──► Gemini API (gemini-flash-lite-latest fallback)     │
 │  prometheus (9090) + grafana (3001) (scrapes /metrics)         │
 └────────────────────────────────────────────────────────────────┘
```

### B. Live Production Cloud Architecture (Render.com Free Tier)
```
                        End Users (Mobile / Desktop)
                                     │ HTTPS
                                     ▼
 ┌─────────────────────────── Render Cloud ───────────────────────────┐
 │                                                                    │
 │  1. labellens-web (https://labellens-web.onrender.com)             │
 │     • Single-Page App: React 18 + Vite + Custom Glassmorphism CSS │
 │     • Dynamic runtime API configuration via /env-config.js         │
 │     • Multilingual UI (EN, HI, MR) + Product Comparison Mode       │
 │                                                                    │
 │  2. labellens-api (https://labellens-api-ktax.onrender.com)        │
 │     • FastAPI Container (Python 3.11, Uvicorn)                     │
 │     • Google Gemini 1.5 Flash Vision (gemini-flash-lite-latest)    │
 │     • 100% YAML-configured FSSAI Rules Engine                      │
 │     • Open Food Facts India & Offline Barcode Lookup               │
 │     • Non-food rejection gate (hand / face / objects)              │
 │     • Prometheus metrics endpoint at /metrics                      │
 │                                                                    │
 │  3. labellens-monitoring (https://labellens-monitoring.onrender.com)
 │     • Single unified Docker container (Prometheus + Grafana 11)   │
 │     • Auto-scrapes live production API metrics over HTTPS          │
 │     • Pre-provisioned "LabelLens India Overview" Grafana Dashboard │
 └────────────────────────────────────────────────────────────────────┘
```

## 3. Tech stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite, Custom CSS Design System, Lucide Icons, PWA | Zero CSS bloat, rich glassmorphic dark palette, instant mobile camera capture & barcode scanner |
| Backend | Python FastAPI (3.11) | High-performance async API, auto OpenAPI docs, Pydantic validation |
| AI extraction | Vision-language model (Qwen2.5-VL-7B-Instruct) served by **vLLM on ROCm** | Runs on AMD GPU droplet; OpenAI-compatible API |
| AI fallback | Google Gemini Vision (`gemini-flash-lite-latest` + fallback chain) | Free tier (15 RPM), high-accuracy OCR + FSSAI nutrient extraction |
| Rules | YAML + Python evaluator ([`apps/api/config/rules.yaml`](apps/api/config/rules.yaml)) | 100% auditable, editable without rebuilding or redeploying code |
| Storage | In-memory `SCAN_STORE` / SQLite | Session scan history and quick barcode lookups |
| Containers | Docker, docker-compose, multi-stage builds | Reproducible local & production execution |
| Production Hosting | Render.com ([`render.yaml`](render.yaml) Blueprints) | 3 distinct zero-cost web services (Web, API, Monitoring) |
| IaC | Terraform (DigitalOcean AMD GPU droplet & firewall) | Reproducible cloud GPU provisioning & teardown |
| CI/CD | GitHub Actions | Linting, Pytest, Vitest, Trivy CVE scanning, Gitleaks, automated PR reviews |
| Observability | Prometheus (v2.54) + Grafana (v11.1) | Real-time p95 latency, scan volume, and red-flag distribution dashboards |
| Security | Trivy container scan, Gitleaks, non-root Docker users | DevSecOps compliance |

## 4. Extraction contract (LLM must return strict JSON)
```json
{
  "product_name": "string|null",
  "serving_size_g": "number|null",
  "per_100g": {
    "energy_kcal": null, "protein_g": null, "carbohydrate_g": null,
    "total_sugar_g": null, "added_sugar_g": null,
    "total_fat_g": null, "saturated_fat_g": null, "trans_fat_g": null,
    "sodium_mg": null, "fibre_g": null
  },
  "ingredients": ["..."],
  "sugar_sources": ["sugar", "invert syrup", "maltodextrin", "..."],
  "fat_sources": ["palm oil", "hydrogenated vegetable fat", "..."],
  "allergens_declared": [],
  "fssai_license_present": true,
  "veg_nonveg_mark": "green|brown|none",
  "claims": ["no added sugar", "high protein"],
  "expiry_or_best_before_present": true,
  "confidence": 0.0,
  "unreadable_fields": []
}
```
Rules:
1. **The model must output `null` for anything not visible — never guess.** Missing fields trigger regulatory red flags.
2. **Non-Food Image Rejection**: If an image is not a food label (e.g., human hand, face, room, clothing), the model sets `product_name: null`, `per_100g: null`, `confidence: 0.0`, and adds `"not_a_food_label"` to `unreadable_fields`.

## 5. Red-flag rules (config/rules.yaml — FSSAI Labelling Regulations)
- **Non-food photo detected** (`not_a_food_label`) → Penalty 100, Score 0, Grade RED ("🚨 No Food Label Detected")
- **Nutrition table missing or incomplete** → HIGH (-25 pts)
- **Added sugar not declared, but total sugar is high (>10g/100g)** → MEDIUM (-15 pts)
- **Trans fat not declared, or hydrogenated fat in ingredients** → HIGH (-25 pts)
- **Sodium missing** → MEDIUM (-15 pts)
- **Hidden sugar aliases in ingredients** (maltodextrin, dextrose, invert syrup, HFCS, etc.) → INFO (-5 pts/alias)
- **Sugar listed among first 3 ingredients** → HIGH (-20 pts)
- **Claim contradicts table** ("no added sugar" but sugar aliases present) → HIGH (-25 pts)
- **No FSSAI license number / veg mark / allergen statement** → MEDIUM (-10 to -15 pts)
- **Per-serving numbers shown but per-100 g missing** → LOW (-10 pts)
- **Health Score (0–100) + Traffic-Light Grade**: Computed from base 100, minus rule penalties, plus nutrient adjustments (fibre & protein bonus, sugar/sat-fat/trans-fat/sodium deductions).

Always show: *"Informational only, not medical advice."*

## 6. API Endpoints
- `POST /api/analyze` — Multipart image upload → structured extraction, red flags, and 100-point score
- `POST /api/score` — Recalculate score and red flags for user-edited nutrient values
- `GET  /api/scans/{id}` — Retrieve stored scan results by scan ID
- `GET  /api/barcode/{barcode}` — Scan or lookup product by barcode via Open Food Facts India & local fallback
- `GET  /api/barcode/presets` — Instant 1-click test barcodes for Indian FMCG products (Maggi, Good Day, Parle-G, Amul, Lay's, Real Juice)
- `GET  /health` & `GET /api/health` — Service health and provider readiness probe
- `GET  /metrics` — Prometheus metrics (request counts, latency histograms, scans processed, red flags triggered)
- Limits: max 8 MB, JPEG/PNG/WEBP only, EXIF stripped, sanitized downscaling.

## 7. Repo layout
```
AI_assisted_devOps/
├─ ARCHITECTURE.md             # System architecture & contract specification
├─ README.md                   # Comprehensive showcase & quickstart documentation
├─ docker-compose.yml          # Local multi-container stack (web, api, prometheus, grafana)
├─ docker-compose.gpu.yml      # vLLM service for AMD ROCm GPU droplet
├─ render.yaml                 # 1-Click Render.com Blueprint (web, api, monitoring)
├─ .env.example                # Documented environment variable template
├─ apps/
│  ├─ web/                     # React 18 + Vite frontend
│  │  ├─ src/ (components, context/LanguageContext.jsx, services/api.js)
│  │  ├─ docker-entrypoint.sh  # Dynamic runtime /env-config.js generation
│  │  ├─ nginx.conf.template   # Production reverse proxy template
│  │  └─ Dockerfile
│  └─ api/                     # FastAPI backend
│     ├─ app/ (main.py, extractor/, rules/, models/, providers/, barcode/)
│     ├─ config/rules.yaml     # Auditable FSSAI regulatory rules
│     ├─ tests/ (golden-label JSON fixtures, 33 unit tests)
│     └─ Dockerfile
├─ infra/
│  ├─ terraform/               # AMD GPU droplet & firewall IaC
│  ├─ vllm/                    # ROCm vLLM run script
│  ├─ monitoring/              # Combined Prometheus + Grafana Docker container
│  │  ├─ Dockerfile            # Unified production observability container
│  │  ├─ start-monitoring.sh   # Process manager for Prometheus & Grafana
│  │  ├─ prometheus/           # Scraping configs
│  │  └─ grafana/              # Dashboards & datasource provisioning
│  └─ hosting/                 # Cloudflare Tunnel & Fly.io manifests
├─ .github/workflows/
│  ├─ ci.yml                   # Lint, test, build, Trivy CVE scan, Gitleaks
│  ├─ cd.yml                   # Container build & deployment automation
│  ├─ ai-review.yml            # Automated AI PR reviewer
│  └─ gpu-cost-guard.yml       # Scheduled zombie GPU terminator
├─ scripts/
│  ├─ run_eval.py              # Golden samples evaluation harness (22/22 tests)
│  ├─ benchmark_llm.py         # Multi-target latency & throughput benchmark engine
│  ├─ teardown_gpu.sh          # Manual GPU destruction script
│  ├─ ai_pr_reviewer.py        # PR review engine
│  └─ ai_failure_explainer.py  # CI failure diagnostic engine
└─ docs/
   ├─ architecture.svg         # Visual system architecture diagram
   ├─ benchmark_report.md      # AMD MI300X vs Gemini 1.5 Flash benchmarks
   ├─ blog_post.md             # Technical engineering write-up
   ├─ cost_report.md           # Zero-dollar sustainability report
   └─ demo_walkthrough.md      # Recruiter demonstration guide
```

## 8. AI-assisted DevOps showcase (what recruiters should see)
1. **Antigravity commit trail** – Phased conventional commits (`feat(api)`, `feat(web)`, `feat(infra)`).
2. **AI PR reviewer** – GitHub Action sends git diffs to the LLM and posts automated code reviews.
3. **AI failure explainer** – On CI failure, action diagnoses root causes and comments fixes directly to GitHub Step Summaries.
4. **GPU cost guard** – Scheduled workflow and script destroy idle GPU droplets to safeguard credits.
5. **Eval harness** – 22 ground-truth Indian food label fixtures; CI measures extraction accuracy.
6. **Benchmark page** – Empirical latency/throughput comparison: AMD MI300X (480ms) vs Gemini 1.5 Flash (920ms).

## 9. Phases & Completion Status
| Phase | Deliverable | Status |
|---|---|:---:|
| 1 | Repo scaffold, FastAPI `/health`, `mock` provider, rules engine + unit tests | ✅ **100% Complete** |
| 2 | Frontend with camera upload, shows red flags/score; docker-compose runs everything locally | ✅ **100% Complete** |
| 3 | Gemini provider (free) → real extraction; golden-sample eval harness (22 fixtures) | ✅ **100% Complete** |
| 4 | GitHub Actions CI (test, build, Trivy, gitleaks) | ✅ **100% Complete** |
| 5 | Terraform + vLLM on AMD GPU droplet; `LLM_PROVIDER=vllm`; benchmark; **destroy the GPU** | ✅ **100% Complete** (Cost Guard Verified) |
| 6 | Deploy free hosting + domain; Prometheus/Grafana; AI PR reviewer + failure explainer | ✅ **100% Complete & Live on Render** |
| 7 | README, architecture diagram, demo video, blog post, portfolio polish | ✅ **100% Complete** |

## 10. Live Deployments & Hosting
- **Frontend Web Service**: [https://labellens-web.onrender.com](https://labellens-web.onrender.com)
- **Backend API Service**: [https://labellens-api-ktax.onrender.com](https://labellens-api-ktax.onrender.com) (Interactive Docs: [`/docs`](https://labellens-api-ktax.onrender.com/docs))
- **Prometheus & Grafana Dashboard**: [https://labellens-monitoring.onrender.com](https://labellens-monitoring.onrender.com) *(Anonymous viewer access enabled)*
- **Cost**: **$0.00 / month** (Runs entirely on Render Free Tier + Google Gemini API Free Tier).

## 11. Credit plan & Cost Guard
- Phases 1–4 ran on local workstation ($0.00).
- GPU droplet used strictly for Phase 5 benchmarking and destroyed immediately afterward.
- Automated cost guard workflow ([`.github/workflows/gpu-cost-guard.yml`](.github/workflows/gpu-cost-guard.yml)) enforces teardown of rogue GPU instances every 6 hours.
- Production operates 24/7 on free tier with `LLM_PROVIDER=gemini`.

## 12. Implemented Capabilities
- **Non-Food Image Guard**: Rejects human body photos (hands, faces) or room photos with `🚨 No Food Label Detected` and zero score.
- **Interactive Nutrition Editor**: Allows users to review and manually amend OCR extraction values with live score recalculation (`POST /api/score`).
- **Barcode Scanner Integration**: Supports instant scanning via Open Food Facts India API and offline FMCG fallback dataset (`/api/barcode/{barcode}`, `/api/barcode/presets`).
- **Trilingual UI Localization**: Instant switching between English, Hindi (हिंदी), and Marathi (मराठी) with persistent browser storage.
- **Side-by-Side Product Comparison**: Head-to-head snack comparisons with nutritional delta bars and automated FSSAI winner calculation.
- **Unified Cloud Observability**: Single-container deployment of Prometheus and Grafana for resource-constrained free cloud tiers.
