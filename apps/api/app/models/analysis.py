"""Models for rules engine evaluation, red flags, scoring, and analysis response.

Aligned with WHO Healthy Diet Guidelines and FSSAI Labelling & Display Regulations 2020.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.models.extraction import LabelExtraction


class RedFlag(BaseModel):
    """An auditable nutritional or transparency observation produced by the rules engine."""

    id: str = Field(description="Unique rule ID matching rules.yaml")
    severity: Literal["HIGH", "MEDIUM", "LOW", "INFO"] = Field(description="Severity of the flag")
    category: str = Field(description="Category (e.g. nutrition, sugar, fats, claims, transparency)")
    title: str = Field(description="Human readable title")
    description: str = Field(description="Clear, non-alarmist explanation based on WHO/FSSAI guidance")
    penalty: int = Field(default=0, description="Deduction applied to score if any")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Supporting metadata and detected terms")


class ComplianceCheck(BaseModel):
    """Individual FSSAI 2020 packaging and display requirement check."""

    id: str = Field(description="Identifier of regulatory check")
    title: str = Field(description="Name of the regulatory item")
    name: Optional[str] = Field(default=None, description="Alias for title")
    status: Literal["COMPLIANT", "NEEDS_REVIEW", "NOT_DETECTED", "EXEMPT", "FAILED"] = Field(
        description="Compliance status"
    )
    details: str = Field(description="Contextual note regarding detection in the uploaded image")
    fssai_clause: Optional[str] = Field(default=None, description="FSSAI 2020 regulation reference")
    clause: Optional[str] = Field(default=None, description="Alias for fssai_clause")

    def model_post_init(self, __context: Any) -> None:
        if self.name is None:
            self.name = self.title
        if self.clause is None:
            self.clause = self.fssai_clause


class LabelComplianceReport(BaseModel):
    """Separate FSSAI regulatory compliance audit (kept distinct from nutrition quality score)."""

    status: Literal["COMPLIANT", "PARTIALLY_DETECTED", "NEEDS_REVIEW", "NON_COMPLIANT"] = Field(
        description="Overall compliance visibility"
    )
    overall_status: Optional[str] = Field(default=None, description="Alias for status")
    summary: str = Field(description="Executive summary of label elements")
    checks: List[ComplianceCheck] = Field(default_factory=list, description="Detailed requirement checks")

    def model_post_init(self, __context: Any) -> None:
        if self.overall_status is None:
            self.overall_status = self.status


class NutrientDailyImpact(BaseModel):
    """Contribution towards WHO / FSSAI Adult Daily Maximum Reference."""

    amount_per_serving: Optional[float] = Field(default=None, description="Amount in declared serving")
    amount_per_100g: Optional[float] = Field(default=None, description="Amount per 100g")
    unit: str = Field(default="g", description="Unit of measurement (g or mg)")
    who_daily_limit: float = Field(description="WHO recommended adult daily limit")
    pct_who_limit_per_serving: Optional[float] = Field(
        default=None, description="% of WHO adult daily limit consumed in one serving"
    )
    pct_who_limit_per_100g: Optional[float] = Field(
        default=None, description="% of WHO adult daily limit per 100g"
    )
    guideline_note: str = Field(description="Contextual public health note from WHO/FSSAI")


class WhoDailyIntakeImpact(BaseModel):
    """Impact of product nutrients against WHO Adult Daily Dietary Guidelines."""

    serving_size_g: Optional[float] = Field(default=None, description="Serving size in grams")
    sodium: NutrientDailyImpact
    added_sugar: NutrientDailyImpact
    saturated_fat: NutrientDailyImpact
    trans_fat: NutrientDailyImpact
    dietary_fibre: NutrientDailyImpact


class ScanConfidenceReport(BaseModel):
    """Transparency audit on OCR extraction reliability and data provenance."""

    overall_confidence: float = Field(ge=0.0, le=1.0, description="Overall OCR/Vision confidence")
    data_quality: Literal["HIGH", "MEDIUM", "LOW", "NEEDS_CONFIRMATION"] = Field(
        description="Data quality rating"
    )
    field_statuses: Dict[str, str] = Field(
        default_factory=dict,
        description="Status per field ('DETECTED', 'NOT_DETECTED', 'NEEDS_CONFIRMATION', 'DERIVED')",
    )
    notes: List[str] = Field(default_factory=list, description="Data provenance notes")


class ScoreDetails(BaseModel):
    """Calculated nutrition score (0-100) and traffic light grade with exact mathematical reconciliation."""

    value: int = Field(ge=0, le=100, description="Overall nutrition score between 0 and 100")
    grade: Literal["GREEN", "AMBER", "RED"] = Field(description="Traffic-light grade")
    grade_description: str = Field(description="Evidence-based summary for the assigned grade")
    breakdown: Dict[str, Any] = Field(
        default_factory=dict, description="Detailed score adjustments ensuring exact sum"
    )


class AnalysisResult(BaseModel):
    """Complete intelligence output for a food label scan."""

    scan_id: str = Field(description="Unique identifier for this scan")
    product_name: Optional[str] = Field(default=None, description="Extracted product name")
    score: ScoreDetails = Field(description="Nutrition quality score and breakdown")
    red_flags: List[RedFlag] = Field(default_factory=list, description="Nutrition & transparency flags")
    compliance: Optional[LabelComplianceReport] = Field(
        default=None, description="Separate FSSAI regulatory compliance report"
    )
    who_impact: Optional[WhoDailyIntakeImpact] = Field(
        default=None, description="WHO adult daily reference percentage breakdown"
    )
    confidence_report: Optional[ScanConfidenceReport] = Field(
        default=None, description="Scan confidence and data provenance"
    )
    extraction: LabelExtraction = Field(description="Structured extraction data from label")
    disclaimer: str = Field(
        default="Informational only, not medical advice. Based on declared packaging values and WHO/FSSAI reference guidance.",
        description="Mandatory health disclaimer",
    )
    processing_time_ms: float = Field(default=0.0, description="Processing duration in milliseconds")
    created_at: str = Field(description="ISO-8601 creation timestamp")
