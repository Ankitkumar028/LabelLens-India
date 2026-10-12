"""Evaluation harness test suite asserting accuracy on golden sample dataset."""

from pathlib import Path
import pytest
from app.eval.evaluator import GoldenSampleEvaluator
from app.rules.engine import RulesEngine


@pytest.fixture
def golden_samples_dir() -> Path:
    base = Path(__file__).parent / "fixtures" / "golden_samples"
    return base


def test_golden_samples_benchmark_suite(rules_engine: RulesEngine, golden_samples_dir: Path):
    """Run full eval harness across all golden ground truth samples.

    Asserts no regressions are detected and overall accuracy meets the threshold.
    """
    evaluator = GoldenSampleEvaluator(rules_engine, regression_threshold=0.90)
    summary = evaluator.evaluate_directory(golden_samples_dir)

    assert summary.total_samples >= 20, f"Expected at least 20 golden samples, found {summary.total_samples}"
    assert not summary.regression_detected, f"Regression detected: Suite accuracy was {summary.accuracy_percentage}%"
    assert summary.accuracy_percentage >= 95.0, f"Suite accuracy was {summary.accuracy_percentage}%, expected >= 95%"
    assert summary.average_field_accuracy >= 0.95


def test_clean_samples_pass_green_grade(rules_engine: RulesEngine, golden_samples_dir: Path):
    """Specific check that clean products (oats, peanut butter) achieve GREEN rating."""
    evaluator = GoldenSampleEvaluator(rules_engine)
    oats_file = golden_samples_dir / "quaker_plain_rolled_oats.json"
    import json
    with open(oats_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    result = evaluator.evaluate_sample(data)
    assert result.passed
    assert result.actual_grade == "GREEN"


def test_incomplete_regulatory_fails_red_grade(rules_engine: RulesEngine, golden_samples_dir: Path):
    """Specific check that missing FSSAI or nutrition table flags RED rating."""
    evaluator = GoldenSampleEvaluator(rules_engine)
    incomplete_file = golden_samples_dir / "unbranded_local_bhujia_incomplete.json"
    import json
    with open(incomplete_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    result = evaluator.evaluate_sample(data)
    assert result.passed
    assert result.actual_grade == "RED"
    assert "fssai_license_missing" in result.actual_flags
    assert "nutrition_table_missing_or_incomplete" in result.actual_flags
