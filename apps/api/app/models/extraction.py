"""Extraction contract models matching ARCHITECTURE.md Section 4."""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class Per100gNutrients(BaseModel):
    """Nutritional metrics per 100g. All fields default to None if not visible."""

    energy_kcal: Optional[float] = Field(default=None, description="Energy in kcal per 100g")
    protein_g: Optional[float] = Field(default=None, description="Protein in grams per 100g")
    carbohydrate_g: Optional[float] = Field(default=None, description="Carbohydrates in grams per 100g")
    total_sugar_g: Optional[float] = Field(default=None, description="Total sugars in grams per 100g")
    added_sugar_g: Optional[float] = Field(default=None, description="Added sugars in grams per 100g")
    total_fat_g: Optional[float] = Field(default=None, description="Total fat in grams per 100g")
    saturated_fat_g: Optional[float] = Field(default=None, description="Saturated fat in grams per 100g")
    trans_fat_g: Optional[float] = Field(default=None, description="Trans fat in grams per 100g")
    sodium_mg: Optional[float] = Field(default=None, description="Sodium in milligrams per 100g")
    fibre_g: Optional[float] = Field(default=None, description="Dietary fibre in grams per 100g")


class LabelExtraction(BaseModel):
    """Structured extraction output from LLM vision model.

    Rule: The model must output null for anything not visible — never guess.
    """

    product_name: Optional[str] = Field(default=None, description="Name or brand of the product")
    serving_size_g: Optional[float] = Field(default=None, description="Serving size in grams or ml if declared")
    per_100g: Optional[Per100gNutrients] = Field(default=None, description="Nutrients per 100g")
    ingredients: List[str] = Field(default_factory=list, description="Ordered list of declared ingredients")
    sugar_sources: List[str] = Field(default_factory=list, description="Extracted sugar and syrup sources")
    fat_sources: List[str] = Field(default_factory=list, description="Extracted fat and oil sources")
    allergens_declared: Optional[List[str]] = Field(default=None, description="Declared allergens or null if statement absent")
    fssai_license_present: Optional[bool] = Field(default=None, description="Whether 14-digit FSSAI license is visible")
    veg_nonveg_mark: Literal["green", "brown", "none"] = Field(
        default="none", description="FSSAI veg/non-veg logo mark ('green', 'brown', or 'none')"
    )
    claims: List[str] = Field(default_factory=list, description="Marketing or health claims on package")
    expiry_or_best_before_present: Optional[bool] = Field(default=None, description="Whether expiry/best before is present")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence score 0.0 - 1.0")
    unreadable_fields: List[str] = Field(default_factory=list, description="Fields obscured, blurred, or unreadable")
