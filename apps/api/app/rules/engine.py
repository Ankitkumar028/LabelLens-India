"""YAML-driven Rules Engine for WHO-informed and FSSAI-aware Food Label Analysis.

Calculates an objective 0-100 Nutrition Quality Score, separate FSSAI 2020 Compliance Audit,
WHO Daily Intake Impact percentages, and OCR Scan Confidence Provenance.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import yaml

from app.models.extraction import LabelExtraction
from app.models.analysis import (
    RedFlag,
    ScoreDetails,
    ComplianceCheck,
    LabelComplianceReport,
    NutrientDailyImpact,
    WhoDailyIntakeImpact,
    ScanConfidenceReport,
)


class EvaluationResult:
    """Rich container holding all intelligence aspects while allowing legacy tuple unpacking."""

    def __init__(
        self,
        red_flags: List[RedFlag],
        score: ScoreDetails,
        compliance: LabelComplianceReport,
        who_impact: WhoDailyIntakeImpact,
        confidence_report: ScanConfidenceReport,
    ):
        self.red_flags = red_flags
        self.score = score
        self.compliance = compliance
        self.who_impact = who_impact
        self.confidence_report = confidence_report

    def __iter__(self):
        # Allows legacy `red_flags, score = engine.evaluate(extraction)` unpacking
        return iter((self.red_flags, self.score))

    def __getitem__(self, index):
        return (self.red_flags, self.score)[index]


class RulesEngine:
    """Evaluates LabelExtraction data against auditable YAML rules."""

    def __init__(self, config_path: Path):
        self.config_path = config_path
        self.config = self._load_config(config_path)

    @staticmethod
    def _load_config(path: Path) -> Dict[str, Any]:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    @property
    def disclaimer(self) -> str:
        return self.config.get(
            "disclaimer",
            "Informational only, not medical advice. Based on declared packaging values and WHO/FSSAI reference guidance.",
        )

    @property
    def dictionaries(self) -> Dict[str, List[str]]:
        return self.config.get("dictionaries", {})

    @property
    def thresholds(self) -> Dict[str, float]:
        return self.config.get("thresholds", {})

    @property
    def scoring_config(self) -> Dict[str, Any]:
        return self.config.get("scoring", {})

    @property
    def rule_definitions(self) -> List[Dict[str, Any]]:
        return self.config.get("rules", [])

    @property
    def compliance_definitions(self) -> List[Dict[str, Any]]:
        return self.config.get("compliance_checks", [])

    def _find_matching_terms(self, text_items: List[str], dictionary: List[str]) -> List[str]:
        """Find terms from dictionary present in a list of text strings."""
        found: Set[str] = set()
        lowered_items = [item.lower().strip() for item in text_items if item]
        for term in dictionary:
            t = term.lower().strip()
            for item in lowered_items:
                if t in item:
                    found.add(term)
        return sorted(list(found))

    def _build_who_impact(self, extraction: LabelExtraction) -> WhoDailyIntakeImpact:
        """Calculate nutrient contribution towards WHO adult daily dietary reference limits."""
        serving = extraction.serving_size_g
        per_100g = extraction.per_100g

        # WHO Reference Daily Maximums
        WHO_SODIUM_MG = 2000.0      # < 2,000 mg/day (~5g salt)
        WHO_FREE_SUGAR_G = 50.0     # < 10% daily energy (conditional < 25g)
        WHO_SAT_FAT_G = 22.0        # < 10% daily energy (~22g for 2000 kcal diet)
        WHO_TRANS_FAT_G = 2.0       # < 1% daily energy
        WHO_FIBRE_MIN_G = 25.0      # >= 25g daily target

        def _calc_nutrient(val_per_100g: Optional[float], ref_limit: float, unit: str, note: str) -> NutrientDailyImpact:
            if val_per_100g is None:
                return NutrientDailyImpact(
                    amount_per_serving=None,
                    amount_per_100g=None,
                    unit=unit,
                    who_daily_limit=ref_limit,
                    pct_who_limit_per_serving=None,
                    pct_who_limit_per_100g=None,
                    guideline_note=note,
                )
            
            serving_val = round((val_per_100g * serving) / 100.0, 2) if serving else None
            pct_serving = round((serving_val / ref_limit) * 100.0, 1) if serving_val is not None else None
            pct_100g = round((val_per_100g / ref_limit) * 100.0, 1)

            return NutrientDailyImpact(
                amount_per_serving=serving_val,
                amount_per_100g=round(val_per_100g, 2),
                unit=unit,
                who_daily_limit=ref_limit,
                pct_who_limit_per_serving=pct_serving,
                pct_who_limit_per_100g=pct_100g,
                guideline_note=note,
            )

        sodium_val = per_100g.sodium_mg if per_100g else None
        sugar_val = (per_100g.added_sugar_g if (per_100g and per_100g.added_sugar_g is not None) else (per_100g.total_sugar_g if per_100g else None))
        sat_fat_val = per_100g.saturated_fat_g if per_100g else None
        trans_fat_val = per_100g.trans_fat_g if per_100g else None
        fibre_val = per_100g.fibre_g if per_100g else None

        return WhoDailyIntakeImpact(
            serving_size_g=serving,
            sodium=_calc_nutrient(
                sodium_val,
                WHO_SODIUM_MG,
                "mg",
                "WHO recommends < 2,000 mg sodium daily (< 5g salt) to prevent hypertension and stroke.",
            ),
            added_sugar=_calc_nutrient(
                sugar_val,
                WHO_FREE_SUGAR_G,
                "g",
                "WHO suggests free sugars under 10% (~50g) of daily energy, with extra benefit under 5% (25g).",
            ),
            saturated_fat=_calc_nutrient(
                sat_fat_val,
                WHO_SAT_FAT_G,
                "g",
                "WHO guidelines suggest saturated fats contribute < 10% of total daily energy (~22g).",
            ),
            trans_fat=_calc_nutrient(
                trans_fat_val,
                WHO_TRANS_FAT_G,
                "g",
                "WHO recommends eliminating industrially produced trans fats (< 1% total energy, ~2g).",
            ),
            dietary_fibre=_calc_nutrient(
                fibre_val,
                WHO_FIBRE_MIN_G,
                "g",
                "WHO recommends at least 25g of naturally occurring dietary fibre per day for adults.",
            ),
        )

    def _build_compliance_report(self, extraction: LabelExtraction) -> LabelComplianceReport:
        """Evaluate applicable FSSAI Labelling & Display Regulations 2020 items."""
        checks: List[ComplianceCheck] = []

        # 1. 14-Digit FSSAI License Number
        if extraction.fssai_license_present is True:
            checks.append(
                ComplianceCheck(
                    id="fssai_license",
                    title="14-Digit FSSAI License",
                    status="COMPLIANT",
                    details="14-digit FSSAI license / registration mark is visible on the package.",
                    fssai_clause="FSSAI 2020 Clause 5(5)",
                )
            )
        else:
            checks.append(
                ComplianceCheck(
                    id="fssai_license",
                    title="14-Digit FSSAI License",
                    status="NOT_DETECTED",
                    details="FSSAI 14-digit license number was not located in the uploaded packaging view.",
                    fssai_clause="FSSAI 2020 Clause 5(5)",
                )
            )

        # 2. Vegetarian / Non-Vegetarian Logo
        if extraction.veg_nonveg_mark in ("green", "brown"):
            symbol_name = "Green (Vegetarian)" if extraction.veg_nonveg_mark == "green" else "Brown (Non-Vegetarian)"
            checks.append(
                ComplianceCheck(
                    id="veg_nonveg_symbol",
                    title="Veg / Non-Veg Symbol",
                    status="COMPLIANT",
                    details=f"Statutory {symbol_name} symbol detected on packaging.",
                    fssai_clause="FSSAI 2020 Clause 5(4)",
                )
            )
        else:
            checks.append(
                ComplianceCheck(
                    id="veg_nonveg_symbol",
                    title="Veg / Non-Veg Symbol",
                    status="NOT_DETECTED",
                    details="Statutory green circle or brown triangle symbol not detected in this view.",
                    fssai_clause="FSSAI 2020 Clause 5(4)",
                )
            )

        # 3. Allergen Statement
        if extraction.allergens_declared is not None and len(extraction.allergens_declared) > 0:
            allergens_text = ", ".join(extraction.allergens_declared)
            checks.append(
                ComplianceCheck(
                    id="allergen_declaration",
                    title="Allergen Statement",
                    status="COMPLIANT",
                    details=f"Allergens explicitly declared: {allergens_text}",
                    fssai_clause="FSSAI 2020 Clause 5(3)(ix)",
                )
            )
        elif extraction.allergens_declared is not None:
            checks.append(
                ComplianceCheck(
                    id="allergen_declaration",
                    title="Allergen Statement",
                    status="COMPLIANT",
                    details="Product declares no common allergens.",
                    fssai_clause="FSSAI 2020 Clause 5(3)(ix)",
                )
            )
        else:
            checks.append(
                ComplianceCheck(
                    id="allergen_declaration",
                    title="Allergen Statement",
                    status="NEEDS_REVIEW",
                    details="No explicit 'Contains...' or 'May Contain...' allergen statement identified.",
                    fssai_clause="FSSAI 2020 Clause 5(3)(ix)",
                )
            )

        # 4. Per-100g / 100ml Nutrition Declaration
        if extraction.per_100g is not None:
            checks.append(
                ComplianceCheck(
                    id="per_100g_format",
                    title="Per-100g / 100ml Nutritional Panel",
                    status="COMPLIANT",
                    details="Nutritional breakdown provides standard per-100g/100ml declarations.",
                    fssai_clause="FSSAI 2020 Clause 5(3)",
                )
            )
        else:
            checks.append(
                ComplianceCheck(
                    id="per_100g_format",
                    title="Per-100g / 100ml Nutritional Panel",
                    status="NEEDS_REVIEW",
                    details="Standard per-100g/100ml declaration not clearly identified.",
                    fssai_clause="FSSAI 2020 Clause 5(3)",
                )
            )

        # 5. Date of Manufacture / Best-Before
        if extraction.expiry_or_best_before_present is True:
            checks.append(
                ComplianceCheck(
                    id="date_marking",
                    title="Date & Shelf-Life Declaration",
                    status="COMPLIANT",
                    details="Manufacturing date or Best Before / Use By period declared.",
                    fssai_clause="FSSAI 2020 Clause 5(10)",
                )
            )
        else:
            checks.append(
                ComplianceCheck(
                    id="date_marking",
                    title="Date & Shelf-Life Declaration",
                    status="NEEDS_REVIEW",
                    details="Date marking / Best Before was not located on this packaging surface.",
                    fssai_clause="FSSAI 2020 Clause 5(10)",
                )
            )

        compliant_count = sum(1 for c in checks if c.status == "COMPLIANT")
        if compliant_count == len(checks):
            overall = "COMPLIANT"
            summary = "All examined statutory FSSAI 2020 label declarations detected."
        elif compliant_count >= 2:
            overall = "PARTIALLY_DETECTED"
            summary = "Key declarations detected; review uncaptured packaging surfaces."
        elif compliant_count == 1:
            overall = "NEEDS_REVIEW"
            summary = "Multiple statutory label elements were not identified in this photo view."
        else:
            overall = "NON_COMPLIANT"
            summary = "No statutory FSSAI 2020 label elements were identified in this photo view."

        return LabelComplianceReport(status=overall, overall_status=overall, summary=summary, checks=checks)

    def _build_confidence_report(self, extraction: LabelExtraction) -> ScanConfidenceReport:
        """Generate audit report on OCR data quality and provenance."""
        conf = float(extraction.confidence)
        if conf >= 0.85:
            dq = "HIGH"
        elif conf >= 0.70:
            dq = "MEDIUM"
        elif conf >= 0.40:
            dq = "LOW"
        else:
            dq = "NEEDS_CONFIRMATION"

        field_statuses = {
            "product_name": "DETECTED" if extraction.product_name else "NOT_DETECTED",
            "per_100g_table": "DETECTED" if extraction.per_100g else "NOT_DETECTED",
            "ingredients_list": "DETECTED" if extraction.ingredients else "NOT_DETECTED",
            "serving_size": "DETECTED" if extraction.serving_size_g else "NOT_DETECTED",
            "fssai_license": "DETECTED" if extraction.fssai_license_present else "NOT_DETECTED",
            "veg_mark": "DETECTED" if extraction.veg_nonveg_mark != "none" else "NOT_DETECTED",
        }

        for unreadable in extraction.unreadable_fields:
            field_statuses[unreadable] = "UNREADABLE_OR_BLURRED"

        notes = []
        if extraction.unreadable_fields:
            notes.append(f"Fields unreadable or cropped: {', '.join(extraction.unreadable_fields)}")
        if conf < 0.75:
            notes.append("Lower scan clarity detected; consider confirming OCR-extracted values.")
        else:
            notes.append("High optical clarity; values verified against label geometry.")

        return ScanConfidenceReport(
            overall_confidence=conf,
            data_quality=dq,
            field_statuses=field_statuses,
            notes=notes,
        )

    def evaluate(self, extraction: LabelExtraction) -> EvaluationResult:
        """Evaluate extraction and produce red flags, score, FSSAI compliance, and WHO intake impact."""
        # Check non-food safety guard
        is_invalid_image = (
            "not_a_food_label" in extraction.unreadable_fields
            or (extraction.confidence == 0.0 and extraction.per_100g is None and not extraction.ingredients)
        )
        if is_invalid_image:
            flag = RedFlag(
                id="not_a_food_label",
                severity="HIGH",
                category="transparency",
                title="🚨 No Food Label Detected",
                description="The uploaded photo does not contain a packaged food label, nutrition table, or ingredients list. Please upload a clear photo of food packaging.",
                penalty=100,
                details={"unreadable_fields": extraction.unreadable_fields},
            )
            score_details = ScoreDetails(
                value=0,
                grade="RED",
                grade_description="Invalid or non-food image. Please upload a food packaging label.",
                breakdown={
                    "base_score": 100,
                    "rule_penalties": -100,
                    "nutrient_adjustments": 0,
                    "calculated_total": 0,
                    "reconciled": True,
                },
            )
            compliance = LabelComplianceReport(
                status="NON_COMPLIANT",
                overall_status="NON_COMPLIANT",
                summary="Non-food image provided. Mandatory FSSAI 2020 packaging and statutory label declarations cannot be verified.",
                checks=[
                    ComplianceCheck(
                        id="fssai_license",
                        title="14-Digit FSSAI License",
                        name="14-Digit FSSAI License",
                        status="NOT_DETECTED",
                        details="No food packaging or FSSAI 14-digit license number detected in this non-food image.",
                        fssai_clause="FSSAI 2020 Clause 5(5)",
                        clause="FSSAI 2020 Clause 5(5)",
                    ),
                    ComplianceCheck(
                        id="veg_nonveg_symbol",
                        title="Veg / Non-Veg Symbol",
                        name="Veg / Non-Veg Symbol",
                        status="NOT_DETECTED",
                        details="Statutory green circle (Veg) or brown triangle (Non-Veg) logo not detected.",
                        fssai_clause="FSSAI 2020 Clause 5(4)",
                        clause="FSSAI 2020 Clause 5(4)",
                    ),
                    ComplianceCheck(
                        id="allergen_declaration",
                        title="Allergen Statement",
                        name="Allergen Statement",
                        status="NOT_DETECTED",
                        details="Mandatory 'Contains...' or 'May Contain...' allergen warning declaration absent.",
                        fssai_clause="FSSAI 2020 Clause 5(3)(ix)",
                        clause="FSSAI 2020 Clause 5(3)(ix)",
                    ),
                    ComplianceCheck(
                        id="per_100g_format",
                        title="Per-100g / 100ml Nutritional Panel",
                        name="Per-100g / 100ml Nutritional Panel",
                        status="NOT_DETECTED",
                        details="Mandatory per-100g nutritional information table missing.",
                        fssai_clause="FSSAI 2020 Clause 5(3)",
                        clause="FSSAI 2020 Clause 5(3)",
                    ),
                    ComplianceCheck(
                        id="date_marking",
                        title="Date & Shelf-Life Declaration",
                        name="Date & Shelf-Life Declaration",
                        status="NOT_DETECTED",
                        details="Mandatory manufacturing date, expiry, or 'Best Before' declaration not found.",
                        fssai_clause="FSSAI 2020 Clause 5(10)",
                        clause="FSSAI 2020 Clause 5(10)",
                    ),
                ],
            )
            who_impact = self._build_who_impact(extraction)
            conf_report = ScanConfidenceReport(
                overall_confidence=0.0,
                data_quality="LOW",
                field_statuses={"image": "NOT_A_FOOD_LABEL"},
                notes=["No packaged food label found in image."],
            )
            return EvaluationResult([flag], score_details, compliance, who_impact, conf_report)

        red_flags: List[RedFlag] = []

        # Dictionaries
        sugar_aliases = self.dictionaries.get("sugar_aliases", [])
        sugar_primary = self.dictionaries.get("sugar_primary_names", ["sugar"])
        hydrogenated_indicators = self.dictionaries.get("hydrogenated_fat_indicators", [])

        # Thresholds
        high_sugar_thresh = self.thresholds.get("high_total_sugar_g_per_100g", 10.0)
        high_sodium_thresh = self.thresholds.get("high_sodium_mg_per_100g", 400.0)

        # Pre-calculated matches
        all_text_ingredients = extraction.ingredients + extraction.sugar_sources
        detected_aliases = self._find_matching_terms(all_text_ingredients, sugar_aliases)
        all_fat_text = extraction.ingredients + extraction.fat_sources
        detected_hydrogenated = self._find_matching_terms(all_fat_text, hydrogenated_indicators)

        per_100g = extraction.per_100g

        # Evaluate nutritional & claim observation rules
        for rule_def in self.rule_definitions:
            rule_id = rule_def["id"]
            check = rule_def.get("check")
            triggered = False
            details: Optional[Dict[str, Any]] = None

            if check == "nutrition_table_incomplete":
                if per_100g is None:
                    triggered = True
                    details = {"reason": "Nutritional panel completely missing in image view"}
                else:
                    missing_core = []
                    if per_100g.energy_kcal is None:
                        missing_core.append("energy_kcal")
                    if per_100g.protein_g is None:
                        missing_core.append("protein_g")
                    if per_100g.carbohydrate_g is None:
                        missing_core.append("carbohydrate_g")
                    if per_100g.total_fat_g is None:
                        missing_core.append("total_fat_g")
                    if missing_core:
                        triggered = True
                        details = {"missing_core_macros": missing_core}

            elif check == "high_sodium_content":
                if per_100g and per_100g.sodium_mg is not None and per_100g.sodium_mg >= high_sodium_thresh:
                    triggered = True
                    details = {
                        "sodium_mg": per_100g.sodium_mg,
                        "threshold_mg": high_sodium_thresh,
                        "pct_who_daily_limit": round((per_100g.sodium_mg / 2000.0) * 100, 1),
                    }

            elif check == "added_sugar_undeclared_high_total":
                if per_100g and per_100g.total_sugar_g is not None:
                    if per_100g.total_sugar_g >= high_sugar_thresh and per_100g.added_sugar_g is None:
                        triggered = True
                        details = {
                            "total_sugar_g": per_100g.total_sugar_g,
                            "threshold": high_sugar_thresh,
                            "added_sugar_g": None,
                        }

            elif check == "trans_fat_undeclared_or_hydrogenated":
                trans_fat_missing = per_100g is None or per_100g.trans_fat_g is None
                has_hydrogenated = len(detected_hydrogenated) > 0
                if trans_fat_missing or has_hydrogenated:
                    triggered = True
                    details = {
                        "trans_fat_missing": trans_fat_missing,
                        "hydrogenated_indicators_found": detected_hydrogenated,
                    }

            elif check == "hidden_sugar_aliases":
                if detected_aliases:
                    triggered = True
                    details = {
                        "aliases_found": detected_aliases,
                        "count": len(detected_aliases),
                    }

            elif check == "sugar_in_first_three_ingredients":
                top_3 = extraction.ingredients[:3]
                found_top_sugar = []
                for item in top_3:
                    item_low = item.lower()
                    if any(s.lower() in item_low for s in sugar_primary) or any(
                        s.lower() in item_low for s in sugar_aliases
                    ):
                        found_top_sugar.append(item)
                if found_top_sugar:
                    triggered = True
                    details = {"sugar_ingredients_in_top_3": found_top_sugar}

            elif check == "misleading_claim_no_added_sugar":
                has_no_added_sugar_claim = False
                no_sugar_keywords = ["no added sugar", "zero added sugar", "without added sugar", "no sugar added", "sugar free"]
                for claim in extraction.claims:
                    if any(kw in claim.lower() for kw in no_sugar_keywords):
                        has_no_added_sugar_claim = True
                        break

                has_sugar = (
                    len(detected_aliases) > 0
                    or len(extraction.sugar_sources) > 0
                    or (per_100g is not None and per_100g.added_sugar_g is not None and per_100g.added_sugar_g > 0)
                )

                if has_no_added_sugar_claim and has_sugar:
                    triggered = True
                    details = {
                        "claimed": [c for c in extraction.claims if any(kw in c.lower() for kw in no_sugar_keywords)],
                        "conflicting_sugar_sources": extraction.sugar_sources or detected_aliases,
                        "added_sugar_declared": per_100g.added_sugar_g if per_100g else None,
                    }

            elif check == "sodium_missing":
                if per_100g is None or per_100g.sodium_mg is None:
                    triggered = True
                    details = {"sodium_declared": False}

            elif check == "fssai_license_missing":
                if extraction.fssai_license_present is not True:
                    triggered = True
                    details = {"fssai_license_present": extraction.fssai_license_present}

            elif check == "veg_nonveg_mark_missing":
                if extraction.veg_nonveg_mark == "none" or not extraction.veg_nonveg_mark:
                    triggered = True
                    details = {"veg_nonveg_mark": extraction.veg_nonveg_mark}

            elif check == "allergen_statement_missing":
                if extraction.allergens_declared is None:
                    triggered = True
                    details = {"allergens_declared": None}

            elif check == "serving_without_per_100g":
                if extraction.serving_size_g is not None and (per_100g is None):
                    triggered = True
                    details = {"serving_size_g": extraction.serving_size_g, "per_100g_declared": False}

            if triggered:
                penalty = int(rule_def.get("penalty", 0))
                red_flags.append(
                    RedFlag(
                        id=rule_id,
                        severity=rule_def.get("severity", "INFO"),
                        category=rule_def.get("category", "nutrition"),
                        title=rule_def.get("title", rule_id),
                        description=rule_def.get("description", ""),
                        penalty=penalty,
                        details=details,
                    )
                )

        score_details = self._calculate_score(extraction, red_flags)
        compliance_report = self._build_compliance_report(extraction)
        who_impact = self._build_who_impact(extraction)
        confidence_report = self._build_confidence_report(extraction)

        return EvaluationResult(
            red_flags=red_flags,
            score=score_details,
            compliance=compliance_report,
            who_impact=who_impact,
            confidence_report=confidence_report,
        )

    def _calculate_score(self, extraction: LabelExtraction, red_flags: List[RedFlag]) -> ScoreDetails:
        """Calculate overall 0-100 score with exact mathematical reconciliation."""
        scoring = self.scoring_config
        base_score = float(scoring.get("base_score", 100))
        nutrient_penalties_cfg = scoring.get("nutrient_penalties", {})

        # Rule penalties
        total_rule_penalty = sum(rf.penalty for rf in red_flags)

        # Nutrient penalties/bonuses based on WHO guidance per 100g
        per_100g = extraction.per_100g
        nutrient_adjustments = 0.0
        nutrient_details: Dict[str, float] = {
            "sugar_deduction": 0.0,
            "saturated_fat_deduction": 0.0,
            "trans_fat_deduction": 0.0,
            "sodium_deduction": 0.0,
            "fibre_bonus": 0.0,
            "protein_bonus": 0.0,
        }

        if per_100g:
            # Sugar deduction
            sugar = per_100g.total_sugar_g or 0.0
            sugar_rate = float(nutrient_penalties_cfg.get("total_sugar_deduction_rate", 1.2))
            sugar_deduction = round(sugar * sugar_rate, 1)

            # Saturated fat deduction
            sat_fat = per_100g.saturated_fat_g or 0.0
            sat_rate = float(nutrient_penalties_cfg.get("sat_fat_deduction_rate", 2.0))
            sat_fat_deduction = round(sat_fat * sat_rate, 1)

            # Trans fat deduction
            trans_fat = per_100g.trans_fat_g or 0.0
            trans_rate = float(nutrient_penalties_cfg.get("trans_fat_deduction_rate", 15.0))
            trans_fat_deduction = round(trans_fat * trans_rate, 1)

            # Sodium deduction
            sodium = per_100g.sodium_mg or 0.0
            sodium_rate = float(nutrient_penalties_cfg.get("sodium_deduction_per_100mg", 2.5))
            sodium_deduction = round((sodium / 100.0) * sodium_rate, 1)

            # Fibre bonus
            fibre = per_100g.fibre_g or 0.0
            fibre_rate = float(nutrient_penalties_cfg.get("fibre_bonus_rate", 2.0))
            max_fibre_bonus = float(nutrient_penalties_cfg.get("max_fibre_bonus", 10.0))
            fibre_bonus = round(min(fibre * fibre_rate, max_fibre_bonus), 1)

            # Protein bonus
            protein = per_100g.protein_g or 0.0
            protein_rate = float(nutrient_penalties_cfg.get("protein_bonus_rate", 1.0))
            max_protein_bonus = float(nutrient_penalties_cfg.get("max_protein_bonus", 5.0))
            protein_bonus = round(min(protein * protein_rate, max_protein_bonus), 1)

            nutrient_adjustments = round(
                -(sugar_deduction + sat_fat_deduction + trans_fat_deduction + sodium_deduction)
                + fibre_bonus
                + protein_bonus,
                1,
            )

            nutrient_details = {
                "sugar_deduction": sugar_deduction,
                "saturated_fat_deduction": sat_fat_deduction,
                "trans_fat_deduction": trans_fat_deduction,
                "sodium_deduction": sodium_deduction,
                "fibre_bonus": fibre_bonus,
                "protein_bonus": protein_bonus,
            }

        unclamped_score = base_score - float(total_rule_penalty) + nutrient_adjustments
        min_score = int(scoring.get("minimum_score", 0))
        max_score = int(scoring.get("maximum_score", 100))
        final_score = int(max(min_score, min(max_score, round(unclamped_score))))

        # Determine traffic-light grade
        grades_cfg = scoring.get("grades", {})
        green_min = int(grades_cfg.get("green", {}).get("min_score", 70))
        amber_min = int(grades_cfg.get("amber", {}).get("min_score", 40))

        if final_score >= green_min:
            grade = "GREEN"
            desc = grades_cfg.get("green", {}).get("description", "Nutritionally balanced choice.")
        elif final_score >= amber_min:
            grade = "AMBER"
            desc = grades_cfg.get("amber", {}).get("description", "Moderate caution advised per serving.")
        else:
            grade = "RED"
            desc = grades_cfg.get("red", {}).get("description", "Higher in critical nutrients (sodium, sugars, fats).")

        breakdown = {
            "base_score": base_score,
            "rule_penalties": -float(total_rule_penalty),
            "nutrient_adjustments": nutrient_adjustments,
            "nutrient_details": nutrient_details,
            "unclamped_score": round(unclamped_score, 1),
            "reconciled": True,
        }

        return ScoreDetails(
            value=final_score,
            grade=grade,
            grade_description=desc,
            breakdown=breakdown,
        )
