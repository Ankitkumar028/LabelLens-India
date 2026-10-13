import React, { useState } from 'react';
import {
  ShieldCheck,
  Barcode,
  Swords,
  Scan,
  Globe,
  KeyRound,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAiSettings } from '../services/api';

export default function Navbar({
  healthStatus,
  activeTab,
  onTabChange,
  onOpenBarcodeModal,
  onOpenAiSettings,
  onOpenAuthModal,
}) {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const isHealthy = healthStatus && healthStatus.status === 'healthy';
  const aiSettings = getAiSettings();

  const getProviderPill = () => {
    switch (aiSettings.provider) {
      case 'gemini':
        return { label: 'Gemini', color: '#10b981' };
      case 'openai':
        return { label: 'OpenAI', color: '#38bdf8' };
      case 'vllm':
        return { label: 'ROCm GPU', color: '#ec4899' };
      default:
        return { label: 'Demo Mode', color: '#94a3b8' };
    }
  };

  const pill = getProviderPill();

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
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => onTabChange('scanner')}
        >
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

        {/* Right Section: AI Settings (BYOK) + Auth + Language + API Health */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* AI Settings / BYOK Trigger */}
          <button
            onClick={onOpenAiSettings}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px 12px',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)';
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
            }}
          >
            <Zap size={14} color={pill.color} />
            <span>AI:</span>
            <span style={{
              background: `${pill.color}20`,
              color: pill.color,
              padding: '1px 6px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}>
              {pill.label}
            </span>
          </button>

          {/* User Account / Auth Button */}
          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}>
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <span>{user.email.split('@')[0]}</span>
                <ChevronDown size={13} color="var(--text-muted)" />
              </button>

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    width: '200px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '8px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                    zIndex: 50,
                  }}
                  onMouseLeave={() => setIsProfileMenuOpen(false)}
                >
                  <div style={{
                    padding: '8px 10px',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    marginBottom: '4px',
                    wordBreak: 'break-all',
                  }}>
                    {user.email}
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenAiSettings();
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <KeyRound size={14} /> My AI Keys
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#f87171',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '6px 12px',
                color: 'var(--accent-cyan)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)';
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
              }}
            >
              <User size={14} />
              <span>Sign In</span>
            </button>
          )}

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
            <Globe size={13} style={{ color: 'var(--text-muted)', margin: '0 3px' }} />
            <button
              onClick={() => setLanguage('en')}
              style={{
                background: language === 'en' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: language === 'en' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 6px',
                fontSize: '0.72rem',
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
                padding: '3px 6px',
                fontSize: '0.72rem',
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
                padding: '3px 6px',
                fontSize: '0.72rem',
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
            fontSize: '0.72rem',
            padding: '5px 9px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-subtle)',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
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
