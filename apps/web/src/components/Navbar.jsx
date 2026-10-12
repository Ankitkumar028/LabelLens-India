import React from 'react';
import { ShieldCheck, Activity, Sparkles } from 'lucide-react';

export default function Navbar({ healthStatus }) {
  const isHealthy = healthStatus && healthStatus.status === 'healthy';

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(7, 10, 18, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '14px 24px',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
          }}>
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Label<span style={{ color: 'var(--accent-cyan)' }}>Lens</span>
              </span>
              <span style={{
                background: 'linear-gradient(90deg, #f97316, #ffffff, #22c55e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
                fontSize: '0.85rem',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '1px 6px',
                borderRadius: '6px',
              }}>
                INDIA
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
              FSSAI-Aware Packaged Food Intelligence
            </p>
          </div>
        </div>

        {/* Status and Provider indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
            padding: '6px 12px',
            borderRadius: '20px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-subtle)',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isHealthy ? '#10b981' : '#f59e0b',
              boxShadow: isHealthy ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              API: {isHealthy ? 'Connected' : 'Connecting...'}
            </span>
            {healthStatus && healthStatus.llm_provider && (
              <span style={{
                color: 'var(--accent-cyan)',
                background: 'rgba(56, 189, 248, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>
                {healthStatus.llm_provider}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
