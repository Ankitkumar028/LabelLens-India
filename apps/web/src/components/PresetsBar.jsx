import React from 'react';
import { Sparkles, Cookie, Wheat, GlassWater, Flame } from 'lucide-react';

const PRESETS = [
  {
    id: 'choco_crunch_biscuits',
    label: 'Choco Crunch Biscuits',
    desc: 'High sugar + hydrogenated fat',
    icon: Cookie,
    badge: 'RED GRADE',
    badgeColor: '#ef4444',
  },
  {
    id: 'healthy_protein_muesli',
    label: 'Protein Seed Muesli',
    desc: 'Clean whole grains & high fibre',
    icon: Wheat,
    badge: 'GREEN GRADE',
    badgeColor: '#10b981',
  },
  {
    id: 'misleading_diet_drink',
    label: 'FitDiet Berry Drink',
    desc: 'False "No Added Sugar" claim',
    icon: GlassWater,
    badge: 'MISLEADING CLAIM',
    badgeColor: '#f59e0b',
  },
  {
    id: 'missing_table_snack',
    label: 'Street Bhujia Snack',
    desc: 'Missing table & FSSAI license',
    icon: Flame,
    badge: 'MISSING FSSAI',
    badgeColor: '#f43f5e',
  },
];

export default function PresetsBar({ onSelectPreset, isLoading }) {
  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        <Sparkles size={14} color="var(--accent-cyan)" />
        <span>Or Test With Indian Sample Labels (1-Click Evaluation)</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px',
      }}>
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              disabled={isLoading}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                }
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={18} color="var(--accent-cyan)" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '2px',
                }}>
                  <span style={{
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {preset.label}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {preset.desc}
                </div>
              </div>

              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: preset.badgeColor,
                background: `${preset.badgeColor}15`,
                border: `1px solid ${preset.badgeColor}30`,
                padding: '2px 6px',
                borderRadius: '4px',
                flexShrink: 0,
              }}>
                {preset.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
