import React, { useState, useRef } from 'react';
import {
  Trophy,
  Swords,
  Sparkles,
  Scale,
  Upload,
  Barcode,
  Edit3,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Plus,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ScoreGauge from './ScoreGauge';
import RedFlagsList from './RedFlagsList';
import { analyzeImage, lookupBarcode, recalculateScore } from '../services/api';

const BATTLE_PRESETS = [
  {
    id: 'battle_breakfast',
    title: 'Breakfast Cereals',
    productA: {
      name: 'Organic Nut & Seed Muesli',
      score: {
        value: 84,
        grade: 'GREEN',
        grade_description: 'Healthier choice with clean ingredients.',
        breakdown: { base_score: 100, rule_penalties: 0, nutrient_adjustments: -16 },
      },
      per_100g: {
        energy_kcal: 410,
        protein_g: 14.5,
        carbohydrate_g: 62.0,
        total_sugar_g: 4.5,
        added_sugar_g: 0.0,
        total_fat_g: 11.2,
        saturated_fat_g: 1.8,
        trans_fat_g: 0.0,
        sodium_mg: 15.0,
        fibre_g: 9.8,
      },
      red_flags: [],
    },
    productB: {
      name: 'Choco Crunch Morning Cereal',
      score: {
        value: 28,
        grade: 'RED',
        grade_description: 'High risk; excessive sugar & maltodextrin.',
        breakdown: { base_score: 100, rule_penalties: -40, nutrient_adjustments: -32 },
      },
      per_100g: {
        energy_kcal: 435,
        protein_g: 5.2,
        carbohydrate_g: 81.0,
        total_sugar_g: 35.0,
        added_sugar_g: 32.0,
        total_fat_g: 8.5,
        saturated_fat_g: 4.8,
        trans_fat_g: 0.1,
        sodium_mg: 480.0,
        fibre_g: 2.1,
      },
      red_flags: [
        { id: 'sugar_in_first_three', title: 'Sugar Among First 3 Ingredients', severity: 'HIGH', category: 'sugar', penalty: 20 },
        { id: 'hidden_sugar', title: 'Hidden Sugar: Maltodextrin & Liquid Glucose', severity: 'HIGH', category: 'sugar', penalty: 15 },
        { id: 'excess_sugar', title: 'High Added Sugar (>30g per 100g)', severity: 'CRITICAL', category: 'sugar', penalty: 25 },
      ],
    },
  },
  {
    id: 'battle_biscuits',
    title: 'Tea-Time Biscuits',
    productA: {
      name: 'Roasted Seed Digestive Crackers',
      score: {
        value: 78,
        grade: 'GREEN',
        grade_description: 'Good fibre, low added sugar.',
        breakdown: { base_score: 100, rule_penalties: 0, nutrient_adjustments: -22 },
      },
      per_100g: {
        energy_kcal: 445,
        protein_g: 11.0,
        carbohydrate_g: 64.0,
        total_sugar_g: 6.0,
        added_sugar_g: 4.5,
        total_fat_g: 15.0,
        saturated_fat_g: 2.5,
        trans_fat_g: 0.0,
        sodium_mg: 290.0,
        fibre_g: 8.2,
      },
      red_flags: [],
    },
    productB: {
      name: 'Cream Filled Choco Cookies',
      score: {
        value: 31,
        grade: 'RED',
        grade_description: 'High saturated fat and refined sugar.',
        breakdown: { base_score: 100, rule_penalties: -35, nutrient_adjustments: -34 },
      },
      per_100g: {
        energy_kcal: 512,
        protein_g: 4.8,
        carbohydrate_g: 69.5,
        total_sugar_g: 38.0,
        added_sugar_g: 36.0,
        total_fat_g: 24.0,
        saturated_fat_g: 12.5,
        trans_fat_g: 0.2,
        sodium_mg: 340.0,
        fibre_g: 1.4,
      },
      red_flags: [
        { id: 'sugar_first_three', title: 'Sugar in First 3 Ingredients', severity: 'HIGH', category: 'sugar', penalty: 20 },
        { id: 'high_sat_fat', title: 'High Saturated Fat (Palmolein)', severity: 'HIGH', category: 'fats', penalty: 15 },
        { id: 'invert_syrup', title: 'Invert Sugar Syrup Detected', severity: 'MEDIUM', category: 'sugar', penalty: 10 },
      ],
    },
  },
  {
    id: 'battle_noodles',
    title: 'Instant Noodles',
    productA: {
      name: 'Whole Wheat & Oats Masala Noodles',
      score: {
        value: 68,
        grade: 'AMBER',
        grade_description: 'Moderate salt, but whole grain fibre.',
        breakdown: { base_score: 100, rule_penalties: -10, nutrient_adjustments: -22 },
      },
      per_100g: {
        energy_kcal: 395,
        protein_g: 10.5,
        carbohydrate_g: 66.0,
        total_sugar_g: 2.0,
        added_sugar_g: 1.0,
        total_fat_g: 9.5,
        saturated_fat_g: 3.2,
        trans_fat_g: 0.0,
        sodium_mg: 780.0,
        fibre_g: 6.5,
      },
      red_flags: [
        { id: 'high_sodium', title: 'Elevated Sodium Content', severity: 'MEDIUM', category: 'minerals', penalty: 10 },
      ],
    },
    productB: {
      name: 'Classic Fried Maida Instant Noodles',
      score: {
        value: 38,
        grade: 'RED',
        grade_description: 'High sodium and palm oil saturated fat.',
        breakdown: { base_score: 100, rule_penalties: -30, nutrient_adjustments: -32 },
      },
      per_100g: {
        energy_kcal: 440,
        protein_g: 7.8,
        carbohydrate_g: 63.0,
        total_sugar_g: 2.4,
        added_sugar_g: 1.5,
        total_fat_g: 17.5,
        saturated_fat_g: 8.5,
        trans_fat_g: 0.15,
        sodium_mg: 1280.0,
        fibre_g: 3.2,
      },
      red_flags: [
        { id: 'excess_sodium', title: 'Excessive Sodium (> 1200mg/100g)', severity: 'HIGH', category: 'minerals', penalty: 20 },
        { id: 'high_sat_fat', title: 'High Saturated Fat (Palm Oil)', severity: 'HIGH', category: 'fats', penalty: 15 },
      ],
    },
  },
];

const QUICK_FMCG_OPTIONS = [
  { barcode: '8901030383709', name: 'Maggi Masala Noodles' },
  { barcode: '8901063012829', name: 'Good Day Cashew Cookies' },
  { barcode: '8901725181222', name: 'Parle-G Gluco Biscuits' },
  { barcode: '8901262010025', name: 'Amul Butter' },
  { barcode: '8901499008503', name: "Lay's Magic Masala Chips" },
  { barcode: '8901725132514', name: 'Real Mixed Fruit Juice' },
];

const SAMPLE_PRESETS_OPTIONS = [
  { id: 'healthy_protein_muesli', name: 'Protein Seed Muesli' },
  { id: 'choco_crunch_biscuits', name: 'Choco Crunch Biscuits' },
  { id: 'misleading_diet_drink', name: 'Zero Sugar Diet Fizzy' },
  { id: 'missing_table_snack', name: 'Local Haldiram Snack' },
];

export default function ProductComparison({ liveAnalysisA, liveAnalysisB }) {
  const { t } = useLanguage();
  const [selectedBattle, setSelectedBattle] = useState(BATTLE_PRESETS[0]);

  // Product Slot States
  const [slotA, setSlotA] = useState(() => {
    if (liveAnalysisA) {
      return {
        name: liveAnalysisA.product_name,
        score: liveAnalysisA.score,
        per_100g: liveAnalysisA.extraction.per_100g,
        red_flags: liveAnalysisA.red_flags,
        extraction: liveAnalysisA.extraction,
      };
    }
    return BATTLE_PRESETS[0].productA;
  });

  const [slotB, setSlotB] = useState(() => {
    if (liveAnalysisB) {
      return {
        name: liveAnalysisB.product_name,
        score: liveAnalysisB.score,
        per_100g: liveAnalysisB.extraction.per_100g,
        red_flags: liveAnalysisB.red_flags,
        extraction: liveAnalysisB.extraction,
      };
    }
    return BATTLE_PRESETS[0].productB;
  });

  const [loadingSlot, setLoadingSlot] = useState(null); // 'A' | 'B' | null
  const [errorSlot, setErrorSlot] = useState({ slot: null, message: '' });

  // Custom Product Manual Form Modal State
  const [customModalTarget, setCustomModalTarget] = useState(null); // 'A' | 'B' | null
  const [customForm, setCustomForm] = useState({
    product_name: '',
    energy_kcal: 400,
    protein_g: 8,
    carbohydrate_g: 60,
    total_sugar_g: 10,
    added_sugar_g: 5,
    total_fat_g: 12,
    saturated_fat_g: 3,
    trans_fat_g: 0,
    sodium_mg: 300,
    fibre_g: 4,
    ingredients_raw: 'Wheat flour, sugar, vegetable oil, salt',
  });

  // Barcode Dropdown/Input state
  const [barcodeTarget, setBarcodeTarget] = useState(null); // 'A' | 'B' | null
  const [customBarcodeInput, setCustomBarcodeInput] = useState('');

  const fileInputRefA = useRef(null);
  const fileInputRefB = useRef(null);

  // Switch battle preset
  const handleSelectPresetBattle = (battle) => {
    setSelectedBattle(battle);
    setSlotA(battle.productA);
    setSlotB(battle.productB);
    setErrorSlot({ slot: null, message: '' });
  };

  // Helper to format analysis result into slot product
  const formatResultToSlot = (analysis) => ({
    name: analysis.product_name,
    score: analysis.score,
    per_100g: analysis.extraction.per_100g,
    red_flags: analysis.red_flags,
    extraction: analysis.extraction,
  });

  // Handle Photo Upload for Slot A or B
  const handleFileUpload = async (event, targetSlot) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingSlot(targetSlot);
    setErrorSlot({ slot: null, message: '' });
    try {
      const result = await analyzeImage(file);
      const formatted = formatResultToSlot(result);
      if (targetSlot === 'A') setSlotA(formatted);
      else setSlotB(formatted);
    } catch (err) {
      setErrorSlot({ slot: targetSlot, message: err.message || 'Analysis failed.' });
    } finally {
      setLoadingSlot(null);
      event.target.value = '';
    }
  };

  // Handle Preset Sample Selection for Slot A or B
  const handleSamplePresetSelect = async (presetId, targetSlot) => {
    setLoadingSlot(targetSlot);
    setErrorSlot({ slot: null, message: '' });
    try {
      const result = await analyzeImage(null, presetId);
      const formatted = formatResultToSlot(result);
      if (targetSlot === 'A') setSlotA(formatted);
      else setSlotB(formatted);
    } catch (err) {
      setErrorSlot({ slot: targetSlot, message: err.message || 'Sample load failed.' });
    } finally {
      setLoadingSlot(null);
    }
  };

  // Handle Barcode Lookup for Slot A or B
  const handleBarcodeSelect = async (barcode, targetSlot) => {
    if (!barcode) return;
    setLoadingSlot(targetSlot);
    setErrorSlot({ slot: null, message: '' });
    setBarcodeTarget(null);
    try {
      const result = await lookupBarcode(barcode);
      const formatted = formatResultToSlot(result);
      if (targetSlot === 'A') setSlotA(formatted);
      else setSlotB(formatted);
    } catch (err) {
      setErrorSlot({ slot: targetSlot, message: err.message || 'Barcode lookup failed.' });
    } finally {
      setLoadingSlot(null);
      setCustomBarcodeInput('');
    }
  };

  // Handle Custom Entry Evaluation via /api/score
  const handleCustomFormSubmit = async (e) => {
    e.preventDefault();
    if (!customModalTarget) return;

    setLoadingSlot(customModalTarget);
    try {
      const extraction = {
        product_name: customForm.product_name || `Custom Product ${customModalTarget}`,
        serving_size_g: 100,
        per_100g: {
          energy_kcal: Number(customForm.energy_kcal) || 0,
          protein_g: Number(customForm.protein_g) || 0,
          carbohydrate_g: Number(customForm.carbohydrate_g) || 0,
          total_sugar_g: Number(customForm.total_sugar_g) || 0,
          added_sugar_g: Number(customForm.added_sugar_g) || 0,
          total_fat_g: Number(customForm.total_fat_g) || 0,
          saturated_fat_g: Number(customForm.saturated_fat_g) || 0,
          trans_fat_g: Number(customForm.trans_fat_g) || 0,
          sodium_mg: Number(customForm.sodium_mg) || 0,
          fibre_g: Number(customForm.fibre_g) || 0,
        },
        ingredients: customForm.ingredients_raw.split(',').map((s) => s.trim()).filter(Boolean),
        sugar_sources: [],
        fat_sources: [],
        allergens_declared: [],
        fssai_license_present: true,
        veg_nonveg_mark: 'green',
        claims: [],
        expiry_or_best_before_present: true,
        confidence: 1.0,
        unreadable_fields: [],
      };

      const result = await recalculateScore(extraction);
      const formatted = formatResultToSlot(result);
      if (customModalTarget === 'A') setSlotA(formatted);
      else setSlotB(formatted);
      setCustomModalTarget(null);
    } catch (err) {
      setErrorSlot({ slot: customModalTarget, message: err.message || 'Evaluation failed.' });
    } finally {
      setLoadingSlot(null);
    }
  };

  const scoreA = slotA?.score?.value ?? 0;
  const scoreB = slotB?.score?.value ?? 0;
  const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'TIE';

  const nutrients = [
    { key: 'energy_kcal', label: t('nutrient_energy'), unit: 'kcal', lowerIsBetter: true },
    { key: 'protein_g', label: t('nutrient_protein'), unit: 'g', lowerIsBetter: false },
    { key: 'carbohydrate_g', label: t('nutrient_carbs'), unit: 'g', lowerIsBetter: true },
    { key: 'total_sugar_g', label: t('nutrient_total_sugar'), unit: 'g', lowerIsBetter: true },
    { key: 'added_sugar_g', label: t('nutrient_added_sugar'), unit: 'g', lowerIsBetter: true },
    { key: 'total_fat_g', label: t('nutrient_total_fat'), unit: 'g', lowerIsBetter: true },
    { key: 'saturated_fat_g', label: t('nutrient_sat_fat'), unit: 'g', lowerIsBetter: true },
    { key: 'trans_fat_g', label: t('nutrient_trans_fat'), unit: 'g', lowerIsBetter: true },
    { key: 'sodium_mg', label: t('nutrient_sodium'), unit: 'mg', lowerIsBetter: true },
    { key: 'fibre_g', label: t('nutrient_fibre'), unit: 'g', lowerIsBetter: false },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRefA}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => handleFileUpload(e, 'A')}
      />
      <input
        type="file"
        ref={fileInputRefB}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => handleFileUpload(e, 'B')}
      />

      {/* Header & Quick Battle Presets */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '24px',
          background: 'rgba(168, 85, 247, 0.12)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          color: '#c084fc',
          fontSize: '0.82rem',
          fontWeight: 700,
          marginBottom: '14px',
        }}>
          <Swords size={16} />
          {t('compare_title')}
        </div>

        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 10px 0' }}>
          {t('compare_desc')}
        </h2>

        {/* Preset Battles Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          marginTop: '16px',
        }}>
          {BATTLE_PRESETS.map((battle) => {
            const isSelected = selectedBattle.id === battle.id;
            return (
              <button
                key={battle.id}
                onClick={() => handleSelectPresetBattle(battle)}
                style={{
                  background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  borderRadius: '20px',
                  padding: '8px 18px',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <Sparkles size={14} color={isSelected ? 'var(--accent-cyan)' : '#94a3b8'} />
                {battle.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Winner Hero Banner */}
      <div className="card glass-panel" style={{
        padding: '20px 24px',
        marginBottom: '28px',
        border: winner === 'TIE' ? '1px solid var(--border-subtle)' : '1px solid rgba(16, 185, 129, 0.4)',
        background: winner === 'TIE' ? 'rgba(30, 41, 59, 0.6)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: winner === 'TIE' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            padding: '12px',
            borderRadius: '12px',
            color: winner === 'TIE' ? '#94a3b8' : 'var(--accent-green)',
          }}>
            <Trophy size={28} />
          </div>
          <div>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: winner === 'TIE' ? '#94a3b8' : 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              {t('winner_badge')}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              {winner === 'A' ? slotA?.name : winner === 'B' ? slotB?.name : t('winner_tie')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Score Advantage: </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-green)' }}>
              +{Math.abs(scoreA - scoreB)} points
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Product Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
      }}>
        {/* ================= SLOT A ================= */}
        <div className="card glass-panel" style={{
          border: winner === 'A' ? '2px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
        }}>
          {/* Header pill & Winner badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: 'var(--accent-cyan)',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}>
              {t('product_a')}
            </span>
            {winner === 'A' && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: 'var(--accent-green)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Trophy size={13} /> {t('winner_badge')}
              </span>
            )}
          </div>

          {/* Slot Action Bar (Upload Photo | Barcode | Presets | Custom) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            padding: '10px 12px',
            marginBottom: '18px',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              {t('choose_product')} (A):
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => fileInputRefA.current?.click()}
                disabled={loadingSlot === 'A'}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: 'var(--accent-cyan)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Upload size={12} /> {t('upload_photo')}
              </button>

              <button
                onClick={() => setBarcodeTarget(barcodeTarget === 'A' ? null : 'A')}
                disabled={loadingSlot === 'A'}
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Barcode size={12} /> {t('scan_barcode')}
              </button>

              <button
                onClick={() => {
                  setCustomModalTarget('A');
                  setCustomForm({
                    product_name: slotA?.name || 'Custom Product A',
                    energy_kcal: slotA?.per_100g?.energy_kcal || 400,
                    protein_g: slotA?.per_100g?.protein_g || 8,
                    carbohydrate_g: slotA?.per_100g?.carbohydrate_g || 60,
                    total_sugar_g: slotA?.per_100g?.total_sugar_g || 10,
                    added_sugar_g: slotA?.per_100g?.added_sugar_g || 5,
                    total_fat_g: slotA?.per_100g?.total_fat_g || 12,
                    saturated_fat_g: slotA?.per_100g?.saturated_fat_g || 3,
                    trans_fat_g: slotA?.per_100g?.trans_fat_g || 0,
                    sodium_mg: slotA?.per_100g?.sodium_mg || 300,
                    fibre_g: slotA?.per_100g?.fibre_g || 4,
                    ingredients_raw: slotA?.extraction?.ingredients?.join(', ') || 'Wheat flour, sugar, salt',
                  });
                }}
                disabled={loadingSlot === 'A'}
                style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  color: '#facc15',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Edit3 size={12} /> {t('manual_entry')}
              </button>
            </div>

            {/* Barcode Quick Picker Dropdown for Slot A */}
            {barcodeTarget === 'A' && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                background: 'rgba(30, 41, 59, 0.9)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Select Popular Indian Brand:
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {QUICK_FMCG_OPTIONS.map((fmcg) => (
                    <button
                      key={fmcg.barcode}
                      onClick={() => handleBarcodeSelect(fmcg.barcode, 'A')}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#e2e8f0',
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {fmcg.name}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Or enter EAN barcode..."
                    value={customBarcodeInput}
                    onChange={(e) => setCustomBarcodeInput(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                    }}
                  />
                  <button
                    onClick={() => handleBarcodeSelect(customBarcodeInput, 'A')}
                    disabled={!customBarcodeInput.trim()}
                    style={{
                      background: 'var(--accent-cyan)',
                      color: '#0f172a',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Go
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Slot Loading / Error Notice */}
          {loadingSlot === 'A' && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'rgba(56, 189, 248, 0.1)',
              borderRadius: '12px',
              marginBottom: '16px',
              color: 'var(--accent-cyan)',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              <RefreshCw size={16} className="spin" /> {t('analyzing')}
            </div>
          )}

          {errorSlot.slot === 'A' && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '16px',
            }}>
              {errorSlot.message}
            </div>
          )}

          {/* Product Name */}
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '18px', color: '#f8fafc' }}>
            {slotA?.name || 'Product A'}
          </h3>

          {/* Score Gauge & Red Flags */}
          {slotA?.score && <ScoreGauge score={slotA.score} />}
          <div style={{ marginTop: '20px' }}>
            <RedFlagsList redFlags={slotA?.red_flags || []} />
          </div>
        </div>

        {/* ================= SLOT B ================= */}
        <div className="card glass-panel" style={{
          border: winner === 'B' ? '2px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
        }}>
          {/* Header pill & Winner badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#fb7185',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}>
              {t('product_b')}
            </span>
            {winner === 'B' && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: 'var(--accent-green)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Trophy size={13} /> {t('winner_badge')}
              </span>
            )}
          </div>

          {/* Slot Action Bar (Upload Photo | Barcode | Presets | Custom) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            padding: '10px 12px',
            marginBottom: '18px',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              {t('choose_product')} (B):
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => fileInputRefB.current?.click()}
                disabled={loadingSlot === 'B'}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: 'var(--accent-cyan)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Upload size={12} /> {t('upload_photo')}
              </button>

              <button
                onClick={() => setBarcodeTarget(barcodeTarget === 'B' ? null : 'B')}
                disabled={loadingSlot === 'B'}
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Barcode size={12} /> {t('scan_barcode')}
              </button>

              <button
                onClick={() => {
                  setCustomModalTarget('B');
                  setCustomForm({
                    product_name: slotB?.name || 'Custom Product B',
                    energy_kcal: slotB?.per_100g?.energy_kcal || 400,
                    protein_g: slotB?.per_100g?.protein_g || 8,
                    carbohydrate_g: slotB?.per_100g?.carbohydrate_g || 60,
                    total_sugar_g: slotB?.per_100g?.total_sugar_g || 10,
                    added_sugar_g: slotB?.per_100g?.added_sugar_g || 5,
                    total_fat_g: slotB?.per_100g?.total_fat_g || 12,
                    saturated_fat_g: slotB?.per_100g?.saturated_fat_g || 3,
                    trans_fat_g: slotB?.per_100g?.trans_fat_g || 0,
                    sodium_mg: slotB?.per_100g?.sodium_mg || 300,
                    fibre_g: slotB?.per_100g?.fibre_g || 4,
                    ingredients_raw: slotB?.extraction?.ingredients?.join(', ') || 'Wheat flour, sugar, salt',
                  });
                }}
                disabled={loadingSlot === 'B'}
                style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  color: '#facc15',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Edit3 size={12} /> {t('manual_entry')}
              </button>
            </div>

            {/* Barcode Quick Picker Dropdown for Slot B */}
            {barcodeTarget === 'B' && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                background: 'rgba(30, 41, 59, 0.9)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Select Popular Indian Brand:
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {QUICK_FMCG_OPTIONS.map((fmcg) => (
                    <button
                      key={fmcg.barcode}
                      onClick={() => handleBarcodeSelect(fmcg.barcode, 'B')}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#e2e8f0',
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {fmcg.name}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Or enter EAN barcode..."
                    value={customBarcodeInput}
                    onChange={(e) => setCustomBarcodeInput(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                    }}
                  />
                  <button
                    onClick={() => handleBarcodeSelect(customBarcodeInput, 'B')}
                    disabled={!customBarcodeInput.trim()}
                    style={{
                      background: 'var(--accent-cyan)',
                      color: '#0f172a',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Go
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Slot Loading / Error Notice */}
          {loadingSlot === 'B' && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'rgba(56, 189, 248, 0.1)',
              borderRadius: '12px',
              marginBottom: '16px',
              color: 'var(--accent-cyan)',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              <RefreshCw size={16} className="spin" /> {t('analyzing')}
            </div>
          )}

          {errorSlot.slot === 'B' && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '16px',
            }}>
              {errorSlot.message}
            </div>
          )}

          {/* Product Name */}
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '18px', color: '#f8fafc' }}>
            {slotB?.name || 'Product B'}
          </h3>

          {/* Score Gauge & Red Flags */}
          {slotB?.score && <ScoreGauge score={slotB.score} />}
          <div style={{ marginTop: '20px' }}>
            <RedFlagsList redFlags={slotB?.red_flags || []} />
          </div>
        </div>
      </div>

      {/* Head-to-Head Nutritional Comparison Table */}
      <div className="card glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Scale size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
            {t('comparison_summary')} (per 100g)
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 14px' }}>Nutrient</th>
                <th style={{ padding: '12px 14px' }}>{slotA?.name || 'Product A'}</th>
                <th style={{ padding: '12px 14px' }}>{slotB?.name || 'Product B'}</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Better Choice</th>
              </tr>
            </thead>
            <tbody>
              {nutrients.map((n) => {
                const valA = slotA?.per_100g ? slotA.per_100g[n.key] : null;
                const valB = slotB?.per_100g ? slotB.per_100g[n.key] : null;

                let better = null;
                if (valA !== null && valA !== undefined && valB !== null && valB !== undefined) {
                  if (n.lowerIsBetter) {
                    better = valA < valB ? 'A' : valB < valA ? 'B' : 'EQUAL';
                  } else {
                    better = valA > valB ? 'A' : valB > valA ? 'B' : 'EQUAL';
                  }
                }

                return (
                  <tr key={n.key} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#e2e8f0' }}>
                      {n.label}
                    </td>
                    <td style={{
                      padding: '12px 14px',
                      color: better === 'A' ? 'var(--accent-green)' : '#cbd5e1',
                      fontWeight: better === 'A' ? 700 : 400,
                    }}>
                      {valA !== null && valA !== undefined ? `${valA} ${n.unit}` : 'N/A'}
                    </td>
                    <td style={{
                      padding: '12px 14px',
                      color: better === 'B' ? 'var(--accent-green)' : '#cbd5e1',
                      fontWeight: better === 'B' ? 700 : 400,
                    }}>
                      {valB !== null && valB !== undefined ? `${valB} ${n.unit}` : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {better === 'A' ? (
                        <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>✓ {(slotA?.name || 'A').slice(0, 16)}</span>
                      ) : better === 'B' ? (
                        <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>✓ {(slotB?.name || 'B').slice(0, 16)}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Equal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Product Manual Entry Modal */}
      {customModalTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '28px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {t('custom_modal_title')} ({customModalTarget})
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  {t('custom_modal_desc')}
                </p>
              </div>
              <button
                onClick={() => setCustomModalTarget(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCustomFormSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={customForm.product_name}
                  onChange={(e) => setCustomForm({ ...customForm, product_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Total Sugar (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={customForm.total_sugar_g}
                    onChange={(e) => setCustomForm({ ...customForm, total_sugar_g: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Added Sugar (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={customForm.added_sugar_g}
                    onChange={(e) => setCustomForm({ ...customForm, added_sugar_g: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Saturated Fat (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={customForm.saturated_fat_g}
                    onChange={(e) => setCustomForm({ ...customForm, saturated_fat_g: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Trans Fat (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customForm.trans_fat_g}
                    onChange={(e) => setCustomForm({ ...customForm, trans_fat_g: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Sodium (mg/100g)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={customForm.sodium_mg}
                    onChange={(e) => setCustomForm({ ...customForm, sodium_mg: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Protein (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={customForm.protein_g}
                    onChange={(e) => setCustomForm({ ...customForm, protein_g: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Dietary Fibre (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={customForm.fibre_g}
                    onChange={(e) => setCustomForm({ ...customForm, fibre_g: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Energy (kcal/100g)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={customForm.energy_kcal}
                    onChange={(e) => setCustomForm({ ...customForm, energy_kcal: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Ingredients (comma-separated for FSSAI red flag checks)
                </label>
                <textarea
                  rows="2"
                  value={customForm.ingredients_raw}
                  onChange={(e) => setCustomForm({ ...customForm, ingredients_raw: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCustomModalTarget(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSlot !== null}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: 'var(--accent-cyan)',
                    color: '#0f172a',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('calculate_and_compare')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
