import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ImageUploader from './components/ImageUploader';
import CameraModal from './components/CameraModal';
import BarcodeModal from './components/BarcodeModal';
import PresetsBar from './components/PresetsBar';
import ScoreGauge from './components/ScoreGauge';
import RedFlagsList from './components/RedFlagsList';
import NutritionInspector from './components/NutritionInspector';
import ProductComparison from './components/ProductComparison';
import { checkHealth, analyzeImage, recalculateScore, lookupBarcode } from './services/api';
import { useLanguage } from './context/LanguageContext';
import { Sparkles, Scan, AlertCircle, ArrowLeft, Loader2, Barcode, Swords } from 'lucide-react';

export default function App() {
  const { t } = useLanguage();
  const [healthStatus, setHealthStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'compare'
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    async function loadHealth() {
      const status = await checkHealth();
      setHealthStatus(status);
    }
    loadHealth();
  }, []);

  const handleImageSelected = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setSelectedImage({ file, previewUrl, isPreset: false });
    setErrorMessage(null);
  };

  const handleCameraCapture = (blob) => {
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(blob);
    setSelectedImage({ file, previewUrl, isPreset: false });
    setErrorMessage(null);
  };

  const handleClearImage = () => {
    if (selectedImage && selectedImage.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  const handleSelectPreset = async (presetId) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 100;
      dummyCanvas.height = 100;
      const ctx = dummyCanvas.getContext('2d');
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 0, 100, 100);

      const blob = await new Promise((resolve) => dummyCanvas.toBlob(resolve, 'image/jpeg'));
      const dummyFile = new File([blob], `${presetId}.jpg`, { type: 'image/jpeg' });
      const previewUrl = dummyCanvas.toDataURL('image/jpeg');

      setSelectedImage({ file: dummyFile, previewUrl, isPreset: true, presetId });

      const result = await analyzeImage(dummyFile, presetId);
      setAnalysisResult(result);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to analyze sample preset.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBarcodeSelect = async (code) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setIsBarcodeOpen(false);
    try {
      const result = await lookupBarcode(code);
      setAnalysisResult(result);
      setSelectedImage({
        previewUrl: null,
        isPreset: false,
        barcode: code,
      });
      setActiveTab('scanner');
    } catch (err) {
      setErrorMessage(err.message || t('barcode_not_found'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedImage || !selectedImage.file) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const result = await analyzeImage(
        selectedImage.file,
        selectedImage.isPreset ? selectedImage.presetId : null
      );
      setAnalysisResult(result);
    } catch (err) {
      setErrorMessage(err.message || 'Analysis failed. Please try another image.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecalculate = async (editedExtraction) => {
    setIsRecalculating(true);
    setErrorMessage(null);
    try {
      const updated = await recalculateScore(editedExtraction);
      setAnalysisResult(updated);
    } catch (err) {
      setErrorMessage(err.message || 'Recalculation failed.');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        healthStatus={healthStatus}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setErrorMessage(null);
        }}
        onOpenBarcodeModal={() => setIsBarcodeOpen(true)}
      />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px', flex: 1, width: '100%' }}>
        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#f87171',
            fontSize: '0.9rem',
          }}>
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Compare 2 Products */}
        {activeTab === 'compare' ? (
          <ProductComparison liveAnalysisA={analysisResult} />
        ) : (
          /* Tab 2: Single Label Scanner & Barcode Flow */
          <div>
            {/* Hero Banner (when no results yet) */}
            {!analysisResult && (
              <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '24px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '16px',
                }}>
                  <Sparkles size={14} />
                  {t('hero_badge')}
                </div>

                <h1 style={{
                  fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  marginBottom: '16px',
                  background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {t('hero_title')}
                </h1>

                <p style={{
                  fontSize: '1.05rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '680px',
                  margin: '0 auto',
                }}>
                  {t('hero_desc')}
                </p>

                {/* Direct Barcode Button under Hero */}
                <div style={{ marginTop: '20px' }}>
                  <button
                    onClick={() => setIsBarcodeOpen(true)}
                    style={{
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: '30px',
                      padding: '8px 20px',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)';
                    }}
                  >
                    <Barcode size={18} />
                    <span>{t('scan_barcode_btn')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input & Upload Section */}
            {!analysisResult ? (
              <div>
                <ImageUploader
                  onImageSelected={handleImageSelected}
                  onOpenLiveCamera={() => setIsCameraOpen(true)}
                  selectedImage={selectedImage}
                  onClearImage={handleClearImage}
                  isLoading={isAnalyzing}
                />

                {/* Analysis Action Button */}
                {selectedImage && selectedImage.file && (
                  <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <button
                      onClick={handleRunAnalysis}
                      disabled={isAnalyzing}
                      className="btn-primary"
                      style={{
                        padding: '14px 42px',
                        fontSize: '1.05rem',
                        borderRadius: '50px',
                      }}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 size={20} className="spin" />
                          {t('scanning_btn')}
                        </>
                      ) : (
                        <>
                          <Scan size={20} />
                          {t('analyze_btn')}
                        </>
                      )}
                    </button>
                  </div>
                )}

                <PresetsBar onSelectPreset={handleSelectPreset} isLoading={isAnalyzing} />
              </div>
            ) : (
              /* Results Dashboard */
              <div>
                {/* Top Navigation */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  <button
                    onClick={handleClearImage}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <ArrowLeft size={16} /> {t('scan_another')}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => setActiveTab('compare')}
                      className="btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: '#c084fc', color: '#c084fc' }}
                    >
                      <Swords size={15} /> Compare with Another Snack
                    </button>

                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Time: {analysisResult.processing_time_ms} ms
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: 'var(--text-secondary)',
                    }}>
                      Scan ID: {analysisResult.scan_id.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* Main Result Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '24px',
                  alignItems: 'start',
                }}>
                  {/* Left Column: Score Gauge & Health Rating */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <ScoreGauge
                      score={analysisResult.score}
                      disclaimer={analysisResult.disclaimer}
                    />

                    <RedFlagsList redFlags={analysisResult.red_flags} />
                  </div>

                  {/* Right Column: OCR Inspector & Nutritional Breakdown */}
                  <div>
                    <NutritionInspector
                      extraction={analysisResult.extraction}
                      onRecalculate={handleRecalculate}
                      isUpdating={isRecalculating}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        onSelectBarcode={handleBarcodeSelect}
        isLoading={isAnalyzing}
      />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.82rem',
        marginTop: 'auto',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <p style={{ marginBottom: '6px' }}>
            LabelLens India — FSSAI Compliance & Front-of-Pack Nutrition Intelligence.
          </p>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Informational only, not medical advice. Built with FastAPI, Open Food Facts, ROCm vLLM & Antigravity.
          </p>
        </div>
      </footer>
    </div>
  );
}
