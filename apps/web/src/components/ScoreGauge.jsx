import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ScoreGauge({ score, disclaimer }) {
  const { t } = useLanguage();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { value, grade, grade_description, breakdown } = score;

  const getGradeTheme = () => {
    switch (grade) {
      case 'GREEN':
        return {
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.1)',
          border: 'rgba(16, 185, 129, 0.3)',
          label: t('grade_green'),
          icon: CheckCircle,
          desc: t('grade_green_desc'),
        };
      case 'AMBER':
        return {
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.1)',
          border: 'rgba(245, 158, 11, 0.3)',
          label: t('grade_amber'),
          icon: AlertTriangle,
          desc: t('grade_amber_desc'),
        };
      case 'RED':
      default:
        return {
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.1)',
          border: 'rgba(239, 68, 68, 0.3)',
          label: t('grade_red'),
          icon: AlertTriangle,
          desc: t('grade_red_desc'),
        };
    }
  };

  const theme = getGradeTheme();
  const Icon = theme.icon;

  // SVG Gauge calculations
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {t('health_score')}
        </h2>
      </div>

      {/* Circular Gauge */}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, margin: '0 auto 16px auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Dynamic Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            style={{
              transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 10px ${theme.color}60)`,
            }}
          />
        </svg>

        {/* Center Score Value */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-heading)' }}>
            {value}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            out of 100
          </span>
        </div>
      </div>

      {/* Traffic Light Grade Pill */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 16px',
        borderRadius: '30px',
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        marginBottom: '12px',
      }}>
        <Icon size={16} color={theme.color} />
        <span style={{ color: theme.color, fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.04em' }}>
          {theme.label}
        </span>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 16px auto' }}>
        {theme.desc}
      </p>

      {/* Breakdown Toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent-cyan)',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
        }}
      >
        <span>{showBreakdown ? 'Hide calculation details' : 'How was this scored?'}</span>
        {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Breakdown Details */}
      {showBreakdown && breakdown && (
        <div style={{
          marginTop: '16px',
          padding: '14px',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'left',
          fontSize: '0.82rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Base Baseline</span>
            <span style={{ fontWeight: 600 }}>+{breakdown.base_score} pts</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#ef4444' }}>FSSAI Red-Flag Deductions</span>
            <span style={{ fontWeight: 600, color: '#ef4444' }}>{breakdown.rule_penalties} pts</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: breakdown.nutrient_adjustments < 0 ? '#f59e0b' : '#10b981' }}>
              Nutrient Composition Adjustments
            </span>
            <span style={{
              fontWeight: 600,
              color: breakdown.nutrient_adjustments < 0 ? '#f59e0b' : '#10b981',
            }}>
              {breakdown.nutrient_adjustments > 0 ? `+${breakdown.nutrient_adjustments}` : breakdown.nutrient_adjustments} pts
            </span>
          </div>

          {breakdown.nutrient_details && (
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              <div>Sugar: -{breakdown.nutrient_details.sugar_deduction}</div>
              <div>Sat Fat: -{breakdown.nutrient_details.saturated_fat_deduction}</div>
              <div>Sodium: -{breakdown.nutrient_details.sodium_deduction}</div>
              <div>Fibre bonus: +{breakdown.nutrient_details.fibre_bonus}</div>
            </div>
          )}
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div style={{
        marginTop: '18px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        color: 'var(--text-muted)',
        fontSize: '0.74rem',
      }}>
        <Info size={13} />
        <span>{disclaimer || t('disclaimer_text')}</span>
      </div>
    </div>
  );
}
