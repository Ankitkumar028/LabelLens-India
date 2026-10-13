import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, FileText, ExternalLink } from 'lucide-react';

export default function LabelComplianceCard({ compliance }) {
  if (!compliance) return null;

  const checks = compliance.checks || [];
  const status = compliance.overall_status || 'COMPLIANT';

  let statusBadgeColor = '#10b981';
  let statusText = 'Fully Compliant';
  if (status === 'NON_COMPLIANT') {
    statusBadgeColor = '#ef4444';
    statusText = 'Non-Compliant Notice';
  } else if (status === 'PARTIALLY_COMPLIANT') {
    statusBadgeColor = '#f59e0b';
    statusText = 'Partially Compliant';
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FileText size={20} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
              FSSAI 2020 Packaging & Labelling Compliance
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Independent regulatory checklist based on Food Safety and Standards (Labelling and Display) Regulations, 2020.
            </p>
          </div>
        </div>

        <div style={{
          background: `${statusBadgeColor}18`,
          border: `1px solid ${statusBadgeColor}40`,
          padding: '6px 12px',
          borderRadius: '16px',
          fontSize: '0.82rem',
          color: statusBadgeColor,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {status === 'COMPLIANT' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{statusText}</span>
        </div>
      </div>

      {/* Distinction Note */}
      <div style={{
        background: 'rgba(56, 189, 248, 0.08)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '18px',
        fontSize: '0.78rem',
        color: 'var(--accent-cyan)',
        lineHeight: 1.45,
      }}>
        <strong>Note on Scoring Separation:</strong> Packaging defects (e.g. missing license or incomplete date) do not penalize the product's nutritional quality score, adhering to Section 2 of the Nutrition Intelligence Standard.
      </div>

      {/* Checklist Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {checks.map((check, idx) => {
          const isPassed = check.status === 'PASSED';
          const isWarning = check.status === 'WARNING';
          const badgeColor = isPassed ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';

          return (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                    {check.name}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: badgeColor,
                    background: `${badgeColor}18`,
                    border: `1px solid ${badgeColor}35`,
                    borderRadius: '6px',
                    padding: '2px 6px',
                    whiteSpace: 'nowrap',
                  }}>
                    {check.status}
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                  {check.details}
                </p>
              </div>

              <div style={{
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                fontFamily: 'monospace',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                paddingTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>Clause: {check.clause}</span>
                {check.fssai_code && <span>{check.fssai_code}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
