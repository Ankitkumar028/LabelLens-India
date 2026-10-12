import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let activeStream = null;
    setCameraError(null);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        activeStream = stream;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError('Camera access unavailable. Please check browser permissions or upload an image file.');
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        onClose();
      }
    }, 'image/jpeg', 0.92);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid var(--border-subtle)',
        borderRadius: '20px',
        maxWidth: '640px',
        width: '100%',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Align Food Label to Capture</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Area */}
        <div style={{
          position: 'relative',
          background: '#020617',
          height: '380px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {cameraError ? (
            <div style={{ padding: '24px', textAlign: 'center', maxWidth: '360px' }}>
              <AlertCircle size={36} color="#ef4444" style={{ marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Overlay targeting box */}
              <div style={{
                position: 'absolute',
                inset: '30px',
                border: '2px dashed rgba(56, 189, 248, 0.6)',
                borderRadius: '16px',
                pointerEvents: 'none',
              }} />
            </>
          )}
        </div>

        {/* Controls */}
        <div style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.95)',
        }}>
          <button
            onClick={toggleFacingMode}
            title="Switch camera"
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={handleCapture}
            disabled={!!cameraError}
            className="btn-primary"
            style={{
              borderRadius: '50px',
              padding: '12px 32px',
              fontSize: '1rem',
              opacity: cameraError ? 0.5 : 1,
            }}
          >
            <Camera size={20} />
            Capture Label
          </button>
        </div>
      </div>
    </div>
  );
}
