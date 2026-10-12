"""Models for rules engine evaluation, red flags, scoring, and analysis response."""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.models.extraction import LabelExtraction


class RedFlag(BaseModel):
    """An auditable red flag produced by the YAML-driven rules engine."""

    id: str = Field(description="Unique rule ID matching rules.yaml")
    severity: Literal["HIGH", "MEDIUM", "LOW", "INFO"] = Field(description="Severity of the flag")
    category: str = Field(description="Category (e.g. sugar, fats, transparency, regulatory, claims)")
    title: str = Field(description="Human readable title")
    description: str = Field(description="Explanation of the issue")
    penalty: int = Field(default=0, description="Score penalty deducted")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Dynamic metadata such as identified aliases")


class ScoreDetails(BaseModel):
    """Calculated health & transparency score (0-100) and traffic light grade."""

    value: int = Field(ge=0, le=100, description="Overall score between 0 and 100")
    grade: Literal["GREEN", "AMBER", "RED"] = Field(description="Traffic-light grade")
    grade_description: str = Field(description="Summary for the assigned grade")
    breakdown: Dict[str, Any] = Field(default_factory=dict, description="Detailed score adjustments")


class AnalysisResult(BaseModel):
    """Complete analysis output for a food label scan."""

    scan_id: str = Field(description="Unique identifier for this scan")
    product_name: Optional[str] = Field(default=None, description="Extracted product name")
    score: ScoreDetails = Field(description="Score and traffic-light rating")
    red_flags: List[RedFlag] = Field(default_factory=list, description="Auditable red flags detected")
    extraction: LabelExtraction = Field(description="Structured extraction data from label")
    disclaimer: str = Field(
        default="Informational only, not medical advice.",
        description="Mandatory health disclaimer",
    )
    processing_time_ms: float = Field(default=0.0, description="Processing duration in milliseconds")
    created_at: str = Field(description="ISO-8601 creation timestamp")
