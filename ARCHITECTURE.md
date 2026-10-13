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

## 13. Nutrition Intelligence Evolution (WHO & FSSAI 2020 Standards)
Derived from the LabelLens Nutrition Intelligence Standard (`docs/LabelLens_Nutrition_Intelligence_Suggestions.md`):

1. **Orthogonal Separation of Nutrition vs. Regulatory Compliance**:
   - Packaging non-compliance (e.g. missing FSSAI 14-digit licence number or vegetable green dot) does **not** lower the nutritional score (0–100) of a food item.
   - Independent FSSAI 2020 Compliance Checklist evaluated across:
     - Clause 5(4): 14-digit FSSAI License & Registration declaration.
     - Clause 5(3): Vegetarian / Non-Vegetarian symbol and color coding.
     - Clause 5(2): Mandatory Allergen declaration / statement.
     - Clause 5(8): Best Before / Expiry date and Lot/Batch identification.
2. **Exact Mathematical Integrity**:
   - All nutrient penalties (sugar, saturated fat, sodium) reconcile with complete mathematical integrity: `Final Score = Base Score (100) - Rule Penalties - Nutrient Deductions + Fibre/Protein Bonuses`.
   - Eliminates duplicate sodium deductions and prevents double-penalization.
3. **Interactive WHO Daily Intake Calculator**:
   - Dynamic portion slider (5g to 150g) computing real-time % of WHO daily thresholds:
     - **Sodium**: 2,000 mg/day max (WHO 2012 Guideline).
     - **Free/Added Sugars**: 50 g/day max (<10% energy, WHO 2015 Guideline).
     - **Saturated Fat**: 22 g/day max (<10% energy).
     - **Dietary Fibre**: 25 g/day target (WHO/FSSAI daily minimum).
4. **Extraction Provenance & Confidence Auditing**:
   - Per-nutrient OCR extraction confidence rating (`HIGH`, `MEDIUM`, `LOW`) and field audit tracking.

## 14. Multi-Provider BYOK (Bring-Your-Own-Key) AI Architecture
To protect developer API quotas from exhaustion and allow unlimited scans:

- **Supported AI Providers**:
  - **Google Gemini**: Gemini 2.5 Flash / Flash Lite (Free tier via Google AI Studio).
  - **OpenAI**: GPT-4o & GPT-4o-mini Vision via OpenAI Platform API.
  - **AMD ROCm / vLLM**: High-throughput self-hosted inference on AMD Radeon/Instinct GPUs via OpenAI-compatible endpoints (`/v1/chat/completions`).
  - **Server Demo Default**: Free fallback using hosted server credentials.
- **Dynamic Credential Injection**:
  - Frontend passes user credentials via HTTP headers (`X-LLM-Provider`, `X-LLM-API-Key`, `X-LLM-Model`, `X-LLM-Base-Url`) or multipart form fields.
  - Provider Factory dynamically instantiates stateless provider instances per request.
- **Live Connection Testing**:
  - `POST /api/provider/test` endpoint executes a real 1-token multimodal test to verify user credentials before saving.

## 15. Secured User Authentication Subsystem
- **Password Protection**:
  - Hardened with **PBKDF2-HMAC-SHA256** using 120,000 iterations and a cryptographically secure 32-byte salt.
  - Constant-time hash verification (`hmac.compare_digest`) prevents timing side-channel attacks.
- **Session & BYOK Storage**:
  - SQLite backend (`users` and `sessions` tables in `scans.db`).
  - High-entropy 32-byte hexadecimal session tokens (`secrets.token_hex(32)`) with 30-day expiration.
  - Seamless synchronization of BYOK keys between user accounts and browser `localStorage`.
- **Endpoints**:
  - `POST /api/auth/register` — Create account.
  - `POST /api/auth/login` — Authenticate and receive session token.
  - `GET /api/auth/me` — Retrieve user profile and saved AI preferences.
  - `POST /api/auth/save-keys` — Persist custom BYOK configurations.
  - `POST /api/auth/logout` — Terminate active session.

## 16. User Behavior & Marketing Intelligence Dashboard (Grafana)
Located at [`infra/monitoring/grafana/dashboards/user_behavior_marketing.json`](infra/monitoring/grafana/dashboards/user_behavior_marketing.json):

1. **Growth & Acquisition KPIs**:
   - Total Registered Users (`labellens_users_total`).
   - Active Authenticated Sessions (`labellens_active_sessions_total`).
   - User Segment Breakdown: Registered Users vs. Anonymous Guests (`labellens_scans_by_user_type_total`).
   - Cumulative Registration Events (`labellens_users_registered_total`).
2. **Marketing Funnel Milestones**:
   - Funnel Progression: Landing View → Sample Tested → Barcode Scanned → Scan Completed → User Registered → BYOK Saved (`labellens_user_actions_total`).
   - Authentication Event Velocity over time (`labellens_auth_events_total`).
3. **Consumer Product Interest & Market Affinities**:
   - Most Scanned Indian FMCG Categories (Biscuits, Cereals, Beverages, Dairy, Snacks, Sweets) (`labellens_scans_by_category_total`).
   - Audience Demographic Language Distribution (English, Hindi, Marathi) (`labellens_traffic_by_language_total`).
   - BYOK Adoption by Provider (Gemini vs. OpenAI vs. AMD ROCm GPU) (`labellens_user_byok_preferences_total`).

## 17. End-to-End Architecture Data Flow Dashboard (Grafana)
Located at [`infra/monitoring/grafana/dashboards/architecture_data_flow.json`](infra/monitoring/grafana/dashboards/architecture_data_flow.json):

Visualizes real-time data propagation through the 6 stages of the LabelLens India pipeline:
1. **Stage 1 (Client Ingress)**:
   - Ingress channels: Web PWA, Mobile Camera stream, File Drag & Drop, Barcode scanner, and 1-Click presets (`labellens_pipeline_stage_requests_total{stage="1_ingress"}`).
2. **Stage 2 (Security Gate & Auth Verification)**:
   - EXIF scrubbing, Non-food rejection gate, PBKDF2 session token validation, and BYOK header parsing (`stage="2_gateway_auth"`).
3. **Stage 3 (AI Multimodal Vision Inference)**:
   - Pluggable LLM invocation (Google Gemini 1.5 Flash vs. OpenAI GPT-4o vs. AMD ROCm vLLM).
   - Real-time p95/p99 inference latency tracking (`labellens_pipeline_stage_duration_seconds{stage="3_vision_ai"}`).
4. **Stage 4 (FSSAI 2020 Rules & WHO Nutrition Engine)**:
   - Deterministic rule deductions, mathematical reconciliation, and FSSAI 2020 regulatory checklist evaluation (`stage="4_rules_engine"`).
5. **Stage 5 (SQLite Database & Session Store Persistence)**:
   - In-memory `SCAN_STORE` and SQLite `scans.db` transactional commits (`stage="5_db_persist"`).
6. **Stage 6 (Client Delivery & UI Visualization)**:
   - Roundtrip payload dispatch, traffic-light score delivery, and end-to-end latency tracking (`labellens_pipeline_stage_duration_seconds{stage="e2e_total"}`).


