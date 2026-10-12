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

```
 Browser / phone (PWA, camera upload)
            │ HTTPS
            ▼
 Cloudflare (free DNS + proxy + Tunnel)
            │
            ▼
 ┌──────────────────────── Docker network ────────────────────────┐
 │  web (Next.js or React+Vite)                                    │
 │        │  POST /api/analyze (image)                             │
 │        ▼                                                        │
 │  api (FastAPI)                                                  │
 │   1. validate + resize image (Pillow)                           │
 │   2. extractor  ──► LLM provider (pluggable)                    │
 │   3. normalizer (units → per 100 g, sugar types, ingredients)   │
 │   4. rules engine (YAML) → red flags + score                    │
 │   5. save result (Postgres / SQLite) → return JSON              │
 │        │                                                        │
 │        ├──► vllm  (AMD MI300X GPU droplet, ROCm, Qwen2.5-VL)    │
 │        └──► Gemini API (free-tier fallback)                     │
 │  prometheus + grafana (metrics: latency, tokens, failures)      │
 └─────────────────────────────────────────────────────────────────┘
```

## 3. Tech stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (or Vite+React) + Tailwind, PWA | Camera capture works on mobile |
| Backend | Python FastAPI | Async, auto OpenAPI docs |
| AI extraction | Vision-language model (Qwen2.5-VL-7B-Instruct) served by **vLLM on ROCm** | Runs on AMD GPU; OpenAI-compatible API |
| AI fallback | Gemini API (free tier) | Keeps demo alive after credits end |
| Rules | YAML + Python evaluator | Auditable, editable without code changes |
| DB | Postgres (compose) / SQLite for dev | Scan history |
| Containers | Docker, docker-compose | Local simulation |
| IaC | Terraform (DigitalOcean provider – AMD Dev Cloud is DO-powered; verify it works for GPU droplets, else use the console/API) | Reproducible GPU box |
| CI/CD | GitHub Actions | Free for public repos |
| Observability | Prometheus + Grafana | DevOps credibility |
| Security | Trivy image scan, gitleaks, pre-commit, Dependabot | DevSecOps |

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
Rule: **the model must output `null` for anything not visible — never guess.** Missing = red flag.

## 5. Red-flag rules (config/rules.yaml — verify thresholds against current FSSAI regulations)
- Nutrition table missing or incomplete → HIGH
- Added sugar not declared, but total sugar is high → MEDIUM
- Trans fat not declared, or hydrogenated fat in ingredients → HIGH
- Sodium missing → MEDIUM
- Hidden sugar aliases in ingredients (maltodextrin, dextrose, invert syrup, HFCS, jaggery syrup…) → INFO + count
- Sugar listed among first 3 ingredients → HIGH
- Claim contradicts table ("no added sugar" but sugar aliases present) → HIGH (misleading claim)
- No FSSAI license number / veg mark / allergen statement → MEDIUM
- Per-serving numbers shown but per-100 g missing → LOW
- Score 0–100 plus a traffic-light grade, computed from sugar, sat fat, trans fat, sodium, fibre, and the penalty for missing data.

Always show: *"Informational only, not medical advice."*

## 6. API
- `POST /api/analyze` — multipart image → analysis JSON
- `GET  /api/scans/{id}` — stored result
- `GET  /health`, `GET /metrics`
- Limits: max 8 MB, jpeg/png/webp only, rate-limited, EXIF stripped, images deleted after N hours.

## 7. Repo layout
```
AI_assisted_devOps/
├─ ARCHITECTURE.md
├─ docker-compose.yml          # web, api, db, prometheus, grafana
├─ docker-compose.gpu.yml      # vllm service (runs on AMD droplet)
├─ .env.example
├─ apps/
│  ├─ web/                     # frontend + Dockerfile
│  └─ api/
│     ├─ app/ (main.py, extractor/, rules/, models/, providers/)
│     ├─ config/rules.yaml
│     ├─ tests/ (golden-label JSON fixtures)
│     └─ Dockerfile
├─ infra/
│  ├─ terraform/               # GPU droplet, firewall
│  ├─ vllm/                    # ROCm vLLM run script
│  └─ monitoring/              # prometheus.yml, grafana dashboards
├─ .github/workflows/
│  ├─ ci.yml                   # lint, test, build, trivy, gitleaks
│  ├─ cd.yml                   # build+push image, deploy
│  └─ ai-review.yml            # AI explains failed runs / reviews PRs
├─ scripts/ (teardown_gpu.sh, seed_samples.py)
└─ docs/ (diagrams, demo GIF, cost report)
```

## 8. AI-assisted DevOps showcase (what recruiters should see)
1. **Antigravity commit trail** – conventional commits, README section "How AI helped build this".
2. **AI PR reviewer** – GitHub Action sends the diff to Gemini/vLLM, posts review comments.
3. **AI failure explainer** – on CI failure, action sends logs to the LLM and comments the probable root cause + fix.
4. **GPU cost guard** – script that tears down the GPU droplet; a scheduled workflow warns if it is left running.
5. **Eval harness** – 20–30 labelled sample wrappers; CI measures extraction accuracy; a regression fails the build.
6. **Benchmark page** – latency/throughput of Qwen2.5-VL on AMD MI300X vs Gemini API.

## 9. Phases & Completion Status
| Phase | Deliverable | Status |
|---|---|:---:|
| 1 | Repo scaffold, FastAPI `/health`, `mock` provider, rules engine + unit tests | ✅ **100% Complete** |
| 2 | Frontend with camera upload, shows red flags/score; docker-compose runs everything locally | ✅ **100% Complete** |
| 3 | Gemini provider (free) → real extraction; golden-sample eval harness | ✅ **100% Complete** |
| 4 | GitHub Actions CI (test, build, Trivy, gitleaks) | ✅ **100% Complete** |
| 5 | Terraform + vLLM on AMD GPU droplet; `LLM_PROVIDER=vllm`; benchmark; **destroy the GPU** | ✅ **IaC & Benchmarks Complete** (Cost Guard Verified) |
| 6 | Deploy free hosting + domain; Prometheus/Grafana; AI PR reviewer + failure explainer | ✅ **Ready for 1-Click Deploy** (Fly/Render Blueprints) |
| 7 | README, architecture diagram, demo video, blog post, portfolio polish | ✅ **100% Complete** |

## 10. Free hosting & domain
- **App (no GPU):** Oracle Cloud Always Free VM (best: runs the full docker-compose), or Render/Fly.io free tiers.
- **Frontend only:** Cloudflare Pages / Vercel free.
- **Domain:** free `*.pages.dev` / `*.onrender.com`, or `you.is-a.dev`, `duckdns.org`; cheap `.in` or `.dev` if you want a real one. Cloudflare DNS + Tunnel for HTTPS.
- **After credits end:** set `LLM_PROVIDER=gemini` — the site keeps working.

## 11. Credit plan (expires Oct 24, 2026)
- Phases 1–4 on your laptop: costs nothing.
- Use the GPU droplet only for Phase 5 (a few hours): deploy via Terraform, benchmark, record screenshots/GIFs, then **destroy it**. Powered-off droplets can still bill.
- Check the current hourly GPU price in the console before creating it, and set a billing alert.
- Note: your billing page shows no saved payment method; you may need to add one to create GPU droplets. Credits are applied first.

## 12. Non-functional notes
- Show the user the extracted values and let them correct them before scoring (OCR can be wrong).
- Handle blurry images: return `unreadable_fields` + retake prompt.
- Privacy: no accounts in v1, no image retention beyond N hours.
- Implemented: Barcode lookup with Open Food Facts API & offline Indian FMCG fallback dataset (`/api/barcode/{barcode}`, `/api/barcode/presets`).
- Implemented: Multilingual UI localization supporting English, Hindi (हिंदी), and Marathi (मराठी) with persistent user preference.
- Implemented: Side-by-side Product Comparison mode with battle presets, nutritional delta metrics, and FSSAI winner calculation.
