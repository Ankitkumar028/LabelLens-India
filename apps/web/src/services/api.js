/**
 * API Client for LabelLens India backend services.
 */

const BASE_URL = '';

export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

export async function analyzeImage(fileOrBlob, preset = null) {
  const formData = new FormData();
  if (fileOrBlob) {
    formData.append('file', fileOrBlob);
  }
  if (preset) {
    formData.append('preset', preset);
  }

  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(errorData.detail || `Server error (${res.status})`);
  }

  return await res.json();
}

export async function recalculateScore(extraction) {
  const res = await fetch(`${BASE_URL}/api/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

