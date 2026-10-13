from contextlib import asynccontextmanager
from datetime import datetime, timezone
import time
from typing import Any, Dict, Optional
import uuid

from fastapi import FastAPI, File, Form, Header, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

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


# ===========================================================================
# Core System Prometheus Metrics
# ===========================================================================
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

# ===========================================================================
# User Behavior, Engagement & Marketing Analytics Metrics
# ===========================================================================
USERS_REGISTERED_COUNT = Counter(
    "labellens_users_registered_total",
    "Cumulative total user registrations",
)
USERS_TOTAL_GAUGE = Gauge(
    "labellens_users_total",
    "Current total registered users in database",
)
AUTH_EVENTS = Counter(
    "labellens_auth_events_total",
    "Authentication events by type and outcome",
    ["event", "status"],  # event: register|login|logout, status: success|failure
)
ACTIVE_SESSIONS = Gauge(
    "labellens_active_sessions_total",
    "Current active authenticated sessions in database",
)
USER_ACTIONS = Counter(
    "labellens_user_actions_total",
    "User interactions and marketing funnel milestones",
    ["action"],  # landing_view|sample_preset|barcode_lookup|image_upload|recalculate|compare_view|byok_saved
)
USER_BYOK_PREFERENCES = Counter(
    "labellens_user_byok_preferences_total",
    "User preferred BYOK provider configurations",
    ["provider"],  # gemini|openai|vllm|default
)
SCANS_BY_USER_TYPE = Counter(
    "labellens_scans_by_user_type_total",
    "Scans completed by user authentication segment",
    ["user_type"],  # registered|guest
)
SCANS_BY_CATEGORY = Counter(
    "labellens_scans_by_category_total",
    "Product category distribution from scanned food packages",
    ["category"],  # biscuits|cereals|beverages|dairy|snacks|sweets|general
)
TRAFFIC_BY_LANGUAGE = Counter(
    "labellens_traffic_by_language_total",
    "Multilingual client engagement and locale distribution",
    ["language"],  # en|hi|mr
)

# ===========================================================================
# End-to-End Architecture Data Flow Pipeline Metrics
# ===========================================================================
PIPELINE_STAGE_REQUESTS = Counter(
    "labellens_pipeline_stage_requests_total",
    "Requests entering each architectural pipeline stage",
    ["stage", "status"],  # stage: 1_ingress|2_gateway_auth|3_vision_ai|4_rules_engine|5_db_persist|6_client_delivery
)
PIPELINE_STAGE_LATENCY = Histogram(
    "labellens_pipeline_stage_duration_seconds",
    "Latency per architectural pipeline stage in seconds",
    ["stage"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)
INFERENCE_STAGE_METRICS = Counter(
    "labellens_inference_stage_total",
    "AI Vision inference invocations by provider and outcome",
    ["provider", "status"],
)

# ===========================================================================
# AI Model Performance, Latency & Extraction Quality Metrics
# ===========================================================================
MODEL_INFERENCE_LATENCY = Histogram(
    "labellens_model_inference_duration_seconds",
    "Vision model inference duration in seconds",
    ["provider", "model"],
    buckets=[0.1, 0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 12.0, 20.0, 30.0],
)
MODEL_CONFIDENCE_HISTOGRAM = Histogram(
    "labellens_model_confidence_score",
    "OCR vision extraction confidence score (0.0 to 1.0)",
    ["provider"],
    buckets=[0.1, 0.3, 0.5, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0],
)
MODEL_DATA_QUALITY = Counter(
    "labellens_model_data_quality_total",
    "Extraction data quality rating distribution",
    ["provider", "quality"],  # HIGH, MEDIUM, LOW, NEEDS_CONFIRMATION
)
NON_FOOD_REJECTIONS = Counter(
    "labellens_non_food_rejections_total",
    "Non-food images intercepted by safety guard",
    ["provider"],
)
FIELD_DETECTION_STATUS = Counter(
    "labellens_field_detection_total",
    "Field-level detection outcomes from vision OCR",
    ["field", "status"],  # field: product_name, per_100g_table, etc. status: DETECTED, NOT_DETECTED, UNREADABLE_OR_BLURRED
)
MODEL_EXECUTION_OUTCOMES = Counter(
    "labellens_model_execution_total",
    "Model inference execution outcomes",
    ["provider", "model", "outcome"],  # outcome: success, non_food_rejected, error, rate_limited
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

    # Pre-warm model performance metrics for Grafana dashboards
    for prov in ("gemini", "openai", "vllm", "mock"):
        MODEL_EXECUTION_OUTCOMES.labels(provider=prov, model="default", outcome="success")
        NON_FOOD_REJECTIONS.labels(provider=prov)
        for dq in ("HIGH", "MEDIUM", "LOW", "NEEDS_CONFIRMATION"):
            MODEL_DATA_QUALITY.labels(provider=prov, quality=dq)
    for f in ("product_name", "per_100g_table", "ingredients_list", "fssai_license", "veg_mark", "serving_size"):
        for st in ("DETECTED", "NOT_DETECTED", "UNREADABLE_OR_BLURRED"):
            FIELD_DETECTION_STATUS.labels(field=f, status=st)
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


def detect_food_category(extraction: Optional[LabelExtraction]) -> str:
    """Classify scanned food items into market categories for demographic analytics."""
    if not extraction:
        return "general"
    name = (extraction.product_name or "").lower()
    text = name + " " + " ".join([i.lower() for i in (extraction.ingredients or [])])
    if any(k in text for k in ["biscuit", "cookie", "rusk"]):
        return "biscuits"
    if any(k in text for k in ["muesli", "cereal", "oats", "grain"]):
        return "cereals"
    if any(k in text for k in ["drink", "juice", "beverage", "tea", "coffee", "cola", "soda"]):
        return "beverages"
    if any(k in text for k in ["milk", "butter", "cheese", "curd", "paneer", "dairy", "yogurt"]):
        return "dairy"
    if any(k in text for k in ["chip", "bhujia", "namkeen", "snack", "khakhra", "noodle"]):
        return "snacks"
    if any(k in text for k in ["sweet", "papdi", "ladoo", "mithai"]):
        return "sweets"
    if any(k in text for k in ["protein", "whey", "fitness", "bar"]):
        return "fitness"
    return "general"


class AnalyticsEvent(BaseModel):
    action: str = Field(description="User action or marketing milestone")
    metadata: Optional[Dict[str, Any]] = None


@app.get("/metrics", tags=["System"])
async def metrics():
    """Prometheus metrics endpoint with dynamic session & user gauge refreshes."""
    try:
        ACTIVE_SESSIONS.set(auth_service.get_active_session_count())
        USERS_TOTAL_GAUGE.set(auth_service.get_user_count())
    except Exception:
        pass
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/api/analytics/event", tags=["Marketing & Analytics"])
async def track_marketing_event(event: AnalyticsEvent):
    """Ingest client-side user behavior events, feature interactions, and marketing milestones."""
    USER_ACTIONS.labels(action=event.action).inc()
    if event.metadata:
        lang = event.metadata.get("language")
        if lang:
            TRAFFIC_BY_LANGUAGE.labels(language=lang).inc()
        prov = event.metadata.get("provider")
        if prov:
            USER_BYOK_PREFERENCES.labels(provider=prov).inc()
    return {"status": "recorded"}


# ---------------------------------------------------------------------------
# Authentication Endpoints (Instrumented with Marketing & Pipeline Metrics)
# ---------------------------------------------------------------------------

@app.post("/api/auth/register", response_model=AuthResponse, tags=["Authentication"])
async def register(req: RegisterRequest):
    """Register a new user account with secure PBKDF2-HMAC-SHA256 password hashing."""
    try:
        user, token = auth_service.register(req.username, req.email, req.password)
        AUTH_EVENTS.labels(event="register", status="success").inc()
        USERS_REGISTERED_COUNT.inc()
        USERS_TOTAL_GAUGE.set(auth_service.get_user_count())
        ACTIVE_SESSIONS.set(auth_service.get_active_session_count())
        USER_ACTIONS.labels(action="user_registered").inc()
        PIPELINE_STAGE_REQUESTS.labels(stage="5_db_persist", status="user_created").inc()
        return AuthResponse(user=user, token=token)
    except Exception as e:
        AUTH_EVENTS.labels(event="register", status="failure").inc()
        raise


@app.post("/api/auth/login", response_model=AuthResponse, tags=["Authentication"])
async def login(req: LoginRequest):
    """Authenticate existing user credentials and return an active session token."""
    identifier = req.username_or_email or req.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an email or username.",
        )
    try:
        user, token = auth_service.login(identifier, req.password)
        AUTH_EVENTS.labels(event="login", status="success").inc()
        ACTIVE_SESSIONS.set(auth_service.get_active_session_count())
        USER_ACTIONS.labels(action="user_logged_in").inc()
        PIPELINE_STAGE_REQUESTS.labels(stage="2_gateway_auth", status="session_issued").inc()
        return AuthResponse(user=user, token=token)
    except Exception as e:
        AUTH_EVENTS.labels(event="login", status="failure").inc()
        raise


@app.get("/api/auth/me", response_model=UserOut, tags=["Authentication"])
async def get_me(authorization: Optional[str] = Header(None)):
    """Retrieve current authenticated user profile and saved BYOK settings."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    user = auth_service.get_user_by_token(authorization)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid.")
    PIPELINE_STAGE_REQUESTS.labels(stage="2_gateway_auth", status="session_verified").inc()
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
    USER_BYOK_PREFERENCES.labels(provider=req.provider).inc()
    USER_ACTIONS.labels(action="byok_saved").inc()
    PIPELINE_STAGE_REQUESTS.labels(stage="5_db_persist", status="byok_saved").inc()
    return {"status": "saved", "message": "BYOK preferences successfully saved to profile."}


@app.post("/api/auth/logout", tags=["Authentication"])
async def logout(authorization: Optional[str] = Header(None)):
    """Invalidate active session token."""
    if authorization:
        auth_service.logout(authorization)
        AUTH_EVENTS.labels(event="logout", status="success").inc()
        ACTIVE_SESSIONS.set(auth_service.get_active_session_count())
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
    active_model_name = getattr(active_service.provider, "model_name", "default")

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
            active_model_name = getattr(custom_provider, "model_name", target_model or "custom")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid BYOK configuration: {str(e)}",
            )

    req_start = time.perf_counter()
    PIPELINE_STAGE_REQUESTS.labels(stage="1_ingress", status="received").inc()
    user_status = "registered" if request.headers.get("Authorization") else "guest"
    SCANS_BY_USER_TYPE.labels(user_type=user_status).inc()
    USER_ACTIONS.labels(action="scan_initiated").inc()
    PIPELINE_STAGE_REQUESTS.labels(stage="2_gateway_auth", status="verified").inc()

    try:
        inf_start = time.perf_counter()
        PIPELINE_STAGE_REQUESTS.labels(stage="3_vision_ai", status="invoked").inc()

        result = await active_service.analyze_image(
            image_bytes=image_bytes,
            content_type=file.content_type,
            preset=preset,
        )

        inf_duration = time.perf_counter() - inf_start
        PIPELINE_STAGE_LATENCY.labels(stage="3_vision_ai").observe(inf_duration)
        INFERENCE_STAGE_METRICS.labels(provider=active_provider_name, status="success").inc()

        # Model Performance & Vision Evaluation Instrumentation
        MODEL_INFERENCE_LATENCY.labels(
            provider=active_provider_name,
            model=active_model_name,
        ).observe(inf_duration)

        is_non_food = (
            "not_a_food_label" in result.extraction.unreadable_fields
            or (result.extraction.confidence == 0.0 and result.extraction.per_100g is None and not result.extraction.ingredients)
        )
        if is_non_food:
            NON_FOOD_REJECTIONS.labels(provider=active_provider_name).inc()
            MODEL_EXECUTION_OUTCOMES.labels(
                provider=active_provider_name,
                model=active_model_name,
                outcome="non_food_rejected",
            ).inc()
        else:
            MODEL_EXECUTION_OUTCOMES.labels(
                provider=active_provider_name,
                model=active_model_name,
                outcome="success",
            ).inc()

        MODEL_CONFIDENCE_HISTOGRAM.labels(provider=active_provider_name).observe(float(result.extraction.confidence))

        if result.confidence_report:
            MODEL_DATA_QUALITY.labels(
                provider=active_provider_name,
                quality=result.confidence_report.data_quality,
            ).inc()
            for field, f_status in result.confidence_report.field_statuses.items():
                FIELD_DETECTION_STATUS.labels(field=field, status=f_status).inc()

        # Stage 4: Rules Engine
        PIPELINE_STAGE_REQUESTS.labels(stage="4_rules_engine", status="evaluated").inc()

        # Stage 5: Database & Scan Store Persist
        PIPELINE_STAGE_REQUESTS.labels(stage="5_db_persist", status="persisted").inc()

        # Track metrics
        SCANS_PROCESSED.labels(
            provider=active_provider_name,
            grade=result.score.grade,
        ).inc()

        for rf in result.red_flags:
            RED_FLAGS_TRIGGERED.labels(rule_id=rf.id, severity=rf.severity).inc()

        # Classify food category for marketing intelligence
        category = detect_food_category(result.extraction)
        SCANS_BY_CATEGORY.labels(category=category).inc()

        # Stage 6: Client Delivery
        total_e2e = time.perf_counter() - req_start
        PIPELINE_STAGE_REQUESTS.labels(stage="6_client_delivery", status="delivered").inc()
        PIPELINE_STAGE_LATENCY.labels(stage="e2e_total").observe(total_e2e)

        return result
    except HTTPException:
        PIPELINE_STAGE_REQUESTS.labels(stage="3_vision_ai", status="error").inc()
        MODEL_EXECUTION_OUTCOMES.labels(
            provider=active_provider_name,
            model=active_model_name,
            outcome="error",
        ).inc()
        raise
    except Exception as e:
        PIPELINE_STAGE_REQUESTS.labels(stage="3_vision_ai", status="error").inc()
        err_outcome = "rate_limited" if "429" in str(e) or "quota" in str(e).lower() else "error"
        MODEL_EXECUTION_OUTCOMES.labels(
            provider=active_provider_name,
            model=active_model_name,
            outcome=err_outcome,
        ).inc()
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
    USER_ACTIONS.labels(action="recalculate_score").inc()
    PIPELINE_STAGE_REQUESTS.labels(stage="4_rules_engine", status="recalculated").inc()
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
        processing_time_ms=5.0,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    SCAN_STORE[scan_id] = result
    PIPELINE_STAGE_REQUESTS.labels(stage="6_client_delivery", status="delivered").inc()
    return result


@app.get("/api/barcode/presets", tags=["Barcode"])
async def get_barcode_presets():
    """Return available FMCG barcodes for quick 1-click scanning and testing."""
    USER_ACTIONS.labels(action="view_barcode_presets").inc()
    return [
        {"barcode": code, "product_name": data["product_name"]}
        for code, data in OFFLINE_INDIAN_BARCODES.items()
    ]


@app.get("/api/barcode/{barcode}", response_model=AnalysisResult, tags=["Barcode"])
async def lookup_barcode(barcode: str):
    """Scan or lookup product by EAN/UPC barcode via Open Food Facts India."""
    USER_ACTIONS.labels(action="barcode_scanned").inc()
    PIPELINE_STAGE_REQUESTS.labels(stage="1_ingress", status="barcode").inc()
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
    PIPELINE_STAGE_REQUESTS.labels(stage="4_rules_engine", status="evaluated").inc()
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
    PIPELINE_STAGE_REQUESTS.labels(stage="5_db_persist", status="persisted").inc()

    category = detect_food_category(extraction)
    SCANS_BY_CATEGORY.labels(category=category).inc()
    PIPELINE_STAGE_REQUESTS.labels(stage="6_client_delivery", status="delivered").inc()
    return result
