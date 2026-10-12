"""YAML-driven Rules Engine for FSSAI-aware Food Label Analysis."""

from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import yaml

from app.models.extraction import LabelExtraction
from app.models.analysis import RedFlag, ScoreDetails


class RulesEngine:
    """Evaluates LabelExtraction data against auditable YAML rules.

    Red-flag rules and thresholds are entirely configured in rules.yaml.
    """

    def __init__(self, config_path: Path):
        self.config_path = config_path
        self.config = self._load_config(config_path)

    @staticmethod
    def _load_config(path: Path) -> Dict[str, Any]:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    @property
    def disclaimer(self) -> str:
        return self.config.get("disclaimer", "Informational only, not medical advice.")

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

    def evaluate(self, extraction: LabelExtraction) -> Tuple[List[RedFlag], ScoreDetails]:
        """Evaluate extraction and produce red flags and score."""
        is_invalid_image = (
            "not_a_food_label" in extraction.unreadable_fields
            or (extraction.confidence == 0.0 and extraction.per_100g is None and not extraction.ingredients)
        )
        if is_invalid_image:
            flag = RedFlag(
                id="not_a_food_label",
                severity="HIGH",
                category="regulatory",
                title="🚨 No Food Label Detected",
                description="The uploaded photo does not contain a packaged food label, nutrition table, or ingredients list. Please upload a clear photo of the packaging.",
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
                },
            )
            return [flag], score_details

        red_flags: List[RedFlag] = []
        total_penalties = 0

        # Dictionaries
        sugar_aliases = self.dictionaries.get("sugar_aliases", [])
        sugar_primary = self.dictionaries.get("sugar_primary_names", ["sugar"])
        hydrogenated_indicators = self.dictionaries.get("hydrogenated_fat_indicators", [])

        # Thresholds
        high_sugar_thresh = self.thresholds.get("high_total_sugar_g_per_100g", 10.0)

        # Pre-calculated matches
        all_text_ingredients = extraction.ingredients + extraction.sugar_sources
        detected_aliases = self._find_matching_terms(all_text_ingredients, sugar_aliases)
        all_fat_text = extraction.ingredients + extraction.fat_sources
        detected_hydrogenated = self._find_matching_terms(all_fat_text, hydrogenated_indicators)

        per_100g = extraction.per_100g

        # Evaluate defined rules
        for rule_def in self.rule_definitions:
            rule_id = rule_def["id"]
            check = rule_def.get("check")
            triggered = False
            details: Optional[Dict[str, Any]] = None

            if check == "nutrition_table_incomplete":
                if per_100g is None:
                    triggered = True
                    details = {"reason": "Nutritional panel completely missing"}
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

            elif check == "sodium_missing":
                if per_100g is None or per_100g.sodium_mg is None:
                    triggered = True
                    details = {"sodium_declared": False}

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
                total_penalties += penalty
                red_flags.append(
                    RedFlag(
                        id=rule_id,
                        severity=rule_def.get("severity", "INFO"),
                        category=rule_def.get("category", "general"),
                        title=rule_def.get("title", rule_id),
                        description=rule_def.get("description", ""),
                        penalty=penalty,
                        details=details,
                    )
                )

        score_details = self._calculate_score(extraction, red_flags)
        return red_flags, score_details

    def _calculate_score(self, extraction: LabelExtraction, red_flags: List[RedFlag]) -> ScoreDetails:
        """Calculate overall 0-100 score and traffic light grade."""
        scoring = self.scoring_config
        base_score = float(scoring.get("base_score", 100))
        nutrient_penalties_cfg = scoring.get("nutrient_penalties", {})

        breakdown: Dict[str, Any] = {
            "base_score": base_score,
            "rule_penalties": 0.0,
            "nutrient_adjustments": 0.0,
        }

        # Rule penalties
        total_rule_penalty = sum(rf.penalty for rf in red_flags)
        breakdown["rule_penalties"] = -total_rule_penalty
        score = base_score - total_rule_penalty

        # Nutrient penalties/bonuses if per_100g is present
        per_100g = extraction.per_100g
        if per_100g:
            # Sugar deduction
            sugar = per_100g.total_sugar_g or 0.0
            sugar_rate = float(nutrient_penalties_cfg.get("total_sugar_deduction_rate", 1.2))
            sugar_deduction = sugar * sugar_rate

            # Saturated fat deduction
            sat_fat = per_100g.saturated_fat_g or 0.0
            sat_rate = float(nutrient_penalties_cfg.get("sat_fat_deduction_rate", 2.0))
            sat_fat_deduction = sat_fat * sat_rate

            # Trans fat deduction
            trans_fat = per_100g.trans_fat_g or 0.0
            trans_rate = float(nutrient_penalties_cfg.get("trans_fat_deduction_rate", 15.0))
            trans_fat_deduction = trans_fat * trans_rate

            # Sodium deduction
            sodium = per_100g.sodium_mg or 0.0
            sodium_rate = float(nutrient_penalties_cfg.get("sodium_deduction_per_100mg", 2.5))
            sodium_deduction = (sodium / 100.0) * sodium_rate

            # Bonuses
            fibre = per_100g.fibre_g or 0.0
            fibre_rate = float(nutrient_penalties_cfg.get("fibre_bonus_rate", 2.0))
            max_fibre_bonus = float(nutrient_penalties_cfg.get("max_fibre_bonus", 10.0))
            fibre_bonus = min(fibre * fibre_rate, max_fibre_bonus)

            protein = per_100g.protein_g or 0.0
            protein_rate = float(nutrient_penalties_cfg.get("protein_bonus_rate", 1.0))
            max_protein_bonus = float(nutrient_penalties_cfg.get("max_protein_bonus", 5.0))
            protein_bonus = min(protein * protein_rate, max_protein_bonus)

            nutrient_adjustments = (
                - (sugar_deduction + sat_fat_deduction + trans_fat_deduction + sodium_deduction)
                + fibre_bonus
                + protein_bonus
            )

            breakdown["nutrient_adjustments"] = round(nutrient_adjustments, 1)
            breakdown["nutrient_details"] = {
                "sugar_deduction": round(sugar_deduction, 1),
                "saturated_fat_deduction": round(sat_fat_deduction, 1),
                "trans_fat_deduction": round(trans_fat_deduction, 1),
                "sodium_deduction": round(sodium_deduction, 1),
                "fibre_bonus": round(fibre_bonus, 1),
                "protein_bonus": round(protein_bonus, 1),
            }
            score += nutrient_adjustments

        # Clamp score between min and max
        min_score = int(scoring.get("minimum_score", 0))
        max_score = int(scoring.get("maximum_score", 100))
        final_score = int(max(min_score, min(max_score, round(score))))

        # Determine traffic-light grade
        grades_cfg = scoring.get("grades", {})
        green_min = int(grades_cfg.get("green", {}).get("min_score", 70))
        amber_min = int(grades_cfg.get("amber", {}).get("min_score", 40))

        if final_score >= green_min:
            grade = "GREEN"
            desc = grades_cfg.get("green", {}).get("description", "Healthier choice")
        elif final_score >= amber_min:
            grade = "AMBER"
            desc = grades_cfg.get("amber", {}).get("description", "Moderate caution advised")
        else:
            grade = "RED"
            desc = grades_cfg.get("red", {}).get("description", "High risk label")

        return ScoreDetails(
            value=final_score,
            grade=grade,
            grade_description=desc,
            breakdown=breakdown,
        )
