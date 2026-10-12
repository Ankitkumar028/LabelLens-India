"""Extraction and analysis pipeline service."""

from datetime import datetime, timezone
import io
import time
from typing import Dict, Optional, Tuple
import uuid

from PIL import Image
from fastapi import HTTPException, UploadFile, status

from app.config import settings
from app.models.analysis import AnalysisResult
from app.models.extraction import LabelExtraction
from app.providers.base import LLMProvider
from app.rules.engine import RulesEngine

# Simple scan store for GET /api/scans/{id}
SCAN_STORE: Dict[str, AnalysisResult] = {}


class LabelAnalysisService:
    """Coordinates image validation, AI extraction, and rules engine scoring."""

    def __init__(self, provider: LLMProvider, rules_engine: RulesEngine):
        self.provider = provider
        self.rules_engine = rules_engine

    def validate_and_process_image(self, image_bytes: bytes, content_type: Optional[str]) -> Tuple[bytes, str]:
        """Validate format, strip EXIF metadata, resize if oversized, and return cleaned bytes."""
        # 1. Size check
        max_bytes = settings.max_image_size_mb * 1024 * 1024
        if len(image_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image exceeds maximum allowed size of {settings.max_image_size_mb} MB.",
            )

        # 2. Check format using Pillow
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img_format = (img.format or "").upper()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file or unsupported image data.",
            )

        allowed_formats = {"JPEG", "JPG", "PNG", "WEBP"}
        if img_format not in allowed_formats:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported image format: {img_format}. Allowed formats: JPEG, PNG, WEBP.",
            )

        # 3. Strip EXIF by re-saving pixel data without metadata
        # Also downscale if dimension exceeds 2048px to save bandwidth & token memory
        max_dimension = 2048
        if img.width > max_dimension or img.height > max_dimension:
            img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

        # Re-encode to clean bytes
        output_buffer = io.BytesIO()
        out_format = "PNG" if img_format == "PNG" else "JPEG"
        if out_format == "JPEG" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(output_buffer, format=out_format, quality=90)
        cleaned_bytes = output_buffer.getvalue()
        mime_type = "image/png" if out_format == "PNG" else "image/jpeg"

        return cleaned_bytes, mime_type

    async def analyze_image(
        self,
        image_bytes: bytes,
        content_type: Optional[str] = None,
        preset: Optional[str] = None,
    ) -> AnalysisResult:
        """Run complete extraction and rules engine analysis."""
        start_time = time.perf_counter()

        cleaned_bytes, mime_type = self.validate_and_process_image(image_bytes, content_type)

        # AI extraction
        if preset:
            from app.providers.mock import MockLLMProvider
            mock = MockLLMProvider()
            extraction = mock.presets.get(preset, mock.presets[mock.default_preset])
        else:
            extraction = await self.provider.extract(cleaned_bytes, mime_type)

        # Rules engine evaluation
        red_flags, score_details = self.rules_engine.evaluate(extraction)

        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        scan_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        result = AnalysisResult(
            scan_id=scan_id,
            product_name=extraction.product_name,
            score=score_details,
            red_flags=red_flags,
            extraction=extraction,
            disclaimer=self.rules_engine.disclaimer,
            processing_time_ms=duration_ms,
            created_at=created_at,
        )

        # Persist in scan store
        SCAN_STORE[scan_id] = result
        return result

    def get_scan(self, scan_id: str) -> Optional[AnalysisResult]:
        """Retrieve previously processed scan by ID."""
        return SCAN_STORE.get(scan_id)
