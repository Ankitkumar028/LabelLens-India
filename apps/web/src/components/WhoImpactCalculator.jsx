import React, { useState } from 'react';
import { Sliders, AlertCircle, CheckCircle2, AlertTriangle, Info, HeartPulse } from 'lucide-react';

const WHO_BENCHMARKS = [
  {
    key: 'sodium',
    name: 'Sodium',
    whoDailyLimit: 2000,
    unit: 'mg',
    whoSource: 'WHO Guideline 2012 (Max 2,000 mg / ~5g salt per day)',
    type: 'limit',
    getVal: (n) => n?.sodium_mg,
  },
  {
    key: 'sugar',
    name: 'Added / Free Sugars',
    whoDailyLimit: 50,
    unit: 'g',
    whoSource: 'WHO Guideline 2015 (Max 50g / <10% daily caloric intake)',
    type: 'limit',
    getVal: (n) => (n?.added_sugar_g !== undefined && n?.added_sugar_g !== null) ? n.added_sugar_g : ((n?.total_sugar_g !== undefined && n?.total_sugar_g !== null) ? n.total_sugar_g : n?.sugars_g),
  },
  {
    key: 'saturated_fat',
    name: 'Saturated Fat',
    whoDailyLimit: 22,
    unit: 'g',
    whoSource: 'WHO Healthy Diet Fact Sheet (<10% total calories ~22g)',
    type: 'limit',
    getVal: (n) => n?.saturated_fat_g,
  },
  {
    key: 'fiber',
    name: 'Dietary Fibre',
    whoDailyLimit: 25,
    unit: 'g',
    whoSource: 'WHO / FSSAI RDA Target (Min 25g/day for digestive health)',
    type: 'target',
    getVal: (n) => (n?.fibre_g !== undefined && n?.fibre_g !== null) ? n.fibre_g : n?.fiber_g,
  },
];

export default function WhoImpactCalculator({ extraction, servingSizeG = 30 }) {
  const [portion, setPortion] = useState(servingSizeG || 30);

  if (!extraction) return null;

  // Check if non-food image
  const isNonFood =
    extraction?.unreadable_fields?.includes('not_a_food_label') ||
    (extraction?.confidence === 0 && !extraction?.per_100g && !extraction?.nutrients_per_100g && (!extraction?.ingredients || extraction?.ingredients.length === 0));

  if (isNonFood) {
    return (
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <HeartPulse size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                Interactive WHO Daily Intake Calculator
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Evaluate real-world impact against World Health Organization healthy diet benchmarks.
              </p>
            </div>
          </div>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            color: '#f87171',
            fontWeight: 600,
          }}>
            Non-Food Image
          </div>
        </div>

        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '14px',
          padding: '28px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <AlertTriangle size={36} color="#ef4444" />
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
            Non-Food Image Detected — WHO Impact Calculation Unavailable
          </h4>
          <p style={{ fontSize: '0.84rem', color: '#fca5a5', maxWidth: '520px', lineHeight: 1.5 }}>
            The uploaded image does not contain a packaged food nutritional table or ingredients list. World Health Organization (WHO) intake benchmarks cannot be evaluated for non-food images or hand photos.
          </p>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Please upload a clear photograph of packaged food nutrition facts.
          </span>
        </div>
      </div>
    );
  }

  const nutrients = extraction?.per_100g || extraction?.nutrients_per_100g || {};
  const hasAnyNutrient = Object.values(nutrients).some((v) => typeof v === 'number' && !isNaN(v));

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <HeartPulse size={20} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
              Interactive WHO Daily Intake Calculator
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Evaluate real-world impact against World Health Organization healthy diet benchmarks.
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '0.75rem',
          color: '#34d399',
          fontWeight: 600,
        }}>
          WHO Standard Reference
        </div>
      </div>

      {!hasAnyNutrient && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '18px',
          fontSize: '0.82rem',
          color: '#fcd34d',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>
            Nutritional information table was not detected on this packaging view. Nutrient benchmarks are shown as not declared.
          </span>
        </div>
      )}

      {/* Interactive Portion Slider */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
              Selected Serving Size:
            </span>
          </div>
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            color: 'var(--accent-cyan)',
            fontFamily: 'monospace',
          }}>
            {portion} grams
          </span>
        </div>

        <input
          type="range"
          min="5"
          max="150"
          step="5"
          value={portion}
          onChange={(e) => setPortion(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            background: 'linear-gradient(90deg, #38bdf8, #10b981)',
            borderRadius: '6px',
            outline: 'none',
            cursor: 'pointer',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span>Snack Bite (15g)</span>
          <span>Standard Pack ({servingSizeG || 30}g)</span>
          <span>Full Share Bag (100g)</span>
          <span>Double (150g)</span>
        </div>
      </div>

      {/* Nutrient Impact Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {WHO_BENCHMARKS.map((benchmark) => {
          const rawVal = benchmark.getVal(nutrients);
          const isDeclared = rawVal !== undefined && rawVal !== null && !isNaN(rawVal);
          const valPer100g = isDeclared ? Number(rawVal) : 0;
          const portionVal = (valPer100g * portion) / 100;
          const percentOfDaily = Math.round((portionVal / benchmark.whoDailyLimit) * 100);

          let statusColor = '#10b981';
          let statusText = 'Safe';
          if (!isDeclared) {
            statusColor = '#94a3b8';
            statusText = 'Not Declared';
          } else if (benchmark.type === 'limit') {
            if (percentOfDaily > 35) {
              statusColor = '#ef4444';
              statusText = 'Heavy Portion!';
            } else if (percentOfDaily > 20) {
              statusColor = '#f59e0b';
              statusText = 'Moderate';
            }
          } else {
            // target (fibre)
            if (percentOfDaily >= 20) {
              statusColor = '#10b981';
              statusText = 'Good Source';
            } else {
              statusColor = '#94a3b8';
              statusText = 'Low Fibre';
            }
          }

          return (
            <div
              key={benchmark.key}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                    {benchmark.name}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: statusColor,
                    background: `${statusColor}18`,
                    border: `1px solid ${statusColor}35`,
                    borderRadius: '8px',
                    padding: '2px 7px',
                  }}>
                    {statusText}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                  {isDeclared ? (
                    <>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                        {portionVal < 10 ? portionVal.toFixed(1) : Math.round(portionVal)}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '3px' }}>
                          {benchmark.unit}
                        </span>
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        ({percentOfDaily}% of WHO Daily Limit)
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Not declared on label
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    width: isDeclared ? `${Math.min(percentOfDaily, 100)}%` : '0%',
                    height: '100%',
                    background: statusColor,
                    transition: 'width 0.2s ease',
                  }} />
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={11} />
                <span>{benchmark.whoSource}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
