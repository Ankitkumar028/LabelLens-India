"""Comprehensive unit tests for the YAML-driven Rules Engine."""

from app.models.extraction import LabelExtraction, Per100gNutrients
from app.rules.engine import RulesEngine


def test_clean_label_receives_green_grade(rules_engine: RulesEngine, load_fixture):
    """Clean whole-food muesli should have high score, green grade, and no high red flags."""
    muesli = load_fixture("protein_muesli.json")
    red_flags, score = rules_engine.evaluate(muesli)

    assert score.grade == "GREEN"
    assert score.value >= 70
    high_flags = [rf for rf in red_flags if rf.severity == "HIGH"]
    assert len(high_flags) == 0
    assert rules_engine.disclaimer == "Informational only, not medical advice."


def test_sugar_in_first_three_ingredients_and_hydrogenated_fat(rules_engine: RulesEngine, load_fixture):
    """Biscuits containing sugar in top 3 and hydrogenated fat trigger HIGH flags."""
    biscuits = load_fixture("choco_biscuits.json")
    red_flags, score = rules_engine.evaluate(biscuits)

    flag_ids = {rf.id for rf in red_flags}
    assert "sugar_in_first_three_ingredients" in flag_ids
    assert "trans_fat_undeclared_or_hydrogenated" in flag_ids
    assert "hidden_sugar_aliases" in flag_ids

    # Find the alias flag and check count and details
    alias_flag = next(rf for rf in red_flags if rf.id == "hidden_sugar_aliases")
    assert alias_flag.severity == "INFO"
    assert "maltodextrin" in [a.lower() for a in alias_flag.details["aliases_found"]]

    assert score.grade in ("RED", "AMBER")


def test_misleading_claim_triggers_high_flag(rules_engine: RulesEngine, load_fixture):
    """Product claiming 'no added sugar' with liquid glucose & invert syrup triggers HIGH claim flag."""
    drink = load_fixture("misleading_drink.json")
    red_flags, score = rules_engine.evaluate(drink)

    flag_ids = {rf.id for rf in red_flags}
    assert "misleading_claim_no_added_sugar" in flag_ids
    claim_flag = next(rf for rf in red_flags if rf.id == "misleading_claim_no_added_sugar")
    assert claim_flag.severity == "HIGH"

    # Added sugar was not declared while total sugar was 14g -> should trigger added sugar rule too
    assert "added_sugar_undeclared_high_total" in flag_ids


def test_missing_table_and_fssai_triggers_critical_flags(rules_engine: RulesEngine, load_fixture):
    """Snack missing nutrition table, veg mark, and FSSAI license triggers multiple flags."""
    snack = load_fixture("incomplete_label.json")
    red_flags, score = rules_engine.evaluate(snack)

    flag_ids = {rf.id for rf in red_flags}
    assert "nutrition_table_missing_or_incomplete" in flag_ids
    assert "fssai_license_missing" in flag_ids
    assert "veg_nonveg_mark_missing" in flag_ids
    assert "allergen_statement_missing" in flag_ids
    assert "serving_without_per_100g" in flag_ids

    assert score.grade == "RED"
    assert score.value < 40


def test_sodium_missing_triggers_medium_flag(rules_engine: RulesEngine):
    """Omitting sodium triggers sodium_missing medium flag."""
    extraction = LabelExtraction(
        product_name="Sample Snack",
        per_100g=Per100gNutrients(
            energy_kcal=300.0,
            protein_g=5.0,
            carbohydrate_g=50.0,
            total_fat_g=8.0,
            sodium_mg=None,  # missing
        ),
        fssai_license_present=True,
        veg_nonveg_mark="green",
        allergens_declared=[],
    )
    red_flags, _ = rules_engine.evaluate(extraction)
    flag_ids = {rf.id for rf in red_flags}
    assert "sodium_missing" in flag_ids
    sodium_flag = next(rf for rf in red_flags if rf.id == "sodium_missing")
    assert sodium_flag.severity == "MEDIUM"


def test_score_boundary_clamping(rules_engine: RulesEngine):
    """Scores must stay bounded strictly within 0 and 100."""
    terrible_label = LabelExtraction(
        product_name="Excessive Junk",
        per_100g=Per100gNutrients(
            energy_kcal=600.0,
            protein_g=0.0,
            carbohydrate_g=95.0,
            total_sugar_g=80.0,
            added_sugar_g=None,
            total_fat_g=35.0,
            saturated_fat_g=20.0,
            trans_fat_g=5.0,
            sodium_mg=2500.0,
            fibre_g=0.0,
        ),
        ingredients=["Sugar", "Hydrogenated Fat", "Liquid Glucose"],
        sugar_sources=["Sugar", "Liquid Glucose"],
        claims=["No Added Sugar"],
        fssai_license_present=False,
        veg_nonveg_mark="none",
        allergens_declared=None,
    )
    _, score = rules_engine.evaluate(terrible_label)
    assert score.value >= 0
    assert score.value <= 100
    assert score.grade == "RED"


def test_non_food_image_triggers_non_compliant_fssai_status(rules_engine: RulesEngine):
    """Uploading a non-food image (e.g. human hands) triggers NON_COMPLIANT status and 5 failed statutory checks."""
    hands_image_extraction = LabelExtraction(
        product_name=None,
        per_100g=None,
        ingredients=[],
        confidence=0.0,
        unreadable_fields=["not_a_food_label"],
    )
    result = rules_engine.evaluate(hands_image_extraction)

    # 1. Health score is 0 and RED grade
    assert result.score.value == 0
    assert result.score.grade == "RED"
    assert any(rf.id == "not_a_food_label" for rf in result.red_flags)

    # 2. Compliance status MUST be NON_COMPLIANT, never COMPLIANT
    assert result.compliance.status == "NON_COMPLIANT"
    assert result.compliance.overall_status == "NON_COMPLIANT"
    assert "Non-food image" in result.compliance.summary

    # 3. All 5 statutory checks are present and marked NOT_DETECTED
    assert len(result.compliance.checks) == 5
    for check in result.compliance.checks:
        assert check.status == "NOT_DETECTED"
        assert check.name == check.title
        assert check.clause == check.fssai_clause

