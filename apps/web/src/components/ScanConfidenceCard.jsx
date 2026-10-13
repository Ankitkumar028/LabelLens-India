import React from 'react';
import { Eye, CheckCircle2, AlertTriangle, Cpu, Clock, Hash, Check } from 'lucide-react';

export default function ScanConfidenceCard({ confidenceReport, processingTimeMs, scanId, provider }) {
  if (!confidenceReport) return null;

  const overall = confidenceReport.overall_confidence || 'HIGH';
  const fields = confidenceReport.field_confidence || {};
  const issues = confidenceReport.unclear_fields || [];

  let badgeColor = '#10b981';
  if (overall === 'LOW') badgeColor = '#ef4444';
  else if (overall === 'MEDIUM') badgeColor = '#f59e0b';

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Eye size={20} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
              Extraction Provenance & Confidence
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Optical Character Recognition and field audit trail for transparency.
            </p>
          </div>
        </div>

        <div style={{
          background: `${badgeColor}18`,
          border: `1px solid ${badgeColor}40`,
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '0.78rem',
          color: badgeColor,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <CheckCircle2 size={14} />
          <span>{overall} Confidence</span>
        </div>
      </div>

      {/* Field Confidence Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '8px',
        marginBottom: '16px',
      }}>
        {Object.entries(fields).map(([fieldName, conf]) => {
          const isHigh = conf === 'HIGH';
          const isMed = conf === 'MEDIUM';
          const color = isHigh ? '#10b981' : isMed ? '#f59e0b' : '#ef4444';

          return (
            <div
              key={fieldName}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {fieldName.replace(/_/g, ' ')}
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color,
                background: `${color}15`,
                padding: '1px 5px',
                borderRadius: '4px',
              }}>
                {conf}
              </span>
            </div>
          );
        })}
      </div>

      {/* Issues or missing declarations */}
      {issues.length > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.76rem',
          color: '#fbbf24',
        }}>
          <AlertTriangle size={15} />
          <span>Note: Fields with lower confidence or missing packaging declaration: {issues.join(', ')}</span>
        </div>
      )}

      {/* Metadata Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {scanId && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Hash size={12} /> Scan ID: {scanId.slice(0, 8)}...
            </span>
          )}
          {processingTimeMs && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {processingTimeMs} ms
            </span>
          )}
        </div>

        <span style={{ color: 'var(--accent-cyan)' }}>
          Tip: You can manually override any extraction in the Nutrition Inspector tab.
        </span>
      </div>
    </div>
  );
}
