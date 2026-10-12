"""Barcode lookup service integrating Open Food Facts India with offline FMCG dataset fallback."""

from typing import Any, Dict, List, Optional
import httpx

from app.models.extraction import LabelExtraction, Per100gNutrients


# Built-in offline ground-truth database of popular Indian FMCG packaged goods
# Enables instant, deterministic testing and offline reliability
OFFLINE_INDIAN_BARCODES: Dict[str, Dict[str, Any]] = {
    "8901030383709": {
        "product_name": "Maggi 2-Minute Masala Instant Noodles",
        "serving_size_g": 70.0,
        "per_100g": {
            "energy_kcal": 427.0,
            "protein_g": 8.0,
            "carbohydrate_g": 63.5,
            "total_sugar_g": 2.2,
            "added_sugar_g": 1.2,
            "total_fat_g": 15.7,
            "saturated_fat_g": 6.8,
            "trans_fat_g": 0.12,
            "sodium_mg": 1230.0,
            "fibre_g": 3.6,
        },
        "ingredients": [
            "Wheat flour (Maida)",
            "Palm oil",
            "Salt",
            "Wheat gluten",
            "Mineral (Calcium carbonate)",
            "Thickeners (508, 412)",
            "Acidity regulators (501(i), 500(i))",
            "Hydrolysed groundnut protein",
            "Mixed spices",
            "Dehydrated onion",
            "Sugar",
            "Toasted onion flakes",
            "Flavour enhancer (635)",
        ],
        "sugar_sources": ["Sugar"],
        "fat_sources": ["Palm oil"],
        "allergens_declared": ["Wheat", "Groundnut"],
        "fssai_license_present": True,
        "veg_nonveg_mark": "green",
        "claims": ["Iron & Vitamin A Fortified"],
        "expiry_or_best_before_present": True,
        "confidence": 0.98,
        "unreadable_fields": [],
    },
    "8901063012829": {
        "product_name": "Britannia Good Day Cashew Cookies",
        "serving_size_g": 30.0,
        "per_100g": {
            "energy_kcal": 501.0,
            "protein_g": 7.0,
            "carbohydrate_g": 67.0,
            "total_sugar_g": 23.5,
            "added_sugar_g": 22.0,
            "total_fat_g": 23.0,
            "saturated_fat_g": 10.5,
            "trans_fat_g": 0.0,
            "sodium_mg": 280.0,
            "fibre_g": 1.5,
        },
        "ingredients": [
            "Refined wheat flour (Maida)",
            "Sugar",
            "Refined palm oil",
            "Cashew bits (4.5%)",
            "Invert sugar syrup",
            "Butter (1.2%)",
            "Milk solids",
            "Raising agents (503(ii), 500(ii))",
            "Iodised salt",
            "Emulsifiers (322, 471)",
            "Artificial flavouring substances (Butter, Cashew)",
        ],
        "sugar_sources": ["Sugar", "Invert sugar syrup"],
        "fat_sources": ["Refined palm oil", "Butter"],
        "allergens_declared": ["Wheat", "Milk", "Nuts (Cashew)", "Soy"],
        "fssai_license_present": True,
        "veg_nonveg_mark": "green",
        "claims": ["With Rich Cashews"],
        "expiry_or_best_before_present": True,
        "confidence": 0.99,
        "unreadable_fields": [],
    },
    "8901725181222": {
        "product_name": "Parle-G Original Gluco Biscuits",
        "serving_size_g": 25.0,
        "per_100g": {
            "energy_kcal": 454.0,
            "protein_g": 6.5,
            "carbohydrate_g": 78.2,
            "total_sugar_g": 26.3,
            "added_sugar_g": 25.0,
            "total_fat_g": 12.5,
            "saturated_fat_g": 6.0,
            "trans_fat_g": 0.0,
            "sodium_mg": 310.0,
            "fibre_g": 1.2,
        },
        "ingredients": [
            "Refined wheat flour",
            "Sugar",
            "Refined palm oil",
            "Invert sugar syrup",
            "Raising agents (503(ii), 500(ii))",
            "Milk solids",
            "Iodised salt",
            "Emulsifier (322)",
            "Flavour (Vanilla)",
            "Dough conditioner (223)",
        ],
        "sugar_sources": ["Sugar", "Invert sugar syrup"],
        "fat_sources": ["Refined palm oil"],
        "allergens_declared": ["Wheat", "Milk", "Soy", "Sulphite"],
        "fssai_license_present": True,
        "veg_nonveg_mark": "green",
        "claims": ["G for Genius", "Energy Booster"],
        "expiry_or_best_before_present": True,
        "confidence": 0.99,
        "unreadable_fields": [],
    },
    "8901262010025": {
        "product_name": "Amul Pasteurized Butter",
        "serving_size_g": 10.0,
        "per_100g": {
            "energy_kcal": 722.0,
            "protein_g": 0.6,
            "carbohydrate_g": 0.0,
            "total_sugar_g": 0.0,
            "added_sugar_g": 0.0,
            "total_fat_g": 80.0,
            "saturated_fat_g": 51.0,
            "trans_fat_g": 3.0,
            "sodium_mg": 830.0,
            "fibre_g": 0.0,
        },
        "ingredients": [
            "Butter (Milk fat 80%)",
            "Common salt",
            "Permitted natural color (Annatto)",
        ],
        "sugar_sources": [],
        "fat_sources": ["Milk fat / Butter"],
        "allergens_declared": ["Milk"],
        "fssai_license_present": True,
        "veg_nonveg_mark": "green",
        "claims": ["Taste of India", "Pure Milk Butter"],
        "expiry_or_best_before_present": True,
        "confidence": 0.99,
        "unreadable_fields": [],
    },
    "8901499008503": {
        "product_name": "Lay's India's Magic Masala Potato Chips",
        "serving_size_g": 30.0,
        "per_100g": {
            "energy_kcal": 555.0,
            "protein_g": 6.8,
            "carbohydrate_g": 52.8,
            "total_sugar_g": 4.1,
            "added_sugar_g": 3.5,
            "total_fat_g": 35.2,
            "saturated_fat_g": 15.0,
            "trans_fat_g": 0.1,
            "sodium_mg": 920.0,
            "fibre_g": 3.8,
        },
        "ingredients": [
            "Potato",
            "Edible vegetable oil (Palmolein)",
            "Seasoning (Spices and condiments, Onion powder, Chilli powder, Dry mango powder, Coriander powder)",
            "Sugar",
            "Iodised salt",
            "Flavour (Natural and nature identical substances)",
            "Acidity regulator (330)",
        ],
        "sugar_sources": ["Sugar"],
        "fat_sources": ["Edible vegetable oil (Palmolein)"],
        "allergens_declared": [],
        "fssai_license_present": True,
        "veg_nonveg_mark": "green",
        "claims": ["Made with Best Quality Potatoes"],
        "expiry_or_best_before_present": True,
        "confidence": 0.97,
        "unreadable_fields": [],
    },
    "8901725132514": {
        "product_name": "Real Fruit Power Mixed Fruit Juice",
        "serving_size_g": 200.0,
        "per_100g": {
            "energy_kcal": 56.0,
            "protein_g": 0.4,
            "carbohydrate_g": 13.6,
            "total_sugar_g": 13.0,
            "added_sugar_g": 9.5,
            "total_fat_g": 0.0,
            "saturated_fat_g": 0.0,
            "trans_fat_g": 0.0,
            "sodium_mg": 18.0,
            "fibre_g": 0.0,
        },
        "ingredients": [
            "Water",
            "Mixed fruit juice concentrate (Apple, Orange, Guava, Banana, Mango, Peach, Apricot)",
            "Sugar",
            "Liquid glucose",
            "Acidity regulator (330)",
            "Antioxidant (300)",
        ],
        "sugar_sources": ["Sugar", "Liquid glucose"],
        "fat_sources": [],
        "allergens_declared": [],
        "fssai_license_present": True,
        "veg_nonveg_mark": "green",
        "claims": ["No Added Preservatives", "Goodness of 9 Fruits"],
        "expiry_or_best_before_present": True,
        "confidence": 0.98,
        "unreadable_fields": [],
    },
}


class BarcodeService:
    """Service to query Open Food Facts API with offline fallback."""

    def __init__(self, timeout_seconds: float = 5.0):
        self.timeout_seconds = timeout_seconds
        self.base_url = "https://world.openfoodfacts.org/api/v2/product"

    async def lookup(self, barcode: str) -> Optional[LabelExtraction]:
        """Look up barcode in offline Indian database first, then query Open Food Facts API."""
        clean_code = barcode.strip().replace(" ", "").replace("-", "")

        # 1. Check offline database
        if clean_code in OFFLINE_INDIAN_BARCODES:
            data = OFFLINE_INDIAN_BARCODES[clean_code]
            return LabelExtraction.model_validate(data)

        # 2. Query Open Food Facts API
        try:
            url = f"{self.base_url}/{clean_code}.json"
            headers = {"User-Agent": "LabelLensIndia - Web/1.0 (https://github.com/Ankitkumar028/LabelLens-India)"}
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    body = res.json()
                    if body.get("status") == 1 and "product" in body:
                        return self._parse_off_product(body["product"])
        except Exception:
            pass

        return None

    def _parse_off_product(self, product: Dict[str, Any]) -> LabelExtraction:
        """Map Open Food Facts product structure to LabelExtraction schema."""
        nutriments = product.get("nutriments", {})

        def get_val(key: str) -> Optional[float]:
            val = nutriments.get(key)
            if val is not None:
                try:
                    return float(val)
                except (ValueError, TypeError):
                    return None
            return None

        # Convert sodium from grams to milligrams if needed
        sodium_g = get_val("sodium_100g")
        sodium_mg = (sodium_g * 1000.0) if sodium_g is not None else get_val("sodium_mg_100g")

        per_100g = Per100gNutrients(
            energy_kcal=get_val("energy-kcal_100g") or get_val("energy_100g"),

            protein_g=get_val("proteins_100g"),
            carbohydrate_g=get_val("carbohydrates_100g"),
            total_sugar_g=get_val("sugars_100g"),
            added_sugar_g=get_val("added-sugars_100g"),
            total_fat_g=get_val("fat_100g"),
            saturated_fat_g=get_val("saturated-fat_100g"),
            trans_fat_g=get_val("trans-fat_100g"),
            sodium_mg=sodium_mg,
            fibre_g=get_val("fiber_100g"),
        )

        ingredients_text = product.get("ingredients_text", "") or product.get("ingredients_text_en", "")
        raw_ingredients = [i.strip() for i in ingredients_text.split(",") if i.strip()] if ingredients_text else []

        # Detect veg status
        veg_mark = "none"
        analysis_tags = product.get("ingredients_analysis_tags", [])
        if "en:vegetarian" in analysis_tags:
            veg_mark = "green"
        elif "en:non-vegetarian" in analysis_tags:
            veg_mark = "brown"

        return LabelExtraction(
            product_name=product.get("product_name") or product.get("product_name_en") or "Packaged Food Product",
            serving_size_g=get_val("serving_quantity"),
            per_100g=per_100g,
            ingredients=raw_ingredients,
            sugar_sources=[],
            fat_sources=[],
            allergens_declared=product.get("allergens_tags", []),
            fssai_license_present=True if ("fssai" in str(product).lower()) else None,
            veg_nonveg_mark=veg_mark,
            claims=product.get("labels_tags", []),
            expiry_or_best_before_present=True,
            confidence=0.95,
            unreadable_fields=[],
        )
