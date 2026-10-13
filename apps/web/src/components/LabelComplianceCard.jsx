import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, XCircle, FileText } from 'lucide-react';

export default function LabelComplianceCard({ compliance }) {
  if (!compliance) return null;

  const checks = compliance.checks || [];
  const status = compliance.status || compliance.overall_status || 'NON_COMPLIANT';

  let statusBadgeColor = '#10b981';
  let statusText = 'Fully Compliant';
  let StatusIcon = CheckCircle2;

  if (status === 'NON_COMPLIANT' || status === 'FAILED') {
    statusBadgeColor = '#ef4444';
    statusText = 'Non-Compliant Notice';
    StatusIcon = XCircle;
  } else if (status === 'PARTIALLY_COMPLIANT' || status === 'PARTIALLY_DETECTED') {
    statusBadgeColor = '#f59e0b';
    statusText = 'Partially Compliant';
    StatusIcon = AlertTriangle;
  } else if (status === 'NEEDS_REVIEW') {
    statusBadgeColor = '#f59e0b';
    statusText = 'Needs Review';
    StatusIcon = AlertTriangle;
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
          <StatusIcon size={16} />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Distinction Note */}
      <div style={{
        background: 'rgba(56, 189, 248, 0.08)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '16px',
        fontSize: '0.78rem',
        color: 'var(--accent-cyan)',
        lineHeight: 1.45,
      }}>
        <strong>Note on Scoring Separation:</strong> Packaging defects (e.g. missing license or incomplete date) do not penalize the product's nutritional quality score, adhering to Section 2 of the Nutrition Intelligence Standard.
      </div>

      {/* Non-Compliant or Review Summary Alert */}
      {(status === 'NON_COMPLIANT' || status === 'FAILED' || status === 'NEEDS_REVIEW') && (
        <div style={{
          background: status === 'NON_COMPLIANT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${status === 'NON_COMPLIANT' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '18px',
          fontSize: '0.82rem',
          color: status === 'NON_COMPLIANT' ? '#fca5a5' : '#fcd34d',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}>
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#ffffff' }}>
              {status === 'NON_COMPLIANT' ? 'Non-Compliant Packaging Notice' : 'Verification Review Needed'}:
            </strong>
            <p style={{ marginTop: '2px' }}>
              {compliance.summary || 'Mandatory FSSAI 2020 statutory declarations were not detected. If you uploaded a non-food image or partial photo, statutory requirements cannot be verified.'}
            </p>
          </div>
        </div>
      )}

      {/* Checklist Grid */}
      {checks.length === 0 ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '12px',
          border: '1px dashed var(--border-subtle)',
          fontSize: '0.85rem',
        }}>
          No statutory checklist items detected for this upload.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {checks.map((check, idx) => {
            const title = check.title || check.name || 'Statutory Requirement';
            const clause = check.fssai_clause || check.clause || 'FSSAI 2020 Clause';
            const checkStatus = check.status || 'NOT_DETECTED';
            const isPassed = checkStatus === 'COMPLIANT' || checkStatus === 'PASSED';
            const isWarning = checkStatus === 'PARTIALLY_DETECTED' || checkStatus === 'NEEDS_REVIEW' || checkStatus === 'WARNING';
            const badgeColor = isPassed ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';
            const statusLabel = checkStatus === 'NOT_DETECTED' ? 'NOT DETECTED' : checkStatus;

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
                      {title}
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
                      {statusLabel}
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
                  <span>Clause: {clause}</span>
                  {check.fssai_code && <span>{check.fssai_code}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
