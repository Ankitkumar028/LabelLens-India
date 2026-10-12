"""Seed 22+ diverse Indian packaged food golden label samples for evaluation harness."""

import json
from pathlib import Path

SAMPLES = [
    {
        "id": "parle_g_gluocose_biscuit",
        "category": "biscuits",
        "expected_grade": "RED",
        "expected_flags": ["sugar_in_first_three_ingredients", "hidden_sugar_aliases"],
        "ground_truth": {
            "product_name": "Parle-G Original Glucose Biscuits",
            "serving_size_g": 25.0,
            "per_100g": {
                "energy_kcal": 454.0, "protein_g": 6.7, "carbohydrate_g": 78.2,
                "total_sugar_g": 26.5, "added_sugar_g": 25.0, "total_fat_g": 12.8,
                "saturated_fat_g": 6.1, "trans_fat_g": 0.0, "sodium_mg": 280.0, "fibre_g": 1.5
            },
            "ingredients": ["Refined Wheat Flour", "Sugar", "Edible Vegetable Oil", "Invert Sugar Syrup", "Raising Agents"],
            "sugar_sources": ["Sugar", "Invert Sugar Syrup"],
            "fat_sources": ["Edible Vegetable Oil (Palm)"],
            "allergens_declared": ["Contains Wheat and Milk"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["G for Genius", "Energy Food"],
            "expiry_or_best_before_present": True, "confidence": 0.98, "unreadable_fields": []
        }
    },
    {
        "id": "bourbon_chocolate_cream",
        "category": "biscuits",
        "expected_grade": "RED",
        "expected_flags": ["sugar_in_first_three_ingredients", "trans_fat_undeclared_or_hydrogenated"],
        "ground_truth": {
            "product_name": "Bourbon Rich Chocolate Biscuit",
            "serving_size_g": 30.0,
            "per_100g": {
                "energy_kcal": 490.0, "protein_g": 5.2, "carbohydrate_g": 73.0,
                "total_sugar_g": 38.0, "added_sugar_g": 35.0, "total_fat_g": 20.0,
                "saturated_fat_g": 9.5, "trans_fat_g": 0.2, "sodium_mg": 210.0, "fibre_g": 1.2
            },
            "ingredients": ["Refined Wheat Flour", "Sugar", "Hydrogenated Vegetable Fat", "Cocoa Powder", "Dextrose"],
            "sugar_sources": ["Sugar", "Dextrose"],
            "fat_sources": ["Hydrogenated Vegetable Fat"],
            "allergens_declared": ["Contains Wheat and Soy"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Real Chocolate Cream"],
            "expiry_or_best_before_present": True, "confidence": 0.97, "unreadable_fields": []
        }
    },
    {
        "id": "marie_gold_tea_biscuit",
        "category": "biscuits",
        "expected_grade": "RED",
        "expected_flags": ["added_sugar_undeclared_high_total", "sugar_in_first_three_ingredients"],
        "ground_truth": {
            "product_name": "Britannia Marie Gold Biscuits",
            "serving_size_g": 22.0,
            "per_100g": {
                "energy_kcal": 445.0, "protein_g": 8.0, "carbohydrate_g": 79.0,
                "total_sugar_g": 21.0, "added_sugar_g": None, "total_fat_g": 11.0,
                "saturated_fat_g": 5.0, "trans_fat_g": 0.0, "sodium_mg": 310.0, "fibre_g": 2.5
            },
            "ingredients": ["Refined Wheat Flour", "Sugar", "Refined Palm Oil", "Milk Solids", "Invert Sugar"],
            "sugar_sources": ["Sugar", "Invert Sugar"],
            "fat_sources": ["Refined Palm Oil"],
            "allergens_declared": ["Contains Wheat and Milk"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Tea Time Favourite", "Contains 10 Essential Vitamins"],
            "expiry_or_best_before_present": True, "confidence": 0.96, "unreadable_fields": []
        }
    },
    {
        "id": "good_day_butter_cookies",
        "category": "biscuits",
        "expected_grade": "RED",
        "expected_flags": ["sugar_in_first_three_ingredients"],
        "ground_truth": {
            "product_name": "Britannia Good Day Butter Cookies",
            "serving_size_g": 25.0,
            "per_100g": {
                "energy_kcal": 498.0, "protein_g": 6.8, "carbohydrate_g": 69.0,
                "total_sugar_g": 23.0, "added_sugar_g": 21.5, "total_fat_g": 22.0,
                "saturated_fat_g": 11.0, "trans_fat_g": 0.0, "sodium_mg": 320.0, "fibre_g": 1.8
            },
            "ingredients": ["Refined Wheat Flour", "Sugar", "Butter (2%)", "Edible Vegetable Oil", "Milk Solids"],
            "sugar_sources": ["Sugar"],
            "fat_sources": ["Butter", "Edible Vegetable Oil"],
            "allergens_declared": ["Contains Wheat, Milk, and Nuts"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Rich Butter Delight", "Smiles in Every Bite"],
            "expiry_or_best_before_present": True, "confidence": 0.97, "unreadable_fields": []
        }
    },
    {
        "id": "quaker_plain_rolled_oats",
        "category": "cereals",
        "expected_grade": "GREEN",
        "expected_flags": [],
        "ground_truth": {
            "product_name": "Quaker 100% Wholegrain Rolled Oats",
            "serving_size_g": 40.0,
            "per_100g": {
                "energy_kcal": 407.0, "protein_g": 11.8, "carbohydrate_g": 68.5,
                "total_sugar_g": 0.5, "added_sugar_g": 0.0, "total_fat_g": 9.5,
                "saturated_fat_g": 2.0, "trans_fat_g": 0.0, "sodium_mg": 9.0, "fibre_g": 10.5
            },
            "ingredients": ["100% Rolled Oats"],
            "sugar_sources": [],
            "fat_sources": [],
            "allergens_declared": ["May contain traces of wheat"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["100% Whole Grain", "Helps Manage Weight", "Zero Added Sugar"],
            "expiry_or_best_before_present": True, "confidence": 0.99, "unreadable_fields": []
        }
    },
    {
        "id": "yoga_bar_protein_muesli",
        "category": "cereals",
        "expected_grade": "GREEN",
        "expected_flags": [],
        "ground_truth": {
            "product_name": "Yoga Bar Dark Chocolate + Cranberry Protein Muesli",
            "serving_size_g": 50.0,
            "per_100g": {
                "energy_kcal": 415.0, "protein_g": 18.0, "carbohydrate_g": 56.0,
                "total_sugar_g": 6.0, "added_sugar_g": 0.0, "total_fat_g": 11.0,
                "saturated_fat_g": 2.5, "trans_fat_g": 0.0, "sodium_mg": 70.0, "fibre_g": 8.0
            },
            "ingredients": ["Whole Rolled Oats (50%)", "Raw Whey Protein Isolate", "Chia Seeds", "Pumpkin Seeds", "Almonds", "Cranberries"],
            "sugar_sources": [],
            "fat_sources": ["Almonds", "Chia Seeds", "Pumpkin Seeds"],
            "allergens_declared": ["Contains Milk and Nuts"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["High Protein 18g", "No Added Sugar", "100% Clean Ingredients"],
            "expiry_or_best_before_present": True, "confidence": 0.98, "unreadable_fields": []
        }
    },
    {
        "id": "kelloggs_chocos_cereal",
        "category": "cereals",
        "expected_grade": "AMBER",
        "expected_flags": ["sugar_in_first_three_ingredients", "hidden_sugar_aliases"],
        "ground_truth": {
            "product_name": "Kellogg's Chocos Chocolate Wheat Cereal",
            "serving_size_g": 30.0,
            "per_100g": {
                "energy_kcal": 382.0, "protein_g": 8.6, "carbohydrate_g": 82.5,
                "total_sugar_g": 29.5, "added_sugar_g": 28.0, "total_fat_g": 2.5,
                "saturated_fat_g": 1.1, "trans_fat_g": 0.0, "sodium_mg": 340.0, "fibre_g": 4.5
            },
            "ingredients": ["Wheat Solids (54%)", "Sugar", "Cocoa Solids", "Malt Extract", "Iodised Salt", "Minerals"],
            "sugar_sources": ["Sugar", "Malt Extract"],
            "fat_sources": [],
            "allergens_declared": ["Contains Wheat and Barley"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Rich in Calcium & Protein", "Makes Milk Chocolaty"],
            "expiry_or_best_before_present": True, "confidence": 0.98, "unreadable_fields": []
        }
    },
    {
        "id": "real_mixed_fruit_juice",
        "category": "beverages",
        "expected_grade": "AMBER",
        "expected_flags": ["sugar_in_first_three_ingredients"],
        "ground_truth": {
            "product_name": "Real Fruit Power Mixed Fruit Juice",
            "serving_size_g": 200.0,
            "per_100g": {
                "energy_kcal": 56.0, "protein_g": 0.4, "carbohydrate_g": 13.5,
                "total_sugar_g": 13.0, "added_sugar_g": 7.0, "total_fat_g": 0.0,
                "saturated_fat_g": 0.0, "trans_fat_g": 0.0, "sodium_mg": 18.0, "fibre_g": 0.0
            },
            "ingredients": ["Water", "Mixed Fruit Concentrate (21%)", "Sugar", "Acidity Regulator (INS 330)", "Antioxidant (INS 300)"],
            "sugar_sources": ["Sugar", "Mixed Fruit Concentrate"],
            "fat_sources": [],
            "allergens_declared": [],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["No Added Preservatives", "Goodness of 9 Fruits"],
            "expiry_or_best_before_present": True, "confidence": 0.97, "unreadable_fields": []
        }
    },
    {
        "id": "frooti_mango_drink",
        "category": "beverages",
        "expected_grade": "AMBER",
        "expected_flags": ["sugar_in_first_three_ingredients", "hidden_sugar_aliases"],
        "ground_truth": {
            "product_name": "Frooti Fresh 'N' Juicy Mango Drink",
            "serving_size_g": 150.0,
            "per_100g": {
                "energy_kcal": 65.0, "protein_g": 0.0, "carbohydrate_g": 16.2,
                "total_sugar_g": 15.5, "added_sugar_g": 14.5, "total_fat_g": 0.0,
                "saturated_fat_g": 0.0, "trans_fat_g": 0.0, "sodium_mg": 25.0, "fibre_g": 0.0
            },
            "ingredients": ["Water", "Mango Pulp (19.5%)", "Sugar", "Liquid Glucose", "Acidity Regulator"],
            "sugar_sources": ["Sugar", "Liquid Glucose"],
            "fat_sources": [],
            "allergens_declared": [],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Made with Real Mango Pulp"],
            "expiry_or_best_before_present": True, "confidence": 0.98, "unreadable_fields": []
        }
    },
    {
        "id": "thums_up_cola",
        "category": "beverages",
        "expected_grade": "AMBER",
        "expected_flags": ["sugar_in_first_three_ingredients"],
        "ground_truth": {
            "product_name": "Thums Up Carbonated Soft Drink",
            "serving_size_g": 250.0,
            "per_100g": {
                "energy_kcal": 40.0, "protein_g": 0.0, "carbohydrate_g": 10.0,
                "total_sugar_g": 10.0, "added_sugar_g": 10.0, "total_fat_g": 0.0,
                "saturated_fat_g": 0.0, "trans_fat_g": 0.0, "sodium_mg": 15.0, "fibre_g": 0.0
            },
            "ingredients": ["Carbonated Water", "Sugar", "Acidity Regulator (INS 338)", "Colour (INS 150d)", "Flavours", "Caffeine"],
            "sugar_sources": ["Sugar"],
            "fat_sources": [],
            "allergens_declared": [],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Taste the Thunder"],
            "expiry_or_best_before_present": True, "confidence": 0.99, "unreadable_fields": []
        }
    },
    {
        "id": "bournvita_health_drink",
        "category": "beverages",
        "expected_grade": "RED",
        "expected_flags": ["sugar_in_first_three_ingredients", "hidden_sugar_aliases"],
        "ground_truth": {
            "product_name": "Cadbury Bournvita Chocolate Nutrition Drink",
            "serving_size_g": 20.0,
            "per_100g": {
                "energy_kcal": 384.0, "protein_g": 7.0, "carbohydrate_g": 85.0,
                "total_sugar_g": 49.8, "added_sugar_g": 32.2, "total_fat_g": 1.8,
                "saturated_fat_g": 0.9, "trans_fat_g": 0.0, "sodium_mg": 160.0, "fibre_g": 2.5
            },
            "ingredients": ["Cereal Extract", "Sugar", "Cocoa Solids", "Liquid Glucose", "Maltodextrin", "Emulsifiers", "Vitamins"],
            "sugar_sources": ["Sugar", "Liquid Glucose", "Maltodextrin", "Cereal Extract"],
            "fat_sources": [],
            "allergens_declared": ["Contains Milk and Gluten"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Inner Strength", "Scientifically Designed Formula"],
            "expiry_or_best_before_present": True, "confidence": 0.97, "unreadable_fields": []
        }
    },
    {
        "id": "haldirams_aloo_bhujia",
        "category": "snacks",
        "expected_grade": "AMBER",
        "expected_flags": [],
        "ground_truth": {
            "product_name": "Haldiram's Nagpur Aloo Bhujia",
            "serving_size_g": 35.0,
            "per_100g": {
                "energy_kcal": 582.0, "protein_g": 8.5, "carbohydrate_g": 43.0,
                "total_sugar_g": 2.0, "added_sugar_g": 0.0, "total_fat_g": 42.0,
                "saturated_fat_g": 18.0, "trans_fat_g": 0.0, "sodium_mg": 860.0, "fibre_g": 3.0
            },
            "ingredients": ["Potato Flakes", "Edible Vegetable Oil (Palmolein)", "Gram Flour", "Tepary Beans Flour", "Iodised Salt", "Spices and Condiments"],
            "sugar_sources": [],
            "fat_sources": ["Palmolein Oil"],
            "allergens_declared": ["May contain traces of peanuts and gluten"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Chatpata Crispy Snack"],
            "expiry_or_best_before_present": True, "confidence": 0.96, "unreadable_fields": []
        }
    },
    {
        "id": "maggi_2_minute_noodles",
        "category": "snacks",
        "expected_grade": "GREEN",
        "expected_flags": [],
        "ground_truth": {
            "product_name": "Maggi 2-Minute Masala Instant Noodles",
            "serving_size_g": 70.0,
            "per_100g": {
                "energy_kcal": 427.0, "protein_g": 8.0, "carbohydrate_g": 63.5,
                "total_sugar_g": 2.2, "added_sugar_g": 1.2, "total_fat_g": 15.7,
                "saturated_fat_g": 6.8, "trans_fat_g": 0.1, "sodium_mg": 980.0, "fibre_g": 3.6
            },
            "ingredients": ["Refined Wheat Flour", "Palm Oil", "Iodised Salt", "Wheat Gluten", "Hydrolysed Groundnut Protein", "Mixed Spices"],
            "sugar_sources": ["Sugar"],
            "fat_sources": ["Palm Oil"],
            "allergens_declared": ["Contains Wheat and Peanuts"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Taste of India", "Iron Fortified"],
            "expiry_or_best_before_present": True, "confidence": 0.98, "unreadable_fields": []
        }
    },
    {
        "id": "kurkure_masala_munch",
        "category": "snacks",
        "expected_grade": "AMBER",
        "expected_flags": [],
        "ground_truth": {
            "product_name": "Kurkure Masala Munch Corn Puffs",
            "serving_size_g": 30.0,
            "per_100g": {
                "energy_kcal": 558.0, "protein_g": 6.0, "carbohydrate_g": 54.0,
                "total_sugar_g": 2.5, "added_sugar_g": 1.0, "total_fat_g": 35.0,
                "saturated_fat_g": 15.0, "trans_fat_g": 0.1, "sodium_mg": 920.0, "fibre_g": 2.0
            },
            "ingredients": ["Rice Meal", "Edible Vegetable Oil (Palmolein)", "Corn Meal", "Gram Meal", "Spices & Condiments", "Salt"],
            "sugar_sources": ["Sugar"],
            "fat_sources": ["Palmolein Oil"],
            "allergens_declared": ["Contains Soy and Milk Products"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Tedha Hai Par Mera Hai"],
            "expiry_or_best_before_present": True, "confidence": 0.97, "unreadable_fields": []
        }
    },
    {
        "id": "lays_classic_salted_chips",
        "category": "snacks",
        "expected_grade": "GREEN",
        "expected_flags": [],
        "ground_truth": {
            "product_name": "Lay's Classic Salted Potato Chips",
            "serving_size_g": 28.0,
            "per_100g": {
                "energy_kcal": 542.0, "protein_g": 7.0, "carbohydrate_g": 52.0,
                "total_sugar_g": 0.5, "added_sugar_g": 0.0, "total_fat_g": 34.0,
                "saturated_fat_g": 13.0, "trans_fat_g": 0.0, "sodium_mg": 550.0, "fibre_g": 3.8
            },
            "ingredients": ["Potato", "Edible Vegetable Oil (Palmolein)", "Iodised Salt (1.5%)"],
            "sugar_sources": [],
            "fat_sources": ["Palmolein Oil"],
            "allergens_declared": [],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["100% Farm Grown Potatoes"],
            "expiry_or_best_before_present": True, "confidence": 0.99, "unreadable_fields": []
        }
    },
    {
        "id": "amul_pasteurised_butter",
        "category": "dairy",
        "expected_grade": "RED",
        "expected_flags": [],
        "ground_truth": {
            "product_name": "Amul Pasteurised Butter",
            "serving_size_g": 10.0,
            "per_100g": {
                "energy_kcal": 722.0, "protein_g": 0.6, "carbohydrate_g": 0.0,
                "total_sugar_g": 0.0, "added_sugar_g": 0.0, "total_fat_g": 80.0,
                "saturated_fat_g": 53.0, "trans_fat_g": 0.0, "sodium_mg": 830.0, "fibre_g": 0.0
            },
            "ingredients": ["Butter", "Common Salt"],
            "sugar_sources": [],
            "fat_sources": ["Butter Fat (80%)"],
            "allergens_declared": ["Contains Milk"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Utterly Butterly Delicious"],
            "expiry_or_best_before_present": True, "confidence": 0.99, "unreadable_fields": []
        }
    },
    {
        "id": "ritebite_max_protein_bar",
        "category": "fitness",
        "expected_grade": "GREEN",
        "expected_flags": [],
        "ground_truth": {
            "product_name": "RiteBite Max Protein Daily Bar Choco Almond",
            "serving_size_g": 50.0,
            "per_100g": {
                "energy_kcal": 380.0, "protein_g": 20.0, "carbohydrate_g": 42.0,
                "total_sugar_g": 5.0, "added_sugar_g": 0.0, "total_fat_g": 10.0,
                "saturated_fat_g": 2.2, "trans_fat_g": 0.0, "sodium_mg": 120.0, "fibre_g": 7.0
            },
            "ingredients": ["Protein Blend (Soy Protein, Whey Protein)", "Almonds", "Oats", "Flaxseeds", "Cocoa Powder"],
            "sugar_sources": [],
            "fat_sources": ["Almonds", "Flaxseeds"],
            "allergens_declared": ["Contains Soy, Milk and Nuts"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["20g Protein", "No Added Sugar", "7g Fibre"],
            "expiry_or_best_before_present": True, "confidence": 0.98, "unreadable_fields": []
        }
    },
    {
        "id": "saffola_fittify_peanut_butter",
        "category": "spreads",
        "expected_grade": "GREEN",
        "expected_flags": [],
        "ground_truth": {
            "product_name": "Saffola FITTIFY 100% Pure Peanut Butter Unsweetened",
            "serving_size_g": 32.0,
            "per_100g": {
                "energy_kcal": 625.0, "protein_g": 26.0, "carbohydrate_g": 20.0,
                "total_sugar_g": 3.0, "added_sugar_g": 0.0, "total_fat_g": 50.0,
                "saturated_fat_g": 8.0, "trans_fat_g": 0.0, "sodium_mg": 15.0, "fibre_g": 6.5
            },
            "ingredients": ["100% Roasted Peanuts"],
            "sugar_sources": [],
            "fat_sources": ["Peanut Oil"],
            "allergens_declared": ["Contains Peanuts"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["100% Roasted Peanuts", "No Added Sugar", "Zero Hydrogenated Oils"],
            "expiry_or_best_before_present": True, "confidence": 0.99, "unreadable_fields": []
        }
    },
    {
        "id": "soan_papdi_sweet",
        "category": "sweets",
        "expected_grade": "RED",
        "expected_flags": ["sugar_in_first_three_ingredients", "trans_fat_undeclared_or_hydrogenated"],
        "ground_truth": {
            "product_name": "Haldiram's Traditional Soan Papdi",
            "serving_size_g": 40.0,
            "per_100g": {
                "energy_kcal": 512.0, "protein_g": 4.5, "carbohydrate_g": 68.0,
                "total_sugar_g": 48.0, "added_sugar_g": 45.0, "total_fat_g": 24.5,
                "saturated_fat_g": 12.0, "trans_fat_g": 0.3, "sodium_mg": 40.0, "fibre_g": 1.0
            },
            "ingredients": ["Sugar", "Refined Wheat Flour", "Gram Flour", "Vanaspati (Hydrogenated Vegetable Oil)", "Cardamom", "Almonds"],
            "sugar_sources": ["Sugar"],
            "fat_sources": ["Vanaspati (Hydrogenated Vegetable Oil)"],
            "allergens_declared": ["Contains Wheat and Nuts"],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["Festive Sweets", "Rich Pistachio & Almond"],
            "expiry_or_best_before_present": True, "confidence": 0.95, "unreadable_fields": []
        }
    },
    {
        "id": "diet_herbal_slimming_tea",
        "category": "misleading",
        "expected_grade": "RED",
        "expected_flags": ["misleading_claim_no_added_sugar", "hidden_sugar_aliases"],
        "ground_truth": {
            "product_name": "SlimFit Herbal Slimming Instant Tea",
            "serving_size_g": 10.0,
            "per_100g": {
                "energy_kcal": 360.0, "protein_g": 0.5, "carbohydrate_g": 88.0,
                "total_sugar_g": 22.0, "added_sugar_g": 20.0, "total_fat_g": 0.0,
                "saturated_fat_g": 0.0, "trans_fat_g": 0.0, "sodium_mg": 30.0, "fibre_g": 0.0
            },
            "ingredients": ["Green Tea Extract", "Maltodextrin", "Dextrose", "Lemon Grass", "Stevia Extract"],
            "sugar_sources": ["Maltodextrin", "Dextrose"],
            "fat_sources": [],
            "allergens_declared": [],
            "fssai_license_present": True, "veg_nonveg_mark": "green",
            "claims": ["No Added Sugar", "100% Herbal Detox", "Zero Sugar Slimming"],
            "expiry_or_best_before_present": True, "confidence": 0.94, "unreadable_fields": []
        }
    },
    {
        "id": "unbranded_local_bhujia_incomplete",
        "category": "regulatory_fail",
        "expected_grade": "RED",
        "expected_flags": [
            "nutrition_table_missing_or_incomplete",
            "fssai_license_missing",
            "veg_nonveg_mark_missing",
            "allergen_statement_missing"
        ],
        "ground_truth": {
            "product_name": "Bikaner Local Sev Bhujia",
            "serving_size_g": 50.0,
            "per_100g": None,
            "ingredients": ["Besan", "Oil", "Mirch", "Namak"],
            "sugar_sources": [],
            "fat_sources": ["Oil"],
            "allergens_declared": None,
            "fssai_license_present": False,
            "veg_nonveg_mark": "none",
            "claims": ["Desi Swaad"],
            "expiry_or_best_before_present": True,
            "confidence": 0.70,
            "unreadable_fields": ["nutrition_table", "fssai_number"]
        }
    },
    {
        "id": "street_packaged_khakhra_no_fssai",
        "category": "regulatory_fail",
        "expected_grade": "RED",
        "expected_flags": ["nutrition_table_missing_or_incomplete", "fssai_license_missing"],
        "ground_truth": {
            "product_name": "Gujarati Masala Khakhra Handcrafted",
            "serving_size_g": 40.0,
            "per_100g": None,
            "ingredients": ["Whole Wheat Flour", "Peanut Oil", "Turmeric", "Ajwain", "Salt"],
            "sugar_sources": [],
            "fat_sources": ["Peanut Oil"],
            "allergens_declared": ["Contains Wheat and Peanuts"],
            "fssai_license_present": False,
            "veg_nonveg_mark": "green",
            "claims": ["Crispy Roasted", "Healthy Snack"],
            "expiry_or_best_before_present": True,
            "confidence": 0.85,
            "unreadable_fields": ["per_100g_table", "fssai_license"]
        }
    }
]


def seed(target_dir: Path):
    target_dir.mkdir(parents=True, exist_ok=True)
    for sample in SAMPLES:
        path = target_dir / f"{sample['id']}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(sample, f, indent=2)
    print(f"Successfully seeded {len(SAMPLES)} golden label samples to {target_dir}")


if __name__ == "__main__":
    base = Path(__file__).resolve().parent.parent
    fixtures_path = base / "apps" / "api" / "tests" / "fixtures" / "golden_samples"
    seed(fixtures_path)
