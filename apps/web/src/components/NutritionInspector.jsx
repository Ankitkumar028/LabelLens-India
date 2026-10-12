import React, { useState, useEffect } from 'react';
import { Table, RefreshCw, CheckCircle, AlertCircle, FileEdit, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function NutritionInspector({ extraction, onRecalculate, isUpdating }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(extraction);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData(extraction);
    setHasChanges(false);
  }, [extraction]);

  const handleNutrientChange = (field, val) => {
    const numVal = val === '' ? null : parseFloat(val);
    setFormData((prev) => ({
      ...prev,
      per_100g: {
        ...(prev.per_100g || {}),
        [field]: numVal,
      },
    }));
    setHasChanges(true);
  };

  const handleRecalculateClick = () => {
    onRecalculate(formData);
    setHasChanges(false);
  };

  const per100g = formData.per_100g || {};

  const nutrientsList = [
    { key: 'energy_kcal', label: t('nutrient_energy'), unit: 'kcal' },
    { key: 'protein_g', label: t('nutrient_protein'), unit: 'g' },
    { key: 'carbohydrate_g', label: t('nutrient_carbs'), unit: 'g' },
    { key: 'total_sugar_g', label: t('nutrient_total_sugar'), unit: 'g' },
    { key: 'added_sugar_g', label: t('nutrient_added_sugar'), unit: 'g' },
    { key: 'total_fat_g', label: t('nutrient_total_fat'), unit: 'g' },
    { key: 'saturated_fat_g', label: t('nutrient_sat_fat'), unit: 'g' },
    { key: 'trans_fat_g', label: t('nutrient_trans_fat'), unit: 'g' },
    { key: 'sodium_mg', label: t('nutrient_sodium'), unit: 'mg' },
    { key: 'fibre_g', label: t('nutrient_fibre'), unit: 'g' },
  ];


  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Table size={20} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            Extracted Label Details
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            (Editable OCR Inspector)
          </span>
        </div>

        {hasChanges && (
          <button
            onClick={handleRecalculateClick}
            disabled={isUpdating}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={isUpdating ? 'spin' : ''} />
            {isUpdating ? 'Recalculating...' : 'Recalculate Score'}
          </button>
        )}
      </div>

      {/* Product Name */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
          Product / Brand Name
        </label>
        <input
          type="text"
          value={formData.product_name || ''}
          onChange={(e) => {
            setFormData({ ...formData, product_name: e.target.value });
            setHasChanges(true);
          }}
          placeholder="Unlabeled Product"
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        />
      </div>

      {/* Per 100g Nutrients Grid */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Per 100g Nutrition Metrics
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '10px',
        }}>
          {nutrientsList.map(({ key, label, unit }) => {
            const val = per100g[key];
            const isNull = val === null || val === undefined;

            return (
              <div
                key={key}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: isNull ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: isNull ? '#ef4444' : 'var(--text-muted)',
                  marginBottom: '4px',
                }}>
                  <span>{label}</span>
                  <span>({unit})</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={isNull ? '' : val}
                  onChange={(e) => handleNutrientChange(key, e.target.value)}
                  placeholder="Not declared"
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: isNull ? '#ef4444' : 'var(--text-primary)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Regulatory Indicators */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
        background: 'rgba(15, 23, 42, 0.4)',
        padding: '14px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
      }}>
        {/* FSSAI License */}
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            FSSAI License
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: formData.fssai_license_present ? '#10b981' : '#ef4444',
          }}>
            {formData.fssai_license_present ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {formData.fssai_license_present ? 'Verified Visible' : 'Missing / Undetected'}
          </span>
        </div>

        {/* Veg / Non-Veg Mark */}
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Veg / Non-Veg Mark
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '14px',
              height: '14px',
              border: `2px solid ${formData.veg_nonveg_mark === 'green' ? '#10b981' : formData.veg_nonveg_mark === 'brown' ? '#b45309' : '#64748b'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: formData.veg_nonveg_mark === 'green' ? '#10b981' : formData.veg_nonveg_mark === 'brown' ? '#b45309' : 'transparent',
              }} />
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize' }}>
              {formData.veg_nonveg_mark}
            </span>
          </div>
        </div>

        {/* Allergen Declaration */}
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Allergen Declaration
          </span>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: formData.allergens_declared ? 'var(--text-primary)' : '#ef4444',
          }}>
            {formData.allergens_declared
              ? (formData.allergens_declared.join(', ') || 'None')
              : 'Statement Missing'}
          </span>
        </div>
      </div>

      {/* Declared Ingredients */}
      {formData.ingredients && formData.ingredients.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Declared Ingredients (in order of weight)
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {formData.ingredients.map((ing, idx) => (
              <span
                key={idx}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                }}
              >
                {idx + 1}. {ing}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Package Claims */}
      {formData.claims && formData.claims.length > 0 && (
        <div>
          <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Marketing Claims on Label
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {formData.claims.map((claim, idx) => (
              <span
                key={idx}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                "{claim}"
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
