# LabelLens India — Production Hosting & Custom Domain Guide

This document provides production deployment architectures for running **LabelLens India** 100% free of compute and hosting costs.

---

## 1. Hosting Architecture Comparison

| Platform | Free Tier Specifications | Stack Supported | Recommended Domain Strategy |
|---|---|---|---|
| **Render.com** (Option A) | 512 MB RAM, 0.1 CPU, auto-sleep after 15m inactivity | API + Web containers | `labellens.onrender.com` (free SSL) |
| **Oracle Cloud Always Free** (Option B) | Ampere A1 ARM64 (4 OCPUs, 24 GB RAM, 200 GB disk) | Full Docker Compose (API, Web, Prometheus, Grafana) | Cloudflare Tunnel to `labellens.in` or `is-a.dev` |
| **Cloudflare Pages + Fly.io** (Option C) | Unlimited static bandwidth + 3x 256MB VM on Fly | SPA Frontend on Pages + API on Fly.io | `labellens.pages.dev` + `api.fly.dev` |

---

## 2. Option A: Zero-Friction 1-Click Deploy via Render Blueprint

The repository contains [`render.yaml`](../../render.yaml) preconfigured for Render's Infrastructure-as-Code Blueprint.

### Steps:
1. Fork or push this repository to GitHub: [`https://github.com/Ankitkumar028/LabelLens-India`](https://github.com/Ankitkumar028/LabelLens-India).
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select repository `LabelLens-India`.
5. Render reads `render.yaml` and provisions:
   - `labellens-api` (FastAPI Docker service)
   - `labellens-web` (React/Nginx Docker service)
6. Set the `GEMINI_API_KEY` secret in the Render Dashboard under `labellens-api` → **Environment**.
7. Deploy! Both services automatically obtain HTTPS certificates at `*.onrender.com`.

---

## 3. Option B: Full Production Stack on Oracle Cloud Always Free (Recommended for Observability)

Oracle Cloud Infrastructure (OCI) provides **Always Free** Compute instances:
- 4 ARM64 Ampere cores, 24 GB RAM (or 2 x 1-core AMD micro VMs).
- 200 GB Block Storage.

### Steps:
1. Launch an Ubuntu 22.04 or 24.04 instance in OCI Always Free tier.
2. Install Docker and Docker Compose:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
   sudo usermod -aG docker $USER
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/Ankitkumar028/LabelLens-India.git
   cd LabelLens-India
   cp .env.example .env
   # Add your GEMINI_API_KEY and configure LLM_PROVIDER=gemini
   nano .env
   ```
4. Start the full production stack:
   ```bash
   docker compose up -d --build
   ```
5. Verify services:
   ```bash
   docker compose ps
   # web -> :3000, api -> :8000, prometheus -> :9090, grafana -> :3001
   ```

---

## 4. Custom Domain & HTTPS via Cloudflare Tunnel

Instead of opening router/firewall ports (80/443), connect through **Cloudflare Zero Trust Tunnel**:

1. Install `cloudflared` on the host:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```
2. Authenticate tunnel:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create labellens-production
   ```
3. Link the configuration file [`infra/hosting/cloudflare-tunnel.yml`](./cloudflare-tunnel.yml) to `/etc/cloudflared/config.yml`.
4. Route your domain:
   - Point `labellens.in` → CNAME to the tunnel target.
   - Point `api.labellens.in` → CNAME to the tunnel target.
   - Point `monitor.labellens.in` → CNAME to the tunnel target.
5. Run the tunnel service:
   ```bash
   sudo cloudflared service install
   sudo systemctl start cloudflared
   ```
6. Result: Full end-to-end TLS encryption with DDoS mitigation at $0 cost.

---

## 5. Free Domain Names
If you don't own a paid domain name:
- **`is-a.dev`**: Free subdomain for developers (e.g. `labellens.is-a.dev` via GitHub pull request to `register-ips/register`).
- **`duckdns.org`**: Free dynamic DNS (e.g. `labellens.duckdns.org`).
- **`pages.dev` / `onrender.com`**: Free subdomains provided directly by Cloudflare / Render.

---

## 6. Zero Ongoing Operating Cost Guarantee

When the temporary AMD GPU Dev Cloud credits conclude:
- `LLM_PROVIDER=gemini` is configured by default.
- Google AI Studio provides 15 Requests Per Minute (RPM) completely free with 1.5 Flash.
- Host compute runs on Oracle Always Free or Render Free tier.
- DNS and SSL run on Cloudflare Free plan.
- Total monthly bill: **$0.00**.
