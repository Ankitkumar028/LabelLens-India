from contextlib import asynccontextmanager
from datetime import datetime, timezone
import time
from typing import Optional
import uuid

from fastapi import FastAPI, File, Form, Header, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from app.auth import (
    AuthService,
    RegisterRequest,
    LoginRequest,
    UserOut,
    AuthResponse,
    SaveByokRequest,
    TestProviderRequest,
)
from app.barcode.service import BarcodeService, OFFLINE_INDIAN_BARCODES
from app.config import settings
from app.extractor.service import LabelAnalysisService, SCAN_STORE
from app.models.analysis import AnalysisResult
from app.models.extraction import LabelExtraction
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

auth_service = AuthService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize rules engine, provider, and auth service
    rules_path = settings.resolve_rules_path()
    app.state.rules_engine = RulesEngine(rules_path)
    app.state.provider = get_llm_provider(settings.llm_provider)
    app.state.service = LabelAnalysisService(app.state.provider, app.state.rules_engine)
    app.state.barcode_service = BarcodeService()
    app.state.auth_service = auth_service
    yield


app = FastAPI(
    title="LabelLens India API",
    version="1.0.0",
    description="FSSAI-aware packaged-food label nutrition breakdown, red-flag detection, and BYOK AI intelligence.",
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
@app.get("/api/health", tags=["System"])
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


# ---------------------------------------------------------------------------
# Authentication Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/auth/register", response_model=AuthResponse, tags=["Authentication"])
async def register(req: RegisterRequest):
    """Register a new user account with secure PBKDF2-HMAC-SHA256 password hashing."""
    user, token = auth_service.register(req.username, req.email, req.password)
    return AuthResponse(user=user, token=token)


@app.post("/api/auth/login", response_model=AuthResponse, tags=["Authentication"])
async def login(req: LoginRequest):
    """Authenticate existing user credentials and return an active session token."""
    user, token = auth_service.login(req.username_or_email, req.password)
    return AuthResponse(user=user, token=token)


@app.get("/api/auth/me", response_model=UserOut, tags=["Authentication"])
async def get_me(authorization: Optional[str] = Header(None)):
    """Retrieve current authenticated user profile and saved BYOK settings."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    user = auth_service.get_user_by_token(authorization)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid.")
    return user


@app.post("/api/auth/save-keys", tags=["Authentication"])
async def save_byok_keys(req: SaveByokRequest, authorization: Optional[str] = Header(None)):
    """Persist user's personal BYOK API key preferences to their secure user profile."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    user = auth_service.get_user_by_token(authorization)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid.")
    auth_service.save_byok(user.id, req.model_dump())
    return {"status": "saved", "message": "BYOK preferences successfully saved to profile."}


@app.post("/api/auth/logout", tags=["Authentication"])
async def logout(authorization: Optional[str] = Header(None)):
    """Invalidate active session token."""
    if authorization:
        auth_service.logout(authorization)
    return {"status": "logged_out"}


# ---------------------------------------------------------------------------
# AI Provider Test Endpoint (BYOK Verification)
# ---------------------------------------------------------------------------

@app.post("/api/provider/test", tags=["AI Provider"])
async def test_provider_connection(req: TestProviderRequest):
    """Verify and test user-provided BYOK credentials with live low-latency ping."""
    start_time = time.perf_counter()
    try:
        provider = get_llm_provider(
            provider_name=req.provider,
            api_key=req.api_key,
            model_name=req.model,
            api_base=req.base_url,
        )
        health_info = await provider.health_check()
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 1)
        return {
            "status": "connected",
            "provider": provider.name,
            "latency_ms": latency_ms,
            "details": health_info,
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 1)
        return {
            "status": "error",
            "provider": req.provider,
            "latency_ms": latency_ms,
            "error": str(e),
        }


# ---------------------------------------------------------------------------
# Food Label Analysis Endpoint (Supports BYOK & Server Default)
# ---------------------------------------------------------------------------

@app.post("/api/analyze", response_model=AnalysisResult, tags=["Analysis"])
async def analyze_label(
    request: Request,
    file: UploadFile = File(..., description="Food label packaging image (JPEG, PNG, WEBP)"),
    preset: Optional[str] = Form(None, description="Mock preset key if using mock provider"),
    provider: Optional[str] = Form(None, description="BYOK provider override: gemini | openai | vllm | mock"),
    api_key: Optional[str] = Form(None, description="BYOK user API key"),
    model: Optional[str] = Form(None, description="BYOK model name override"),
    base_url: Optional[str] = Form(None, description="BYOK custom endpoint URL"),
):
    """Analyze a food label image using user-supplied BYOK credentials or server default."""
    if not hasattr(app.state, "service"):
        # Fallback initialization for direct test invocations
        rules_path = settings.resolve_rules_path()
        rules_engine = RulesEngine(rules_path)
        default_provider = get_llm_provider(settings.llm_provider)
        app.state.rules_engine = rules_engine
        app.state.service = LabelAnalysisService(default_provider, rules_engine)

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # Resolve BYOK credentials from either Form data or HTTP Headers
    target_provider = provider or request.headers.get("X-LLM-Provider")
    target_api_key = api_key or request.headers.get("X-LLM-API-Key")
    target_model = model or request.headers.get("X-LLM-Model")
    target_base_url = base_url or request.headers.get("X-LLM-Base-Url")

    active_service = app.state.service
    active_provider_name = settings.llm_provider

    if target_provider or target_api_key:
        # Dynamically instantiate custom BYOK provider
        try:
            custom_provider = get_llm_provider(
                provider_name=target_provider or settings.llm_provider,
                api_key=target_api_key,
                model_name=target_model,
                api_base=target_base_url,
            )
            active_service = LabelAnalysisService(custom_provider, app.state.rules_engine)
            active_provider_name = custom_provider.name
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid BYOK configuration: {str(e)}",
            )

    try:
        result = await active_service.analyze_image(
            image_bytes=image_bytes,
            content_type=file.content_type,
            preset=preset,
        )

        # Track metrics
        SCANS_PROCESSED.labels(
            provider=active_provider_name,
            grade=result.score.grade,
        ).inc()

        for rf in result.red_flags:
            RED_FLAGS_TRIGGERED.labels(rule_id=rf.id, severity=rf.severity).inc()

        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{type(e).__name__}: {str(e)}",
        )


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


@app.post("/api/score", response_model=AnalysisResult, tags=["Analysis"])
async def score_label(extraction: LabelExtraction):
    """Recalculate score, FSSAI compliance, and WHO impact for edited or corrected label values."""
    if not hasattr(app.state, "rules_engine"):
        rules_path = settings.resolve_rules_path()
        app.state.rules_engine = RulesEngine(rules_path)

    eval_res = app.state.rules_engine.evaluate(extraction)
    scan_id = str(uuid.uuid4())
    result = AnalysisResult(
        scan_id=scan_id,
        product_name=extraction.product_name,
        score=eval_res.score,
        red_flags=eval_res.red_flags,
        compliance=eval_res.compliance,
        who_impact=eval_res.who_impact,
        confidence_report=eval_res.confidence_report,
        extraction=extraction,
        disclaimer=app.state.rules_engine.disclaimer,
        processing_time_ms=1.0,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    SCAN_STORE[scan_id] = result
    return result


@app.get("/api/barcode/presets", tags=["Barcode"])
async def get_barcode_presets():
    """Return available FMCG barcodes for quick 1-click scanning and testing."""
    return [
        {"barcode": code, "product_name": data["product_name"]}
        for code, data in OFFLINE_INDIAN_BARCODES.items()
    ]


@app.get("/api/barcode/{barcode}", response_model=AnalysisResult, tags=["Barcode"])
async def lookup_barcode(barcode: str):
    """Scan or lookup product by EAN/UPC barcode via Open Food Facts India."""
    if not hasattr(app.state, "barcode_service"):
        app.state.barcode_service = BarcodeService()
    if not hasattr(app.state, "rules_engine"):
        rules_path = settings.resolve_rules_path()
        app.state.rules_engine = RulesEngine(rules_path)

    extraction = await app.state.barcode_service.lookup(barcode)
    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Barcode '{barcode}' not found in Open Food Facts India database.",
        )

    eval_res = app.state.rules_engine.evaluate(extraction)
    scan_id = str(uuid.uuid4())
    result = AnalysisResult(
        scan_id=scan_id,
        product_name=extraction.product_name,
        score=eval_res.score,
        red_flags=eval_res.red_flags,
        compliance=eval_res.compliance,
        who_impact=eval_res.who_impact,
        confidence_report=eval_res.confidence_report,
        extraction=extraction,
        disclaimer=app.state.rules_engine.disclaimer,
        processing_time_ms=15.0,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    SCAN_STORE[scan_id] = result
    return result
