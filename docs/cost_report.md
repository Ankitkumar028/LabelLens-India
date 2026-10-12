# LabelLens India — Cloud Infrastructure Cost & Sustainability Report

> **Target Budget**: $0.00 Ongoing Operating Cost  
> **Status**: Achieved ($0.00/mo ongoing with zero feature degradation)

---

## 1. Cost Breakdown by Architecture Tier

| Tier | Component | Cloud Provider | Free Tier Specification | Cost / Month |
|---|---|---|---|---|
| **AI Inference (Production)** | Vision multimodal extraction | Google AI Studio | Gemini 1.5 Flash (15 RPM / 1,500 req/day free) | **$0.00** |
| **AI Inference (Benchmark)** | AMD MI300X Qwen2.5-VL | DigitalOcean GPU Droplet | AMD Dev Cloud promotional credits (auto-torn down) | **$0.00** |
| **Compute & Containers** | Docker Compose (API + Web + Prom + Grafana) | Oracle Cloud Infrastructure | Ampere A1 ARM64 (4 OCPUs, 24GB RAM, 200GB disk Always Free) | **$0.00** |
| **Alternative Web Hosting** | Container Web Services | Render.com | Free web service tier (512MB RAM, auto-sleep) | **$0.00** |
| **DNS, CDN & SSL** | Custom Domain HTTPS & Tunnel | Cloudflare | Cloudflare Zero Trust Free Plan (up to 50 users) | **$0.00** |
| **CI/CD Automation** | GitHub Actions Workflows | GitHub | 2,000 free minutes/month for public repositories | **$0.00** |
| **Container Registry** | Multi-arch OCI Image Storage | GitHub (ghcr.io) | 500 MB free package storage | **$0.00** |
| **TOTAL ONGOING COST** | | | | **$0.00 / month** |

---

## 2. GPU Developer Credits Strategy & Cost Guard

### The Challenge:
AMD MI300X GPU droplets on DigitalOcean cost approximately $2.50 to $3.50 per hour. If a developer provisions an instance for benchmarking and forgets to destroy it, a monthly bill of over $1,800 can be incurred.

### The Automated Solution:
1. **Infrastructure as Code**: The GPU instance is provisioned using Terraform ([`infra/terraform/main.tf`](../infra/terraform/main.tf)).
2. **Deterministic Teardown Script**: [`scripts/teardown_gpu.sh`](../scripts/teardown_gpu.sh) handles both `terraform destroy` and `doctl compute droplet delete` API cleanup.
3. **Automated Zombie Instance Terminator**: The scheduled GitHub Action [`.github/workflows/gpu-cost-guard.yml`](../.github/workflows/gpu-cost-guard.yml) runs every 6 hours to detect any active GPU droplets tagged `labellens` and triggers automatic destruction.

---

## 3. Post-Credits Sustainability Guarantee

Once the promotional developer credits expire:
- The backend defaults to `LLM_PROVIDER=gemini`.
- Google Gemini 1.5 Flash provides high-precision vision analysis within the free 15 RPM quota.
- For high-volume enterprise workloads, switching to dedicated self-hosted ROCm hardware requires zero code changes—only updating `LLM_PROVIDER=vllm` and `VLLM_API_BASE`.
