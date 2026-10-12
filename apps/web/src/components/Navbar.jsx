import React from 'react';
import { ShieldCheck, Barcode, Swords, Scan, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ healthStatus, activeTab, onTabChange, onOpenBarcodeModal }) {
  const { language, setLanguage, t } = useLanguage();
  const isHealthy = healthStatus && healthStatus.status === 'healthy';

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(7, 10, 18, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '12px 20px',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => onTabChange('scanner')}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
          }}>
            <ShieldCheck size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Label<span style={{ color: 'var(--accent-cyan)' }}>Lens</span>
              </span>
              <span style={{
                background: 'linear-gradient(90deg, #f97316, #ffffff, #22c55e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
                fontSize: '0.8rem',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '1px 5px',
                borderRadius: '5px',
              }}>
                INDIA
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
              {t('app_subtitle')}
            </p>
          </div>
        </div>

        {/* Center: Mode Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => onTabChange('scanner')}
            style={{
              background: activeTab === 'scanner' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: activeTab === 'scanner' ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
              color: activeTab === 'scanner' ? '#ffffff' : 'var(--text-secondary)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Scan size={14} />
            {t('nav_scanner')}
          </button>

          <button
            onClick={onOpenBarcodeModal}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <Barcode size={14} />
            {t('nav_barcode')}
          </button>

          <button
            onClick={() => onTabChange('compare')}
            style={{
              background: activeTab === 'compare' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              border: activeTab === 'compare' ? '1px solid rgba(168, 85, 247, 0.4)' : 'none',
              color: activeTab === 'compare' ? '#ffffff' : 'var(--text-secondary)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Swords size={14} />
            {t('nav_compare')}
          </button>
        </div>

        {/* Right: Language Switcher & Health Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '2px 4px',
          }}>
            <Globe size={14} style={{ color: 'var(--text-muted)', margin: '0 4px' }} />
            <button
              onClick={() => setLanguage('en')}
              style={{
                background: language === 'en' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: language === 'en' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 7px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('hi')}
              style={{
                background: language === 'hi' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: language === 'hi' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 7px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              हिंदी
            </button>
            <button
              onClick={() => setLanguage('mr')}
              style={{
                background: language === 'mr' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: language === 'mr' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 7px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              मराठी
            </button>
          </div>

          {/* API Health Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            padding: '5px 10px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-subtle)',
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isHealthy ? '#10b981' : '#f59e0b',
              boxShadow: isHealthy ? '0 0 6px #10b981' : '0 0 6px #f59e0b',
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {isHealthy ? t('api_connected') : t('api_offline')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
