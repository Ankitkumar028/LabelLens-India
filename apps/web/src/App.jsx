import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ImageUploader from './components/ImageUploader';
import CameraModal from './components/CameraModal';
import BarcodeModal from './components/BarcodeModal';
import AiSettingsModal from './components/AiSettingsModal';
import AuthModal from './components/AuthModal';
import PresetsBar from './components/PresetsBar';
import ScoreGauge from './components/ScoreGauge';
import RedFlagsList from './components/RedFlagsList';
import NutritionInspector from './components/NutritionInspector';
import ProductComparison from './components/ProductComparison';
import WhoImpactCalculator from './components/WhoImpactCalculator';
import LabelComplianceCard from './components/LabelComplianceCard';
import ScanConfidenceCard from './components/ScanConfidenceCard';
import { checkHealth, analyzeImage, recalculateScore, lookupBarcode, trackAnalyticsEvent } from './services/api';
import { useLanguage } from './context/LanguageContext';
import {
  Sparkles,
  Scan,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Barcode,
  Swords,
  HeartPulse,
  FileCheck2,
  Activity,
  Layers,
  KeyRound,
} from 'lucide-react';

export default function App() {
  const { t, language } = useLanguage();
  const [healthStatus, setHealthStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'compare'
  const [resultSubTab, setResultSubTab] = useState('overview'); // 'overview' | 'who' | 'compliance' | 'provenance'

  // Modals state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Scan state
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    async function loadHealth() {
      const status = await checkHealth();
      setHealthStatus(status);
      trackAnalyticsEvent('view_landing', { language });
    }
    loadHealth();
  }, [language]);

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
    trackAnalyticsEvent('sample_preset_selected', { preset_id: presetId });
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
      setResultSubTab('overview');
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
    trackAnalyticsEvent('barcode_scanned', { barcode: code });
    try {
      const result = await lookupBarcode(code);
      setAnalysisResult(result);
      setSelectedImage({
        previewUrl: null,
        isPreset: false,
        barcode: code,
      });
      setActiveTab('scanner');
      setResultSubTab('overview');
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
    trackAnalyticsEvent('image_analysis_submitted');
    try {
      const result = await analyzeImage(
        selectedImage.file,
        selectedImage.isPreset ? selectedImage.presetId : null
      );
      setAnalysisResult(result);
      setResultSubTab('overview');
    } catch (err) {
      setErrorMessage(err.message || 'Analysis failed. Please check your image or AI settings.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecalculate = async (editedExtraction) => {
    setIsRecalculating(true);
    setErrorMessage(null);
    try {
      const updated = await recalculateScore(editedExtraction);
      // Preserve existing compliance and confidence if not returned
      setAnalysisResult((prev) => ({
        ...prev,
        ...updated,
        compliance: updated.compliance || prev.compliance,
        who_impact: updated.who_impact || prev.who_impact,
        confidence_report: updated.confidence_report || prev.confidence_report,
      }));
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
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
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
          /* Tab 2: Single Label Scanner & Intelligence Suite */
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
                  maxWidth: '720px',
                  margin: '0 auto 16px auto',
                }}>
                  {t('hero_desc')}
                </p>

                {/* 3-Step Intuitive Guide */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '14px',
                  margin: '18px auto 24px auto',
                  flexWrap: 'wrap',
                  maxWidth: '780px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                    }}>1</span>
                    <span>Upload or Snap Label</span>
                  </div>

                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                    }}>2</span>
                    <span>AI Vision Extracts Nutrients</span>
                  </div>

                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(168, 85, 247, 0.2)',
                      color: '#c084fc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                    }}>3</span>
                    <span>Instant WHO & FSSAI Score</span>
                  </div>
                </div>

                {/* Quick Action Badges (Barcode + BYOK Key) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setIsBarcodeOpen(true)}
                    style={{
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: '30px',
                      padding: '8px 20px',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.86rem',
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
                    <Barcode size={17} />
                    <span>{t('scan_barcode_btn')}</span>
                  </button>

                  <button
                    onClick={() => setIsAiSettingsOpen(true)}
                    style={{
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '30px',
                      padding: '8px 20px',
                      color: '#34d399',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)';
                    }}
                  >
                    <KeyRound size={16} />
                    <span>Add Custom API Key (BYOK)</span>
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
              /* Enhanced Results Dashboard with Sub-Tabs */
              <div>
                {/* Top Action Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setActiveTab('compare')}
                      className="btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: '#c084fc', color: '#c084fc' }}
                    >
                      <Swords size={15} /> Compare with Another Snack
                    </button>

                    <button
                      onClick={() => setIsAiSettingsOpen(true)}
                      className="btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                    >
                      <KeyRound size={15} /> AI Settings
                    </button>

                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {analysisResult.processing_time_ms} ms
                    </span>
                  </div>
                </div>

                {/* Intelligence Sub-Tab Selector */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  padding: '6px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '24px',
                  overflowX: 'auto',
                }}>
                  <button
                    onClick={() => setResultSubTab('overview')}
                    style={{
                      background: resultSubTab === 'overview' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      border: resultSubTab === 'overview' ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
                      color: resultSubTab === 'overview' ? '#ffffff' : 'var(--text-secondary)',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Activity size={16} color="var(--accent-cyan)" />
                    <span>Nutrition & Score</span>
                  </button>

                  <button
                    onClick={() => setResultSubTab('who')}
                    style={{
                      background: resultSubTab === 'who' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      border: resultSubTab === 'who' ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                      color: resultSubTab === 'who' ? '#ffffff' : 'var(--text-secondary)',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <HeartPulse size={16} color="#34d399" />
                    <span>Interactive WHO Impact</span>
                  </button>

                  <button
                    onClick={() => setResultSubTab('compliance')}
                    style={{
                      background: resultSubTab === 'compliance' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      border: resultSubTab === 'compliance' ? '1px solid rgba(245, 158, 11, 0.4)' : 'none',
                      color: resultSubTab === 'compliance' ? '#ffffff' : 'var(--text-secondary)',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <FileCheck2 size={16} color="#fbbf24" />
                    <span>FSSAI 2020 Compliance</span>
                  </button>

                  <button
                    onClick={() => setResultSubTab('provenance')}
                    style={{
                      background: resultSubTab === 'provenance' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      border: resultSubTab === 'provenance' ? '1px solid rgba(99, 102, 241, 0.4)' : 'none',
                      color: resultSubTab === 'provenance' ? '#ffffff' : 'var(--text-secondary)',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Layers size={16} color="#a5b4fc" />
                    <span>Confidence & Audit</span>
                  </button>
                </div>

                {/* Sub-Tab 1: Main Overview (Score Gauge + Red Flags + Nutrition Inspector) */}
                {resultSubTab === 'overview' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                    gap: '24px',
                    alignItems: 'start',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <ScoreGauge
                        score={analysisResult.score}
                        disclaimer={analysisResult.disclaimer}
                      />
                      <RedFlagsList redFlags={analysisResult.red_flags} />
                    </div>

                    <div>
                      <NutritionInspector
                        extraction={analysisResult.extraction}
                        onRecalculate={handleRecalculate}
                        isUpdating={isRecalculating}
                      />
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: Interactive WHO Daily Limits Impact */}
                {resultSubTab === 'who' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <WhoImpactCalculator
                      extraction={analysisResult.extraction}
                      servingSizeG={analysisResult.who_impact?.serving_size_g || 30}
                    />
                  </div>
                )}

                {/* Sub-Tab 3: FSSAI 2020 Compliance Checklist */}
                {resultSubTab === 'compliance' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <LabelComplianceCard compliance={analysisResult.compliance} />
                  </div>
                )}

                {/* Sub-Tab 4: Extraction Provenance & Confidence */}
                {resultSubTab === 'provenance' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <ScanConfidenceCard
                      confidenceReport={analysisResult.confidence_report}
                      processingTimeMs={analysisResult.processing_time_ms}
                      scanId={analysisResult.scan_id}
                    />
                  </div>
                )}
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

      {/* AI Settings (BYOK) Modal */}
      <AiSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
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
            LabelLens India — FSSAI 2020 Compliance & Front-of-Pack Nutrition Intelligence.
          </p>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Multi-Provider BYOK (Gemini, OpenAI, AMD ROCm vLLM). Informational only, not medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
