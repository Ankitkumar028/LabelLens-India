"""LabelLens India - Core FastAPI Application."""

from contextlib import asynccontextmanager
import time
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from app.config import settings
from app.extractor.service import LabelAnalysisService
from app.models.analysis import AnalysisResult
from app.providers.factory import get_llm_provider
from app.rules.engine import RulesEngine

# Prometheus Metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)
SCANS_PROCESSED = Counter(
    "labellens_scans_total",
    "Total food labels scanned",
    ["provider", "grade"],
)
RED_FLAGS_TRIGGERED = Counter(
    "labellens_red_flags_total",
    "Total red flags triggered",
    ["rule_id", "severity"],
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize rules engine and provider
    rules_path = settings.resolve_rules_path()
    app.state.rules_engine = RulesEngine(rules_path)
    app.state.provider = get_llm_provider(settings.llm_provider)
    app.state.service = LabelAnalysisService(app.state.provider, app.state.rules_engine)
    yield


app = FastAPI(
    title="LabelLens India API",
    version="1.0.0",
    description="FSSAI-aware packaged-food label nutrition breakdown, red-flag detection and scoring.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    start = time.perf_counter()
    response = None
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception:
        status_code = 500
        raise
    finally:
        latency = time.perf_counter() - start
        path = request.url.path
        REQUEST_COUNT.labels(method=request.method, endpoint=path, status_code=status_code).inc()
        REQUEST_LATENCY.labels(method=request.method, endpoint=path).observe(latency)
    return response


@app.get("/health", tags=["System"])
async def health():
    """Health check endpoint indicating service and provider status."""
    if not hasattr(app.state, "provider"):
        try:
            rules_path = settings.resolve_rules_path()
            app.state.rules_engine = RulesEngine(rules_path)
            app.state.provider = get_llm_provider(settings.llm_provider)
            app.state.service = LabelAnalysisService(app.state.provider, app.state.rules_engine)
        except Exception:
            pass

    provider_info = {}
    if hasattr(app.state, "provider"):
        try:
            provider_info = await app.state.provider.health_check()
        except Exception as e:
            provider_info = {"status": "degraded", "error": str(e)}

    return {
        "status": "healthy",
        "service": "labellens-api",
        "version": "1.0.0",
        "environment": settings.environment,
        "llm_provider": settings.llm_provider,
        "provider_details": provider_info,
    }


@app.get("/metrics", tags=["System"])
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/api/analyze", response_model=AnalysisResult, tags=["Analysis"])
async def analyze_label(
    file: UploadFile = File(..., description="Food label packaging image (JPEG, PNG, WEBP)"),
    preset: Optional[str] = Form(None, description="Mock preset key if using mock provider"),
):
    """Analyze a food label image: extracts nutrients, evaluates YAML red flags, and calculates score."""
    if not hasattr(app.state, "service"):
        # Fallback initialization for direct test invocations
        rules_path = settings.resolve_rules_path()
        rules_engine = RulesEngine(rules_path)
        provider = get_llm_provider(settings.llm_provider)
        app.state.service = LabelAnalysisService(provider, rules_engine)

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    result = await app.state.service.analyze_image(
        image_bytes=image_bytes,
        content_type=file.content_type,
        preset=preset,
    )

    # Track metrics
    SCANS_PROCESSED.labels(
        provider=settings.llm_provider,
        grade=result.score.grade,
    ).inc()

    for rf in result.red_flags:
        RED_FLAGS_TRIGGERED.labels(rule_id=rf.id, severity=rf.severity).inc()

    return result


@app.get("/api/scans/{scan_id}", response_model=AnalysisResult, tags=["Analysis"])
async def get_scan(scan_id: str):
    """Retrieve stored scan results by scan ID."""
    if not hasattr(app.state, "service"):
        rules_path = settings.resolve_rules_path()
        rules_engine = RulesEngine(rules_path)
        provider = get_llm_provider(settings.llm_provider)
        app.state.service = LabelAnalysisService(provider, rules_engine)

    scan = app.state.service.get_scan(scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' not found.",
        )
    return scan
