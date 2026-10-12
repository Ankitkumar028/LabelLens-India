"""CLI Runner for Golden-Sample Evaluation Harness.

Run via: py scripts/run_eval.py
"""

from pathlib import Path
import sys

# Ensure api directory is on python path
base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir / "apps" / "api"))

from app.config import settings
from app.eval.evaluator import GoldenSampleEvaluator
from app.rules.engine import RulesEngine


def run():
    if Path("/app/config/rules.yaml").is_file():
        rules_path = Path("/app/config/rules.yaml")
        fixtures_dir = Path("/app/tests/fixtures/golden_samples")
    else:
        rules_path = base_dir / "apps" / "api" / "config" / "rules.yaml"
        fixtures_dir = base_dir / "apps" / "api" / "tests" / "fixtures" / "golden_samples"

    rules_engine = RulesEngine(rules_path)
    evaluator = GoldenSampleEvaluator(rules_engine, regression_threshold=0.90)
    summary = evaluator.evaluate_directory(fixtures_dir)

    print("=" * 80)
    print(f"🔬 LABELLENS INDIA — GOLDEN SAMPLE EVALUATION HARNESS")
    print("=" * 80)
    print(f"Total Golden Samples Evaluated: {summary.total_samples}")
    print(f"Passed Checks:                  {summary.passed_samples}")
    print(f"Failed Checks:                  {summary.failed_samples}")
    print(f"Suite Accuracy:                 {summary.accuracy_percentage}% (Required Threshold: {summary.threshold}%)")
    print(f"Average Field Extraction Parity: {summary.average_field_accuracy * 100:.2f}%")
    print("-" * 80)
    print(f"{'Sample ID':<35} | {'Category':<12} | {'Expected':<8} | {'Actual':<8} | {'Status'}")
    print("-" * 80)

    for r in summary.sample_results:
        status_label = "✅ PASS" if r.passed else "❌ FAIL"
        print(f"{r.sample_id:<35} | {r.category:<12} | {r.expected_grade:<8} | {r.actual_grade:<8} | {status_label}")
        if not r.passed:
            if not r.grade_matched:
                print(f"   ↳ Grade Mismatch: Expected {r.expected_grade}, got {r.actual_grade}")
            if r.missing_flags:
                print(f"   ↳ Missing Expected Flags: {r.missing_flags}")

    print("=" * 80)
    if summary.regression_detected:
        print("🚨 REGRESSION DETECTED: Suite accuracy below threshold!")
        sys.exit(1)
    else:
        print("🎉 BENCHMARK PASSED: All golden samples satisfy accuracy & FSSAI rules criteria.")
        sys.exit(0)


if __name__ == "__main__":
    run()
