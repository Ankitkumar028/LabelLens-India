import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Cpu,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react';
import { getAiSettings, testProviderConnection } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PROVIDER_OPTIONS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Recommended Free',
    badgeColor: '#10b981',
    description: 'High speed and generous free tier (15 requests/min).',
    link: 'https://aistudio.google.com/app/apikey',
    linkText: 'Get Free Gemini Key (Google AI Studio)',
    defaultModel: 'gemini-flash-lite-latest',
    modelOptions: ['gemini-flash-lite-latest', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    placeholderKey: 'AIzaSy...',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o)',
    badge: 'High Accuracy',
    badgeColor: '#38bdf8',
    description: 'Industry-standard multimodal vision model via your OpenAI account.',
    link: 'https://platform.openai.com/api-keys',
    linkText: 'Get OpenAI Key (OpenAI Platform)',
    defaultModel: 'gpt-4o-mini',
    modelOptions: ['gpt-4o-mini', 'gpt-4o'],
    placeholderKey: 'sk-proj-...',
  },
  {
    id: 'vllm',
    name: 'AMD ROCm / vLLM',
    badge: 'Self-Hosted / GPU',
    badgeColor: '#ec4899',
    description: 'Direct high-throughput inference on AMD Radeon / Instinct hardware.',
    link: 'https://rocm.docs.amd.com/',
    linkText: 'AMD ROCm Documentation',
    defaultModel: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
    modelOptions: [
      'meta-llama/Llama-3.2-11B-Vision-Instruct',
      'Qwen/Qwen2-VL-7B-Instruct',
      'llava-hf/llava-1.5-7b-hf',
    ],
    defaultBaseUrl: 'http://localhost:8000/v1',
    placeholderKey: 'Optional Bearer Token...',
  },
  {
    id: 'default',
    name: 'Demo Server Default',
    badge: 'Free Tier',
    badgeColor: '#64748b',
    description: 'Uses server default API key. May hit shared rate limits.',
    link: null,
    defaultModel: '',
    placeholderKey: '',
  },
];

export default function AiSettingsModal({ isOpen, onClose }) {
  const { updateUserAiKeys } = useAuth();
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [testStatus, setTestStatus] = useState(null); // { loading, success, message }
  const [saveMessage, setSaveMessage] = useState(null);

  // Hydrate settings on mount or open
  useEffect(() => {
    if (isOpen) {
      const current = getAiSettings();
      setProvider(current.provider || 'gemini');
      setApiKey(current.apiKey || '');
      setModel(current.model || '');
      setBaseUrl(current.baseUrl || '');
      setTestStatus(null);
      setSaveMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentOption = PROVIDER_OPTIONS.find((p) => p.id === provider) || PROVIDER_OPTIONS[0];

  const handleProviderSelect = (selectedId) => {
    setProvider(selectedId);
    const opt = PROVIDER_OPTIONS.find((p) => p.id === selectedId);
    if (opt && opt.defaultModel && !model) {
      setModel(opt.defaultModel);
    }
    if (opt && opt.defaultBaseUrl && !baseUrl) {
      setBaseUrl(opt.defaultBaseUrl);
    }
    setTestStatus(null);
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true, message: 'Verifying API credentials...' });
    setSaveMessage(null);
    try {
      const res = await testProviderConnection({
        provider,
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      });

      setTestStatus({
        loading: false,
        success: true,
        message: res.message || `Connected successfully to ${res.provider}!`,
      });
    } catch (err) {
      setTestStatus({
        loading: false,
        success: false,
        message: err.message || 'Connection failed. Please verify API key.',
      });
    }
  };

  const handleSaveSettings = async () => {
    const settings = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim(),
    };

    await updateUserAiKeys(settings);
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleResetToDefault = async () => {
    const settings = {
      provider: 'default',
      apiKey: '',
      model: '',
      baseUrl: '',
    };
    setProvider('default');
    setApiKey('');
    setModel('');
    setBaseUrl('');
    await updateUserAiKeys(settings);
    setSaveMessage('Reverted to Server Default.');
    setTestStatus(null);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '30px',
        position: 'relative',
        borderRadius: '20px',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.15)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <KeyRound size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                AI Model & API Key Settings (BYOK)
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Bring Your Own Key to prevent developer rate-limiting and enjoy unlimited scans.
              </p>
            </div>
          </div>
        </div>

        {/* Provider Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          marginBottom: '20px',
        }}>
          {PROVIDER_OPTIONS.map((opt) => {
            const isSelected = provider === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleProviderSelect(opt.id)}
                style={{
                  background: isSelected ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.6)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  }}>
                    {opt.name.split(' ')[0]}
                  </span>
                  {isSelected && <Zap size={14} color="var(--accent-cyan)" />}
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  color: opt.badgeColor,
                  fontWeight: 600,
                }}>
                  {opt.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Provider Card Details */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '18px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
              {currentOption.name} Configuration
            </h3>
            {currentOption.link && (
              <a
                href={currentOption.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.75rem',
                  color: 'var(--accent-cyan)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {currentOption.linkText}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {currentOption.description}
          </p>

          {provider !== 'default' ? (
            <div>
              {/* API Key Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {provider === 'vllm' ? 'BEARER TOKEN (OPTIONAL)' : 'API KEY'}
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(11, 17, 32, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0 12px',
                }}>
                  <KeyRound size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestStatus(null);
                    }}
                    placeholder={currentOption.placeholderKey}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      padding: '10px 0',
                      fontSize: '0.86rem',
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Model Input or Preset */}
              <div style={{ marginBottom: provider === 'vllm' ? '14px' : '0px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  MODEL IDENTIFIER
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setTestStatus(null);
                  }}
                  placeholder={currentOption.defaultModel || 'Default recommended model'}
                  style={{
                    width: '100%',
                    background: 'rgba(11, 17, 32, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
                {currentOption.modelOptions && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {currentOption.modelOptions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        style={{
                          background: model === m ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '0.7rem',
                          color: model === m ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AMD ROCm / Custom Base URL */}
              {provider === 'vllm' && (
                <div style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    OPENAI-COMPATIBLE BASE URL (VLLM / OLLAMA)
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => {
                      setBaseUrl(e.target.value);
                      setTestStatus(null);
                    }}
                    placeholder="http://localhost:8000/v1"
                    style={{
                      width: '100%',
                      background: 'rgba(11, 17, 32, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '0.86rem',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
            }}>
              Currently using the server's pre-configured Gemini instance. No personal key required, but usage is subject to the developer's shared daily quota.
            </div>
          )}
        </div>

        {/* Live Test Status Banner */}
        {testStatus && (
          <div style={{
            background: testStatus.loading
              ? 'rgba(56, 189, 248, 0.1)'
              : testStatus.success
              ? 'rgba(16, 185, 129, 0.12)'
              : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${
              testStatus.loading
                ? 'rgba(56, 189, 248, 0.3)'
                : testStatus.success
                ? 'rgba(16, 185, 129, 0.4)'
                : 'rgba(239, 68, 68, 0.4)'
            }`,
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.82rem',
            color: testStatus.loading
              ? 'var(--accent-cyan)'
              : testStatus.success
              ? '#34d399'
              : '#f87171',
          }}>
            {testStatus.loading && <Loader2 size={16} className="spin" />}
            {testStatus.success && <CheckCircle2 size={16} />}
            {!testStatus.loading && !testStatus.success && <AlertTriangle size={16} />}
            <span>{testStatus.message}</span>
          </div>
        )}

        {/* Success Save Banner */}
        {saveMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <CheckCircle2 size={16} />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            >
              Reset to Server Default
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {provider !== 'default' && (
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus?.loading}
                className="btn-secondary"
                style={{ fontSize: '0.84rem', padding: '9px 16px' }}
              >
                {testStatus?.loading ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap size={15} color="var(--accent-cyan)" />
                    Test Connection
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveSettings}
              className="btn-primary"
              style={{ fontSize: '0.84rem', padding: '9px 20px' }}
            >
              <Save size={15} />
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
