import React, { useRef, useState } from 'react';
import { UploadCloud, Camera, Image as ImageIcon, X, RefreshCw } from 'lucide-react';

export default function ImageUploader({
  onImageSelected,
  onOpenLiveCamera,
  selectedImage,
  onClearImage,
  isLoading,
}) {
  const fileInputRef = useRef(null);
  const mobileCameraInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      validateAndProcess(file);
    }
  };

  const validateAndProcess = (file) => {
    setDragError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setDragError('Only JPEG, PNG, and WebP images are supported.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setDragError('Image exceeds maximum allowed size of 8 MB.');
      return;
    }
    onImageSelected(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '28px', textAlign: 'center' }}>
      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {/* Mobile native camera capture */}
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {selectedImage ? (
        /* Image Preview State */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            position: 'relative',
            borderRadius: '14px',
            overflow: 'hidden',
            border: '2px solid rgba(56, 189, 248, 0.4)',
            maxWidth: '360px',
            maxHeight: '260px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}>
            <img
              src={selectedImage.previewUrl}
              alt="Label Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <button
              onClick={onClearImage}
              title="Remove image"
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {selectedImage.file?.name || 'Selected Label Image'}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              <RefreshCw size={14} /> Change Image
            </button>
          </div>
        </div>
      ) : (
        /* Dropzone / Upload state */
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: '16px',
              padding: '40px 20px',
              background: isDragging ? 'rgba(56, 189, 248, 0.05)' : 'rgba(15, 23, 42, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(56, 189, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--accent-cyan)',
            }}>
              <UploadCloud size={32} />
            </div>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', fontWeight: 700 }}>
              Drag & Drop your food label photo
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 20px auto' }}>
              Upload nutrition table or ingredient list. JPEG, PNG, or WebP up to 8 MB.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <ImageIcon size={18} />
                Browse Files
              </button>

              {/* Mobile native camera prompt */}
              <button
                type="button"
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  // Check if touch device; mobile camera input opens camera directly
                  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                    mobileCameraInputRef.current?.click();
                  } else {
                    onOpenLiveCamera();
                  }
                }}
              >
                <Camera size={18} color="var(--accent-cyan)" />
                Snap with Camera
              </button>
            </div>
          </div>

          {dragError && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '12px' }}>
              {dragError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
