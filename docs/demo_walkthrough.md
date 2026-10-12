# LabelLens India — Interactive Demo & Recruiter Walkthrough

Follow this step-by-step guide to test and evaluate the complete LabelLens India production stack on your local machine.

---

## 1. Quick Launch with Docker Compose

Ensure Docker Desktop is running, then run:

```bash
git clone https://github.com/Ankitkumar028/LabelLens-India.git
cd LabelLens-India

# 1. Initialize environment
cp .env.example .env

# 2. Build and start full stack (Web, API, Prometheus, Grafana)
docker compose up -d --build
```

### Active Service Endpoints:
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Docs & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)
- **Grafana Observability**: [http://localhost:3001](http://localhost:3001) *(login: `admin` / `admin`)*

---

## 2. Interactive Feature Walkthrough

### Test 1: 1-Click Golden Presets
1. Open [http://localhost:3000](http://localhost:3000).
2. Click on **Organic Nut & Seed Muesli**:
   - Notice the circular gauge turns **Green** (Score: ~84/100).
   - High protein and low added sugar are verified.
3. Click on **Choco Crunch Biscuits**:
   - The circular gauge drops to **Red** (Score: ~32/100).
   - Red Flags triggered: *"Sugar in top 3 ingredients"*, *"High Saturated Fat"*, *"Maltodextrin detected"*.
4. Click on **Misleading Zero-Sugar Diet Drink**:
   - The circular gauge turns **Red** (Score: ~28/100).
   - Flag triggered: *"Misleading sugar-free claim: Artificial sweetener (Sucralose) detected"*.

### Test 2: Live Camera & Mobile Photo Upload
1. Click **Take Photo with Camera**:
   - Uses WebRTC live stream with facing mode toggles.
   - Click **Capture Frame** to automatically crop and analyze.
2. Or drag-and-drop any packaged snack image from your desktop.

### Test 3: Nutrition Inspector (Interactive OCR Editing)
OCR can occasionally misread blurry text on wrinkled packages:
1. In the **Nutrition Table Inspector**, change `Added Sugar` from `28g` to `2g`.
2. Click **Recalculate Score**:
   - The health gauge immediately animates from Red to Green without re-running the multimodal vision model!
   - Demonstrates instant client-to-server rules engine synchronization via `POST /api/score`.

---

## 3. Observability in Action (Grafana & Prometheus)

1. Open Grafana at [http://localhost:3001](http://localhost:3001) (Credentials: `admin` / `admin`).
2. Navigate to **Dashboards** → **LabelLens India — FSSAI Observability Overview**.
3. View the live telemetry:
   - **Service Health Stat Panel**: Showing green `HEALTHY`.
   - **Total Labels Scanned**: Real-time counter.
   - **Grade Distribution Pie Chart**: Breakdown of Green vs Yellow vs Red products.
   - **Red Flags by Rule & Severity**: Bar chart showing triggered violations.
   - **API Latency Quantiles**: p50, p95, p99 request duration graphs.

---

## 4. Testing AI-Assisted DevOps CLI Tools

You can run the AI DevOps engines directly in your terminal:

### Run the AI PR Reviewer:
```bash
docker run --rm -v "${PWD}:/app" -w /app labellens-api:latest python scripts/ai_pr_reviewer.py --mock
```

### Run the AI CI Failure Explainer:
```bash
docker run --rm -v "${PWD}:/app" -w /app labellens-api:latest python scripts/ai_failure_explainer.py --mock
```

### Run the Golden Eval Regression Suite:
```bash
docker run --rm -v "${PWD}:/app" -w /app labellens-api:latest python scripts/run_eval.py
```
*(Runs 22 ground-truth Indian food label wrappers; confirms 100% extraction accuracy)*

---

## 5. Teardown
```bash
docker compose down -v
```
