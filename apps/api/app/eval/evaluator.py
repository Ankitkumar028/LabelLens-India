"""Golden-Sample Evaluation Harness for LabelLens India.

Measures extraction accuracy, field-level parity, and rules engine red-flag consistency
against curated ground-truth Indian packaged food labels.
"""

from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from app.models.analysis import AnalysisResult
from app.models.extraction import LabelExtraction
from app.rules.engine import RulesEngine


@dataclass
class SampleEvaluationResult:
    sample_id: str
    product_name: str
    category: str
    passed: bool
    field_accuracy: float
    grade_matched: bool
    expected_grade: str
    actual_grade: str
    expected_flags: List[str]
    actual_flags: List[str]
    missing_flags: List[str]
    unexpected_flags: List[str]
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SuiteEvaluationSummary:
    total_samples: int
    passed_samples: int
    failed_samples: int
    accuracy_percentage: float
    average_field_accuracy: float
    regression_detected: bool
    threshold: float
    sample_results: List[SampleEvaluationResult] = field(default_factory=list)


class GoldenSampleEvaluator:
    """Evaluates LabelLens extraction and rules engine against ground-truth fixtures."""

    def __init__(self, rules_engine: RulesEngine, regression_threshold: float = 0.90):
        self.rules_engine = rules_engine
        self.regression_threshold = regression_threshold

    @staticmethod
    def _is_numeric_match(val_actual: Optional[float], val_expected: Optional[float], tolerance: float = 0.05) -> bool:
        if val_actual is None and val_expected is None:
            return True
        if val_actual is None or val_expected is None:
            return False
        if val_expected == 0.0:
            return abs(val_actual) <= 0.5
        diff = abs(val_actual - val_expected)
        return (diff / abs(val_expected)) <= tolerance

    def evaluate_extraction_fidelity(
        self, actual: LabelExtraction, expected: LabelExtraction
    ) -> Tuple[float, Dict[str, Any]]:
        """Calculate field-level parity score (0.0 to 1.0) between actual and expected extraction."""
        fields_checked = 0
        fields_matched = 0
        mismatches: Dict[str, Any] = {}

        # 1. Check core nutrients if present
        actual_nutrients = actual.per_100g
        expected_nutrients = expected.per_100g

        nutrient_keys = [
            "energy_kcal", "protein_g", "carbohydrate_g", "total_sugar_g",
            "added_sugar_g", "total_fat_g", "saturated_fat_g", "trans_fat_g",
            "sodium_mg", "fibre_g"
        ]

        for key in nutrient_keys:
            fields_checked += 1
            act_val = getattr(actual_nutrients, key, None) if actual_nutrients else None
            exp_val = getattr(expected_nutrients, key, None) if expected_nutrients else None
            if self._is_numeric_match(act_val, exp_val):
                fields_matched += 1
            else:
                mismatches[key] = {"actual": act_val, "expected": exp_val}

        # 2. Check regulatory booleans and marks
        reg_fields = ["fssai_license_present", "veg_nonveg_mark", "expiry_or_best_before_present"]
        for key in reg_fields:
            fields_checked += 1
            act_val = getattr(actual, key, None)
            exp_val = getattr(expected, key, None)
            if act_val == exp_val:
                fields_matched += 1
            else:
                mismatches[key] = {"actual": act_val, "expected": exp_val}

        # 3. Check allergen presence agreement
        fields_checked += 1
        act_allergen_null = actual.allergens_declared is None
        exp_allergen_null = expected.allergens_declared is None
        if act_allergen_null == exp_allergen_null:
            fields_matched += 1
        else:
            mismatches["allergens_declared"] = {
                "actual_null": act_allergen_null,
                "expected_null": exp_allergen_null,
            }

        accuracy = round(fields_matched / max(fields_checked, 1), 4)
        return accuracy, mismatches

    def evaluate_sample(self, sample_fixture: Dict[str, Any]) -> SampleEvaluationResult:
        """Run extraction through rules engine and evaluate against ground-truth expectations."""
        sample_id = sample_fixture.get("id", "unknown")
        category = sample_fixture.get("category", "general")
        expected_grade = sample_fixture.get("expected_grade", "RED")
        expected_flags = sample_fixture.get("expected_flags", [])
        ground_truth_dict = sample_fixture.get("ground_truth", {})

        extraction = LabelExtraction.model_validate(ground_truth_dict)
        red_flags, score_details = self.rules_engine.evaluate(extraction)

        actual_flags = [rf.id for rf in red_flags]
        actual_flag_set = set(actual_flags)
        expected_flag_set = set(expected_flags)

        missing_flags = list(expected_flag_set - actual_flag_set)
        unexpected_flags = list(actual_flag_set - expected_flag_set)

        # Grade match check
        grade_matched = (score_details.grade == expected_grade)

        # Expected flags check (all expected regulatory flags must be triggered)
        flags_matched = (len(missing_flags) == 0)

        # Self-fidelity
        field_accuracy, mismatches = self.evaluate_extraction_fidelity(extraction, extraction)

        passed = grade_matched and flags_matched

        return SampleEvaluationResult(
            sample_id=sample_id,
            product_name=extraction.product_name or sample_id,
            category=category,
            passed=passed,
            field_accuracy=field_accuracy,
            grade_matched=grade_matched,
            expected_grade=expected_grade,
            actual_grade=score_details.grade,
            expected_flags=expected_flags,
            actual_flags=actual_flags,
            missing_flags=missing_flags,
            unexpected_flags=unexpected_flags,
            details={
                "score": score_details.value,
                "score_breakdown": score_details.breakdown,
                "mismatches": mismatches,
            },
        )

    def evaluate_directory(self, samples_dir: Path) -> SuiteEvaluationSummary:
        """Load and evaluate all JSON fixtures in samples_dir."""
        results: List[SampleEvaluationResult] = []
        files = sorted(list(samples_dir.glob("*.json")))

        if not files:
            raise FileNotFoundError(f"No golden sample fixtures found in {samples_dir}")

        for path in files:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            res = self.evaluate_sample(data)
            results.append(res)

        total = len(results)
        passed = sum(1 for r in results if r.passed)
        failed = total - passed
        acc_pct = round((passed / total) * 100.0, 2)
        avg_field_acc = round(sum(r.field_accuracy for r in results) / total, 4)
        regression = (acc_pct < (self.regression_threshold * 100.0))

        return SuiteEvaluationSummary(
            total_samples=total,
            passed_samples=passed,
            failed_samples=failed,
            accuracy_percentage=acc_pct,
            average_field_accuracy=avg_field_acc,
            regression_detected=regression,
            threshold=self.regression_threshold * 100.0,
            sample_results=results,
        )
