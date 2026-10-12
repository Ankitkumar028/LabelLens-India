"""Mock LLM Provider for local development, CI testing, and offline demonstrations."""

from typing import Any, Dict, Optional
from app.models.extraction import LabelExtraction, Per100gNutrients
from app.providers.base import LLMProvider


class MockLLMProvider(LLMProvider):
    """Provides pre-defined realistic label extractions without calling external APIs."""

    def __init__(self, default_preset: str = "choco_crunch_biscuits"):
        self.default_preset = default_preset

    @property
    def name(self) -> str:
        return "mock"

    @property
    def presets(self) -> Dict[str, LabelExtraction]:
        return {
            "choco_crunch_biscuits": LabelExtraction(
                product_name="Choco Crunch Biscuits",
                serving_size_g=30.0,
                per_100g=Per100gNutrients(
                    energy_kcal=480.0,
                    protein_g=6.5,
                    carbohydrate_g=72.0,
                    total_sugar_g=24.5,
                    added_sugar_g=22.0,
                    total_fat_g=18.0,
                    saturated_fat_g=8.5,
                    trans_fat_g=0.1,
                    sodium_mg=380.0,
                    fibre_g=2.2,
                ),
                ingredients=[
                    "Refined Wheat Flour (Maida)",
                    "Sugar",
                    "Hydrogenated Vegetable Fat",
                    "Cocoa Solids",
                    "Invert Sugar Syrup",
                    "Maltodextrin",
                    "Raising Agents (INS 500ii)",
                    "Iodised Salt",
                ],
                sugar_sources=["Sugar", "Invert Sugar Syrup", "Maltodextrin"],
                fat_sources=["Hydrogenated Vegetable Fat"],
                allergens_declared=["Contains Wheat, Milk, and Soy"],
                fssai_license_present=True,
                veg_nonveg_mark="green",
                claims=["Rich in Fibre", "Energy Booster"],
                expiry_or_best_before_present=True,
                confidence=0.96,
                unreadable_fields=[],
            ),
            "healthy_protein_muesli": LabelExtraction(
                product_name="Organic Nut & Seed Muesli",
                serving_size_g=40.0,
                per_100g=Per100gNutrients(
                    energy_kcal=390.0,
                    protein_g=14.0,
                    carbohydrate_g=58.0,
                    total_sugar_g=4.5,
                    added_sugar_g=0.0,
                    total_fat_g=7.5,
                    saturated_fat_g=1.2,
                    trans_fat_g=0.0,
                    sodium_mg=85.0,
                    fibre_g=9.5,
                ),
                ingredients=[
                    "Rolled Oats (60%)",
                    "Almonds (10%)",
                    "Pumpkin Seeds (10%)",
                    "Chia Seeds",
                    "Wheat Flakes",
                ],
                sugar_sources=[],
                fat_sources=["Almonds", "Pumpkin Seeds"],
                allergens_declared=["Contains Nuts and Gluten"],
                fssai_license_present=True,
                veg_nonveg_mark="green",
                claims=["100% Whole Grain", "No Added Sugar", "High Protein"],
                expiry_or_best_before_present=True,
                confidence=0.98,
                unreadable_fields=[],
            ),
            "misleading_diet_drink": LabelExtraction(
                product_name="FitDiet Mixed Berry Drink",
                serving_size_g=200.0,
                per_100g=Per100gNutrients(
                    energy_kcal=62.0,
                    protein_g=0.2,
                    carbohydrate_g=15.0,
                    total_sugar_g=14.0,
                    added_sugar_g=None,  # Missing added sugar declaration despite high sugar
                    total_fat_g=0.0,
                    saturated_fat_g=0.0,
                    trans_fat_g=0.0,
                    sodium_mg=45.0,
                    fibre_g=0.0,
                ),
                ingredients=[
                    "Water",
                    "Mixed Fruit Pulp (12%)",
                    "Liquid Glucose",
                    "Invert Sugar Syrup",
                    "Acidity Regulator (INS 330)",
                ],
                sugar_sources=["Liquid Glucose", "Invert Sugar Syrup"],
                fat_sources=[],
                allergens_declared=[],
                fssai_license_present=True,
                veg_nonveg_mark="green",
                claims=["No Added Sugar", "Zero Fat", "Naturally Sweetened"],
                expiry_or_best_before_present=True,
                confidence=0.95,
                unreadable_fields=[],
            ),
            "missing_table_snack": LabelExtraction(
                product_name="Street Style Spicy Bhujia",
                serving_size_g=50.0,
                per_100g=None,  # Incomplete/missing table
                ingredients=[
                    "Gram Flour",
                    "Edible Vegetable Oil (Palmolein)",
                    "Spices & Condiments",
                    "Salt",
                ],
                sugar_sources=[],
                fat_sources=["Palmolein Oil"],
                allergens_declared=None,  # Missing allergen statement
                fssai_license_present=False,  # Missing FSSAI
                veg_nonveg_mark="none",  # Missing veg logo
                claims=["Crispy & Delicious"],
                expiry_or_best_before_present=True,
                confidence=0.72,
                unreadable_fields=["nutrition_table", "fssai_number"],
            ),
        }

    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        preset: Optional[str] = None,
    ) -> LabelExtraction:
        """Return preset or default mock label extraction."""
        key = preset or self.default_preset
        if key in self.presets:
            return self.presets[key]
        return self.presets[self.default_preset]

    async def health_check(self) -> Dict[str, Any]:
        return {
            "status": "ready",
            "provider": self.name,
            "presets_available": list(self.presets.keys()),
        }
