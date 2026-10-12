import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function RedFlagsList({ redFlags }) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filterOptions = ['ALL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  const filteredFlags = redFlags.filter((rf) => {
    if (activeFilter === 'ALL') return true;
    return rf.severity === activeFilter;
  });

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'HIGH':
        return {
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.3)',
          icon: ShieldAlert,
        };
      case 'MEDIUM':
        return {
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          icon: AlertTriangle,
        };
      case 'LOW':
        return {
          color: '#38bdf8',
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.3)',
          icon: AlertCircle,
        };
      case 'INFO':
      default:
        return {
          color: '#818cf8',
          bg: 'rgba(129, 140, 248, 0.12)',
          border: 'rgba(129, 140, 248, 0.3)',
          icon: Info,
        };
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} color="#ef4444" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {t('red_flags_title')}
          </h2>
          <span style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '20px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            {redFlags.length}
          </span>
        </div>

        {/* Severity Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filterOptions.map((opt) => {
            const count = opt === 'ALL'
              ? redFlags.length
              : redFlags.filter((f) => f.severity === opt).length;

            return (
              <button
                key={opt}
                onClick={() => setActiveFilter(opt)}
                style={{
                  background: activeFilter === opt ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  border: `1px solid ${activeFilter === opt ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  color: activeFilter === opt ? '#ffffff' : 'var(--text-muted)',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{opt}</span>
                <span style={{ opacity: 0.7 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Red Flags List */}
      {filteredFlags.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '12px',
          border: '1px dashed var(--border-subtle)',
        }}>
          <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '8px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('no_red_flags')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredFlags.map((flag) => {
            const style = getSeverityStyle(flag.severity);
            const Icon = style.icon;

            return (
              <div
                key={flag.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${style.border}`,
                  borderLeft: `4px solid ${style.color}`,
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Icon size={16} color={style.color} />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {flag.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {flag.penalty > 0 && (
                      <span style={{
                        color: '#ef4444',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}>
                        -{flag.penalty} {t('points')}
                      </span>
                    )}
                    <span style={{
                      color: style.color,
                      background: style.bg,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}>
                      {flag.severity}
                    </span>
                  </div>
                </div>

                <p style={{
                  fontSize: '0.84rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                  marginBottom: flag.details ? '10px' : '0',
                }}>
                  {flag.description}
                </p>

                {/* Detected details pill tags */}
                {flag.details && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Identified:</span>
                    {flag.details.aliases_found && flag.details.aliases_found.map((alias) => (
                      <span
                        key={alias}
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        {alias}
                      </span>
                    ))}
                    {flag.details.sugar_ingredients_in_top_3 && flag.details.sugar_ingredients_in_top_3.map((ing) => (
                      <span
                        key={ing}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        {ing}
                      </span>
                    ))}
                    {flag.details.hydrogenated_indicators_found && flag.details.hydrogenated_indicators_found.map((fat) => (
                      <span
                        key={fat}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        {fat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
