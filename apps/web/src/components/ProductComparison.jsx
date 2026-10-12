import React, { useState } from 'react';
import { Trophy, Swords, ArrowRight, AlertTriangle, CheckCircle, Sparkles, Scale, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ScoreGauge from './ScoreGauge';
import RedFlagsList from './RedFlagsList';

const BATTLE_PRESETS = [
  {
    id: 'battle_breakfast',
    title: 'Breakfast Cereals',
    productA: {
      name: 'Organic Nut & Seed Muesli',
      score: { value: 84, grade: 'GREEN', grade_description: 'Healthier choice with clean ingredients.' },
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
      score: { value: 28, grade: 'RED', grade_description: 'High risk; excessive sugar & maltodextrin.' },
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
        { id: 'sugar_in_first_three', title: 'Sugar Among First 3 Ingredients', severity: 'HIGH', category: 'sugar' },
        { id: 'hidden_sugar', title: 'Hidden Sugar: Maltodextrin & Liquid Glucose', severity: 'HIGH', category: 'sugar' },
        { id: 'excess_sugar', title: 'High Added Sugar (>30g per 100g)', severity: 'CRITICAL', category: 'sugar' },
      ],
    },
  },
  {
    id: 'battle_biscuits',
    title: 'Tea-Time Biscuits',
    productA: {
      name: 'Roasted Seed Digestive Crackers',
      score: { value: 78, grade: 'GREEN', grade_description: 'Good fibre, low added sugar.' },
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
      score: { value: 31, grade: 'RED', grade_description: 'High saturated fat and refined sugar.' },
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
        { id: 'sugar_first_three', title: 'Sugar in First 3 Ingredients', severity: 'HIGH', category: 'sugar' },
        { id: 'high_sat_fat', title: 'High Saturated Fat (Palmolein)', severity: 'HIGH', category: 'fats' },
        { id: 'invert_syrup', title: 'Invert Sugar Syrup Detected', severity: 'MEDIUM', category: 'sugar' },
      ],
    },
  },
  {
    id: 'battle_noodles',
    title: 'Instant Noodles',
    productA: {
      name: 'Whole Wheat & Oats Masala Noodles',
      score: { value: 68, grade: 'AMBER', grade_description: 'Moderate salt, but whole grain fibre.' },
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
        { id: 'high_sodium', title: 'Elevated Sodium Content', severity: 'MEDIUM', category: 'minerals' },
      ],
    },
    productB: {
      name: 'Classic Fried Maida Instant Noodles',
      score: { value: 38, grade: 'RED', grade_description: 'High sodium and palm oil saturated fat.' },
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
        { id: 'excess_sodium', title: 'Excessive Sodium (> 1200mg/100g)', severity: 'HIGH', category: 'minerals' },
        { id: 'high_sat_fat', title: 'High Saturated Fat (Palm Oil)', severity: 'HIGH', category: 'fats' },
      ],
    },
  },
];

export default function ProductComparison({ liveAnalysisA, liveAnalysisB }) {
  const { t } = useLanguage();
  const [selectedBattle, setSelectedBattle] = useState(BATTLE_PRESETS[0]);

  const prodA = liveAnalysisA
    ? {
        name: liveAnalysisA.product_name,
        score: liveAnalysisA.score,
        per_100g: liveAnalysisA.extraction.per_100g,
        red_flags: liveAnalysisA.red_flags,
      }
    : selectedBattle.productA;

  const prodB = liveAnalysisB
    ? {
        name: liveAnalysisB.product_name,
        score: liveAnalysisB.score,
        per_100g: liveAnalysisB.extraction.per_100g,
        red_flags: liveAnalysisB.red_flags,
      }
    : selectedBattle.productB;

  const scoreA = prodA.score.value;
  const scoreB = prodB.score.value;
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
      {/* Comparison Battles Header */}
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

        {/* Preset Battle Buttons */}
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
                onClick={() => setSelectedBattle(battle)}
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
              {winner === 'A' ? prodA.name : winner === 'B' ? prodB.name : t('winner_tie')}
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
        {/* Product A Card */}
        <div className="card glass-panel" style={{
          border: winner === 'A' ? '2px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '18px', color: '#f8fafc' }}>
            {prodA.name}
          </h3>

          <ScoreGauge score={prodA.score} />
          <div style={{ marginTop: '20px' }}>
            <RedFlagsList redFlags={prodA.red_flags} />
          </div>
        </div>

        {/* Product B Card */}
        <div className="card glass-panel" style={{
          border: winner === 'B' ? '2px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '18px', color: '#f8fafc' }}>
            {prodB.name}
          </h3>

          <ScoreGauge score={prodB.score} />
          <div style={{ marginTop: '20px' }}>
            <RedFlagsList redFlags={prodB.red_flags} />
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
                <th style={{ padding: '12px 14px' }}>{prodA.name}</th>
                <th style={{ padding: '12px 14px' }}>{prodB.name}</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Better Choice</th>
              </tr>
            </thead>
            <tbody>
              {nutrients.map((n) => {
                const valA = prodA.per_100g ? prodA.per_100g[n.key] : null;
                const valB = prodB.per_100g ? prodB.per_100g[n.key] : null;

                let better = null;
                if (valA !== null && valB !== null) {
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
                      {valA !== null ? `${valA} ${n.unit}` : 'N/A'}
                    </td>
                    <td style={{
                      padding: '12px 14px',
                      color: better === 'B' ? 'var(--accent-green)' : '#cbd5e1',
                      fontWeight: better === 'B' ? 700 : 400,
                    }}>
                      {valB !== null ? `${valB} ${n.unit}` : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {better === 'A' ? (
                        <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>✓ {prodA.name.slice(0, 15)}...</span>
                      ) : better === 'B' ? (
                        <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>✓ {prodB.name.slice(0, 15)}...</span>
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
    </div>
  );
}
