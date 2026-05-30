// app/(tabs)/scan.web.tsx — 100% web: no React Native imports
import React, { useState, useRef, useEffect, CSSProperties } from 'react';
import { supabase } from '../../src/services/supabase';
import { ScanResult } from '../../src/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

type Step = 'pick' | 'camera' | 'preview' | 'loading' | 'result';

// ── Theme ──────────────────────────────────────────────────────────────────────
const C = {
  bg:         '#0A0A0F',
  bgCard:     '#12121A',
  bgElev:     '#1A1A26',
  primary:    '#6C63FF',
  primaryDim: 'rgba(108,99,255,0.12)',
  secondary:  '#00D4AA',
  text:       '#FFFFFF',
  textSec:    '#8B8B9E',
  textTer:    '#52526A',
  border:     '#1E1E2D',
  error:      '#FF5252',
  a1:         '#FF6B6B',
  a2:         '#FFB347',
  a3:         '#00D4AA',
  a4:         '#6C63FF',
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const [step, setStep]               = useState<Step>('pick');
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [blob, setBlob]               = useState<Blob | null>(null);
  const [result, setResult]           = useState<ScanResult | null>(null);
  const [error, setError]             = useState('');

  const fileRef  = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoBoxRef = useRef<HTMLDivElement | null>(null);

  // Hidden file input (created once, lives outside React tree)
  useEffect(() => {
    const input = document.createElement('input');
    input.type    = 'file';
    input.accept  = 'image/*';
    input.style.display = 'none';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStep('preview');
      input.value = '';
    };
    document.body.appendChild(input);
    fileRef.current = input;
    return () => { input.remove(); };
  }, []);

  // Inject <video> into the camera box when stream is ready
  useEffect(() => {
    if (step !== 'camera' || !streamRef.current || !videoBoxRef.current) return;
    const v = document.createElement('video');
    v.srcObject  = streamRef.current;
    v.autoplay   = true;
    v.playsInline = true;
    v.muted      = true;
    Object.assign(v.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    videoBoxRef.current.appendChild(v);
    videoRef.current = v;
    return () => { v.remove(); videoRef.current = null; };
  }, [step]);

  useEffect(() => () => stopStream(), []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  async function openCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Caméra non supportée sur ce navigateur. Utilisez la galerie.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      setStep('camera');
    } catch {
      setError('Accès caméra refusé ou indisponible. Utilisez la galerie.');
    }
  }

  function openGallery() { fileRef.current?.click(); }

  function capturePhoto() {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width  = v.videoWidth  || 1280;
    canvas.height = v.videoHeight || 720;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    canvas.toBlob(b => {
      if (!b) return;
      setBlob(b);
      setPreviewUrl(URL.createObjectURL(b));
      stopStream();
      setStep('preview');
    }, 'image/jpeg', 0.85);
  }

  function cancelCamera() { stopStream(); setStep('pick'); }

  async function analyze() {
    if (!blob) return;
    setStep('loading');
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Non authentifié');

      const fd = new FormData();
      fd.append('image', blob, 'scan.jpg');

      const res = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Analyse échouée');
      }
      setResult(await res.json());
      setStep('result');
    } catch (err: any) {
      setError(err.message ?? 'Analyse échouée');
      setStep('preview');
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setResult(null);
    setError('');
    stopStream();
    setStep('pick');
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (step === 'loading') return (
    <div style={css.screen}>
      <SpinnerCSS />
      <div style={css.center}>
        <div style={css.spinner} />
        <p style={{ ...css.h4, color: C.textSec, marginTop: 16, marginBottom: 4 }}>Analyse en cours…</p>
        <p style={{ ...css.small, color: C.textTer, margin: 0 }}>IA Vision + OpenFoodFacts</p>
      </div>
    </div>
  );

  if (step === 'result' && result) return (
    <div style={{ ...css.screen, overflowY: 'auto' }}>
      <div style={css.scrollContent}>
        {/* Header */}
        <div style={css.resultHeader}>
          <button style={css.ghostLink} onClick={reset}>← Nouveau scan</button>
          <span style={css.badge}>
            {result.type === 'product' ? '📦 Produit' : '🍽️ Repas'}
          </span>
        </div>

        {/* Photo */}
        {previewUrl && <img src={previewUrl} style={css.resultImg} alt="repas scanné" />}

        {/* Source + confidence */}
        <div style={css.metaRow}>
          <span style={{ ...css.small, color: C.textSec }}>
            Source :{' '}
            <span style={{ color: C.primary }}>
              {result.data_source === 'openfoodfacts' ? 'OpenFoodFacts'
                : result.data_source === 'usda' ? 'USDA' : 'Estimation IA'}
            </span>
          </span>
          <ConfidenceDot v={result.confidence_global} />
        </div>

        {/* Total */}
        <div style={css.card}>
          <p style={css.sectionTitle}>Total du repas</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <NutriBadge label="Calories"  value={result.total.calories} unit="kcal" color={C.a4} />
            <NutriBadge label="Protéines" value={result.total.protein}  unit="g"    color={C.a3} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <NutriBadge label="Glucides" value={result.total.carbs} unit="g" color={C.a2} />
            <NutriBadge label="Lipides"  value={result.total.fat}   unit="g" color={C.a1} />
          </div>
        </div>

        {/* Items */}
        {result.items.map((item, i) => (
          <div key={i} style={{ ...css.card, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text, flex: 1 }}>{item.name}</span>
              <span style={{ ...css.small, color: C.textSec }}>{item.quantity}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <MacroChip label="Cal" value={item.calories} unit="kcal" color={C.a4} />
              <MacroChip label="P"   value={item.protein}  unit="g"    color={C.a3} />
              <MacroChip label="G"   value={item.carbs}    unit="g"    color={C.a2} />
              <MacroChip label="L"   value={item.fat}      unit="g"    color={C.a1} />
            </div>
          </div>
        ))}

        <button style={css.primaryBtn} onClick={reset}>Scanner un autre repas</button>
      </div>
    </div>
  );

  if (step === 'preview' && previewUrl) return (
    <div style={{ ...css.screen, position: 'relative' as const }}>
      <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="aperçu" />
      <div style={css.previewOverlay}>
        {error && <div style={css.errorBox}><span style={css.errorText}>{error}</span></div>}
        <p style={{ ...css.h2, color: C.text, margin: '0 0 4px' }}>Photo prête</p>
        <p style={{ ...css.body, color: C.textSec, margin: '0 0 20px' }}>Confirmer l'analyse ?</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button style={css.retakeBtn} onClick={reset}>Reprendre</button>
          <button style={{ ...css.primaryBtn, flex: 1, marginTop: 0 }} onClick={analyze}>Analyser</button>
        </div>
      </div>
    </div>
  );

  if (step === 'camera') return (
    <div style={{ ...css.screen, position: 'relative' as const, background: '#000' }}>
      {/* Video injected here via useEffect */}
      <div ref={videoBoxRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Overlay */}
      <div style={css.camOverlay}>
        {/* Focus corners */}
        <div style={css.focusFrame}>
          {corners.map((c, i) => <div key={i} style={{ ...css.corner, ...c }} />)}
        </div>
        {/* Controls */}
        <div style={css.camControls}>
          <button style={css.cancelBtn} onClick={cancelCamera}>Annuler</button>
          <button style={css.shutterBtn} onClick={capturePhoto}>
            <div style={css.shutterInner} />
          </button>
          <div style={{ width: 80 }} />
        </div>
      </div>
    </div>
  );

  // Pick (default)
  return (
    <div style={{ ...css.screen, overflowY: 'auto' }}>
      <div style={css.scrollContent}>
        <h2 style={{ ...css.h2, color: C.text, marginBottom: 6 }}>Scanner un repas</h2>
        <p style={{ ...css.body, color: C.textSec, marginTop: 0, marginBottom: 24 }}>
          Photographiez une assiette ou un emballage alimentaire
        </p>

        {error && (
          <div style={{ ...css.errorBox, marginBottom: 16 }}>
            <span style={css.errorText}>{error}</span>
          </div>
        )}

        <PickCard
          emoji="📷"
          iconBg={`${C.primary}18`}
          title="Prendre une photo"
          sub="Utilise la caméra de votre appareil"
          onClick={openCamera}
        />
        <PickCard
          emoji="🖼️"
          iconBg={`${C.secondary}18`}
          title="Choisir depuis la galerie"
          sub="Importer une photo existante"
          onClick={openGallery}
        />

        <div style={css.tip}>
          <p style={{ ...css.small, color: C.textSec, margin: 0, lineHeight: '1.6' }}>
            💡 Cadrez bien le repas ou l'étiquette nutritionnelle pour une analyse précise.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PickCard({ emoji, iconBg, title, sub, onClick }: {
  emoji: string; iconBg: string; title: string; sub: string; onClick: () => void;
}) {
  return (
    <button style={css.pickCard} onClick={onClick}>
      <div style={{ ...css.pickIcon, background: iconBg }}>
        <span style={{ fontSize: 36 }}>{emoji}</span>
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>{title}</p>
        <p style={{ ...css.small, color: C.textSec, margin: 0 }}>{sub}</p>
      </div>
      <span style={{ color: C.primary, fontSize: 22 }}>›</span>
    </button>
  );
}

function NutriBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: `${color}15`, borderRadius: 10, padding: '14px 8px', border: `1px solid ${color}30` }}>
      <span style={{ fontSize: 22, fontWeight: 700, color }}>
        {value}<span style={{ fontSize: 11, fontWeight: 400 }}>{unit}</span>
      </span>
      <span style={{ fontSize: 11, fontWeight: 500, color: C.textSec, textTransform: 'uppercase', marginTop: 3 }}>{label}</span>
    </div>
  );
}

function MacroChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>
        {value}<span style={{ fontSize: 9 }}>{unit}</span>
      </span>
      <span style={{ fontSize: 11, color: C.textTer }}>{label}</span>
    </div>
  );
}

function ConfidenceDot({ v }: { v: number }) {
  const color = v >= 0.85 ? '#4CAF50' : v >= 0.6 ? '#FFC107' : C.error;
  const label = v >= 0.85 ? 'High' : v >= 0.6 ? 'Medium' : 'Low';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, color }}>{label} confidence</span>
    </div>
  );
}

function SpinnerCSS() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  );
}

// ── Camera corner definitions ──────────────────────────────────────────────────
const corners: CSSProperties[] = [
  { top: 0, left: 0,  borderTop:    `3px solid ${C.primary}`, borderLeft:  `3px solid ${C.primary}` },
  { top: 0, right: 0, borderTop:    `3px solid ${C.primary}`, borderRight: `3px solid ${C.primary}` },
  { bottom: 0, left: 0,  borderBottom: `3px solid ${C.primary}`, borderLeft:  `3px solid ${C.primary}` },
  { bottom: 0, right: 0, borderBottom: `3px solid ${C.primary}`, borderRight: `3px solid ${C.primary}` },
];

// ── Styles ─────────────────────────────────────────────────────────────────────
const css: Record<string, CSSProperties> = {
  screen: {
    display: 'flex', flexDirection: 'column', minHeight: '100%',
    background: C.bg, boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', flex: 1,
  },

  // Typography
  h2:    { fontSize: 26, fontWeight: 700, letterSpacing: -0.3, margin: 0 },
  h4:    { fontSize: 16, fontWeight: 600, margin: 0 },
  body:  { fontSize: 15, margin: 0 },
  small: { fontSize: 13, margin: 0 },

  // Spinner
  spinner: {
    width: 48, height: 48, borderRadius: '50%',
    border: `3px solid ${C.primaryDim}`,
    borderTopColor: C.primary,
    animation: 'spin 0.8s linear infinite',
  },

  // Scroll containers
  scrollContent: { padding: '60px 24px 100px', boxSizing: 'border-box' },

  // Pick
  pickCard: {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
    width: '100%', background: C.bgCard, borderRadius: 16,
    padding: 16, marginBottom: 12, border: `1px solid ${C.border}`,
    gap: 16, cursor: 'pointer', boxSizing: 'border-box',
    textAlign: 'left',
  },
  pickIcon: {
    width: 64, height: 64, borderRadius: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tip: {
    marginTop: 20, background: C.bgElev, borderRadius: 12, padding: '12px 16px',
  },

  // Camera
  camOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '60px 24px 40px',
  },
  focusFrame: {
    alignSelf: 'center', width: 260, height: 260, position: 'relative',
  },
  corner: {
    position: 'absolute', width: 30, height: 30, borderRadius: 3,
  },
  camControls: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  cancelBtn: {
    width: 80, height: 52, background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.8)', fontSize: 15, cursor: 'pointer',
  },
  shutterBtn: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)', border: '3px solid #fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxSizing: 'border-box',
  },
  shutterInner: {
    width: 60, height: 60, borderRadius: '50%', background: '#fff',
  },

  // Preview
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'rgba(10,10,15,0.95)', padding: 24,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40,
    boxSizing: 'border-box',
  },
  retakeBtn: {
    background: 'transparent', border: 'none', color: C.textSec,
    fontSize: 15, cursor: 'pointer', padding: '0 16px', height: 52,
  },

  // Result
  resultHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  resultImg: {
    width: '100%', height: 200, objectFit: 'cover', borderRadius: 16, marginBottom: 16,
    display: 'block',
  },
  metaRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },

  // Cards
  card: {
    background: C.bgCard, borderRadius: 16, padding: 16,
    border: `1px solid ${C.border}`, marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 12px' },
  badge: {
    padding: '4px 10px', background: C.bgElev, borderRadius: 999,
    border: `1px solid ${C.border}`, fontSize: 12, color: C.textSec,
  },

  // Buttons
  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 52, background: C.primary,
    color: '#fff', border: 'none', borderRadius: 999,
    fontSize: 16, fontWeight: 600, cursor: 'pointer',
    marginTop: 12, boxSizing: 'border-box',
  },
  ghostLink: {
    background: 'transparent', border: 'none', color: C.primary,
    fontSize: 15, cursor: 'pointer', padding: '6px 0',
  },

  // Error
  errorBox: {
    background: 'rgba(255,82,82,0.1)', borderRadius: 10,
    border: '1px solid rgba(255,82,82,0.3)', padding: '8px 12px',
  },
  errorText: { fontSize: 13, color: C.error },
};
