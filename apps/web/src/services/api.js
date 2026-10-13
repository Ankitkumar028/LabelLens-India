/**
 * API Client for LabelLens India backend services.
 * Supports Bring-Your-Own-Key (BYOK) for Gemini, OpenAI, AMD ROCm vLLM,
 * and secured authentication (PBKDF2-HMAC-SHA256).
 */

export function formatApiBaseUrl(url) {
  let u = (url || '').trim();
  if (!u) return '';
  if (!u.includes('.') && !u.startsWith('http')) {
    u = `${u}.onrender.com`;
  }
  if (!u.startsWith('http')) {
    u = `https://${u}`;
  }
  return u.replace(/\/+$/, '');
}

const rawApiUrl = (
  (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.VITE_API_URL) ||
  import.meta.env.VITE_API_URL ||
  ''
).trim();

const BASE_URL = formatApiBaseUrl(rawApiUrl);

// ==========================================
// AI Settings & BYOK Local Persistence
// ==========================================

const AI_SETTINGS_STORAGE_KEY = 'labellens_ai_settings';
const AUTH_TOKEN_KEY = 'labellens_auth_token';

export function getAiSettings() {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'default',
        apiKey: parsed.apiKey || '',
        model: parsed.model || '',
        baseUrl: parsed.baseUrl || '',
      };
    }
  } catch (err) {
    console.warn('Failed to parse saved AI settings', err);
  }
  return {
    provider: 'default',
    apiKey: '',
    model: '',
    baseUrl: '',
  };
}

export function saveAiSettings(settings) {
  try {
    localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save AI settings to localStorage', err);
  }
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || null;
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

// ==========================================
// Health Check
// ==========================================

export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) return await res.json();
    const fallbackRes = await fetch(`${BASE_URL}/api/health`);
    if (fallbackRes.ok) return await fallbackRes.json();
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

// ==========================================
// Image Analysis with BYOK Headers
// ==========================================

export async function analyzeImage(fileOrBlob, preset = null, customAiSettings = null) {
  const formData = new FormData();
  if (fileOrBlob) {
    formData.append('file', fileOrBlob);
  }
  if (preset) {
    formData.append('preset', preset);
  }

  const ai = customAiSettings || getAiSettings();
  const token = getAuthToken();

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Inject BYOK configurations
  if (ai.provider && ai.provider !== 'default') {
    headers['X-LLM-Provider'] = ai.provider;
    formData.append('provider', ai.provider);
  }
  if (ai.apiKey) {
    headers['X-LLM-API-Key'] = ai.apiKey;
    formData.append('api_key', ai.apiKey);
  }
  if (ai.model) {
    headers['X-LLM-Model'] = ai.model;
    formData.append('model', ai.model);
  }
  if (ai.baseUrl) {
    headers['X-LLM-Base-Url'] = ai.baseUrl;
    formData.append('base_url', ai.baseUrl);
  }

  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(errorData.detail || `Server error (${res.status})`);
  }

  return await res.json();
}

export async function recalculateScore(extraction) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/api/score`, {
    method: 'POST',
    headers,
    body: JSON.stringify(extraction),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Score calculation failed' }));
    throw new Error(errorData.detail || `Server error (${res.status})`);
  }

  return await res.json();
}

export async function lookupBarcode(barcode) {
  const clean = String(barcode).trim();
  const res = await fetch(`${BASE_URL}/api/barcode/${encodeURIComponent(clean)}`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Barcode lookup failed' }));
    throw new Error(errorData.detail || `Product not found (${res.status})`);
  }

  return await res.json();
}

export async function getBarcodePresets() {
  try {
    const res = await fetch(`${BASE_URL}/api/barcode/presets`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return [];
  }
}

// ==========================================
// AI Provider Connectivity Test
// ==========================================

export async function testProviderConnection({ provider, apiKey, model, baseUrl }) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api/provider/test`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: provider || 'gemini',
      api_key: apiKey || null,
      model: model || null,
      base_url: baseUrl || null,
    }),
  });

  const data = await res.json().catch(() => ({ success: false, message: 'Invalid response from server' }));
  if (!res.ok) {
    throw new Error(data.message || data.detail || `Test failed (${res.status})`);
  }
  return data;
}

// ==========================================
// Authentication Endpoints (PBKDF2 Secured)
// ==========================================

export async function registerUser(email, password, username = null) {
  const cleanEmail = (email || '').trim();
  const cleanUser = (username || cleanEmail.split('@')[0] || 'user').trim();
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      password,
      username: cleanUser,
    }),
  });

  const data = await res.json().catch(() => ({ detail: 'Registration failed' }));
  if (!res.ok) {
    let msg = 'Registration failed';
    if (typeof data.detail === 'string') {
      msg = data.detail;
    } else if (Array.isArray(data.detail)) {
      msg = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    } else if (data.message) {
      msg = data.message;
    }
    throw new Error(msg);
  }
  return data;
}

export async function loginUser(email, password) {
  const clean = (email || '').trim();
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username_or_email: clean,
      email: clean,
      password,
    }),
  });

  const data = await res.json().catch(() => ({ detail: 'Login failed' }));
  if (!res.ok) {
    let msg = 'Login failed';
    if (typeof data.detail === 'string') {
      msg = data.detail;
    } else if (Array.isArray(data.detail)) {
      msg = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    } else if (data.message) {
      msg = data.message;
    }
    throw new Error(msg);
  }
  return data;
}

export async function fetchCurrentUser(token) {
  const authToken = token || getAuthToken();
  if (!authToken) return null;

  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      setAuthToken(null);
      return null;
    }
    throw new Error(`Failed to load profile (${res.status})`);
  }
  return await res.json();
}

export async function saveUserAiKeys(keys) {
  const token = getAuthToken();
  if (!token) return null;

  const res = await fetch(`${BASE_URL}/api/auth/save-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(keys),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Save failed' }));
    throw new Error(errorData.detail || `Failed to save keys (${res.status})`);
  }
  return await res.json();
}

export async function logoutUser() {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (err) {
      console.warn('Logout network error', err);
    }
  }
  setAuthToken(null);
}

export async function trackAnalyticsEvent(action, metadata = {}) {
  try {
    fetch(`${BASE_URL}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, metadata }),
      keepalive: true,
    }).catch(() => {});
  } catch (err) {
    // Non-blocking
  }
}

