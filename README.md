# LabelLens India 🔍🇮🇳

> AI-assisted DevOps showcase for packaged-food label nutrition breakdown, health scoring, and FSSAI-aware red-flag detection.

## Architecture & Workflow Overview
- **Extraction Contract**: Strict JSON output from Vision-Language Models (`Qwen2.5-VL-7B` on AMD ROCm or `Gemini 1.5 Flash` fallback). Null for missing fields—never guess.
- **Red-Flag Rules Engine**: 100% YAML-driven (`apps/api/config/rules.yaml`). Transparent, auditable, and regulatory-compliant without requiring code deployments to alter thresholds.
- **Swappable LLM Providers**: Configurable via `LLM_PROVIDER=vllm|gemini|mock`.
- **Observability**: Built-in `/health` endpoints and Prometheus metrics (`/metrics`).

## Repository Structure
```
AI_assisted_devOps/
├─ ARCHITECTURE.md             # System architecture & roadmap
├─ docker-compose.yml          # Local multi-service compose
├─ docker-compose.gpu.yml      # AMD ROCm vLLM GPU droplet compose
├─ .env.example                # Template configuration
├─ apps/
│  └─ api/                     # FastAPI backend
│     ├─ app/                  # Application code (main, extractor, rules, models, providers)
│     ├─ config/rules.yaml     # Auditable red-flag rules
│     ├─ tests/                # Unit tests & golden fixtures
│     └─ Dockerfile            # Container definition with healthcheck
```

## Quick Start (Phase 1)
```bash
# Copy environment file
cp .env.example .env

# Run with Docker
docker compose build api
docker compose up -d api

# Check health
curl http://localhost:8000/health
```
