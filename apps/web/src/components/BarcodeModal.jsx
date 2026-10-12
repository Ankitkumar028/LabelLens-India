import React, { useState } from 'react';
import { X, Barcode, Search, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const QUICK_BARCODES = [
  { code: '8901030383709', name: 'Maggi 2-Minute Masala Noodles', brand: 'Nestlé' },
  { code: '8901063012829', name: 'Good Day Cashew Cookies', brand: 'Britannia' },
  { code: '8901725181222', name: 'Parle-G Gluco Biscuits', brand: 'Parle' },
  { code: '8901262010025', name: 'Pasteurized Butter', brand: 'Amul' },
  { code: '8901499008503', name: "India's Magic Masala Chips", brand: "Lay's" },
  { code: '8901725132514', name: 'Mixed Fruit Juice', brand: 'Real' },
];

export default function BarcodeModal({ isOpen, onClose, onSelectBarcode, isLoading }) {
  const { t } = useLanguage();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    setErrorMsg(null);
    onSelectBarcode(barcodeInput.trim());
  };

  const handleQuickPick = (code) => {
    setBarcodeInput(code);
    setErrorMsg(null);
    onSelectBarcode(code);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      padding: '20px',
    }}>
      <div className="card glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '28px',
        position: 'relative',
        animation: 'fadeIn 0.25s ease-out',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '10px',
            padding: '8px',
            color: 'var(--accent-cyan)',
          }}>
            <Barcode size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              {t('barcode_modal_title')}
            </h2>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
          {t('barcode_modal_desc')}
        </p>

        {/* Barcode Input Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Barcode size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }} />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder={t('barcode_input_placeholder')}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: 'white',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !barcodeInput.trim()}
              className="btn-primary"
              style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}
            >
              {isLoading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
              <span>{t('barcode_lookup_btn')}</span>
            </button>
          </div>
        </form>

        {/* Quick Picks for Popular Indian Snacks */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
          }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            {t('barcode_quick_picks')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
            {QUICK_BARCODES.map((item) => (
              <button
                key={item.code}
                onClick={() => handleQuickPick(item.code)}
                disabled={isLoading}
                style={{
                  background: 'rgba(30, 41, 59, 0.45)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.45)';
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {item.brand} • <span style={{ fontFamily: 'monospace' }}>{item.code}</span>
                  </div>
                </div>
                <CheckCircle2 size={16} color="var(--accent-cyan)" opacity={0.6} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
