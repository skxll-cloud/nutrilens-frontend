// app/(tabs)/_layout.web.tsx — web-only layout: custom tab bar + scan overlay FAB
// No React Native imports — pure HTML/CSS
import React, { useState, useRef, useEffect, CSSProperties } from 'react';
import { Slot, usePathname } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import type { ScanResult } from '../../src/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

const C = {
  bg:      '#0A0A0F',
  bgCard:  '#13131A',
  bgElev:  '#1C1C26',
  primary: '#00E5A0',
  primDim: 'rgba(0,229,160,0.12)',
  text:    '#FFFFFF',
  textSec: 'rgba(255,255,255,0.6)',
  textTer: 'rgba(255,255,255,0.35)',
  border:  'rgba(255,255,255,0.08)',
  error:   '#FF6B6B',
  a1:      '#FF6B6B',
  a2:      '#FFB347',
  a3:      '#4ECDC4',
  a4:      '#00E5A0',
};

// ── Root layout ────────────────────────────────────────────────────────────────

export default function WebTabLayout() {
  const [scanOpen, setScanOpen] = useState(false);
  const path = usePathname();

  return (
    <div style={s.root}>
      <SpinnerKeyframe />

      {/* Page content */}
      <div style={s.content}>
        <Slot />
      </div>

      {/* Bottom tab bar — 3 tabs, no scan */}
      <nav style={s.tabBar}>
        <TabLink href="/"        emoji="🏠" label="Accueil"    active={path === '/' || path === '/index'} />
        <TabLink href="/history" emoji="📋" label="Historique" active={path === '/history'} />
        <TabLink href="/profile" emoji="⚙️" label="Profil"     active={path === '/profile'} />
      </nav>

      {/* Camera FAB */}
      <button
        style={s.fab}
        onClick={() => setScanOpen(true)}
        aria-label="Scanner un repas"
      >
        <span style={{ fontSize: 26 }}>📷</span>
      </button>

      {/* Scan overlay */}
      {scanOpen && (
        <div style={s.overlay}>
          <ScanOverlay onClose={() => setScanOpen(false)} />
        </div>
      )}
    </div>
  );
}

// ── Tab link ───────────────────────────────────────────────────────────────────

function TabLink({ href, emoji, label, active }: {
  href: string; emoji: string; label: string; active: boolean;
}) {
  return (
    <a href={href} style={{ ...s.tabItem, ...(active ? s.tabItemActive : {}) }}>
      <span style={{ fontSize: 20 }}>{emoji}</span>
      {active && <span style={s.tabLabel}>{label}</span>}
    </a>
  );
}

// ── Scan overlay ───────────────────────────────────────────────────────────────

type Step = 'pick' | 'camera' | 'preview' | 'loading' | 'result';

function ScanOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep]             = useState<Step>('pick');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob]             = useState<Blob | null>(null);
  const [result, setResult]         = useState<ScanResult | null>(null);
  const [error, setError]           = useState('');

  const fileRef     = useRef<HTMLInputElement | null>(null);
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const videoBoxRef = useRef<HTMLDivElement | null>(null);

  // Hidden file input
  useEffect(() => {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
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

  // Inject <video> when camera step starts
  useEffect(() => {
    if (step !== 'camera' || !streamRef.current || !videoBoxRef.current) return;
    const v = document.createElement('video');
    v.srcObject   = streamRef.current;
    v.autoplay    = true;
    v.playsInline = true;
    v.muted       = true;
    Object.assign(v.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    videoBoxRef.current.appendChild(v);
    videoRef.current = v;
    return () => { v.remove(); videoRef.current = null; };
  }, [step]);

  useEffect(() => () => stopStream(), []);

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
      setError('Accès caméra refusé. Utilisez la galerie.');
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

  function closeOverlay() { reset(); onClose(); }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (step === 'loading') return (
    <div style={{ ...sc.screen, background: C.bg }}>
      <div style={sc.center}>
        <div style={sc.spinner} />
        <p style={{ color: C.textSec, marginTop: 16, marginBottom: 4, fontSize: 16 }}>Analyse en cours…</p>
        <p style={{ color: C.textTer, margin: 0, fontSize: 13 }}>IA Vision + OpenFoodFacts</p>
      </div>
    </div>
  );

  // ── Result ────────────────────────────────────────────────────────────────────
  if (step === 'result' && result) return (
    <div style={{ ...sc.screen, background: C.bg, overflowY: 'auto' }}>
      <div style={sc.scrollPad}>
        <div style={sc.rowBetween}>
          <button style={sc.ghostBtn} onClick={reset}>← Nouveau scan</button>
          <button style={sc.ghostBtn} onClick={closeOverlay}>✕ Fermer</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={sc.badge}>{result.type === 'product' ? '📦 Produit' : '🍽️ Repas'}</span>
          <ConfidenceDot v={result.confidence_global} />
        </div>

        {previewUrl && <img src={previewUrl} style={sc.resultImg} alt="repas" />}

        <p style={{ ...sc.small, color: C.textSec, marginBottom: 16 }}>
          Source : <span style={{ color: C.primary }}>
            {result.data_source === 'openfoodfacts' ? 'OpenFoodFacts'
              : result.data_source === 'usda' ? 'USDA' : 'Estimation IA'}
          </span>
        </p>

        <div style={sc.card}>
          <p style={sc.sectionTitle}>Total du repas</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <NutriBadge label="Calories"  value={result.total.calories} unit="kcal" color={C.a4} />
            <NutriBadge label="Protéines" value={result.total.protein}  unit="g"    color={C.a3} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <NutriBadge label="Glucides" value={result.total.carbs} unit="g" color={C.a2} />
            <NutriBadge label="Lipides"  value={result.total.fat}   unit="g" color={C.a1} />
          </div>
        </div>

        {result.items.map((item, i) => (
          <div key={i} style={{ ...sc.card, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text, flex: 1 }}>{item.name}</span>
              <span style={{ ...sc.small, color: C.textSec }}>{item.quantity}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <MacroChip label="Cal" value={item.calories} unit="kcal" color={C.a4} />
              <MacroChip label="P"   value={item.protein}  unit="g"    color={C.a3} />
              <MacroChip label="G"   value={item.carbs}    unit="g"    color={C.a2} />
              <MacroChip label="L"   value={item.fat}      unit="g"    color={C.a1} />
            </div>
          </div>
        ))}

        <button style={{ ...sc.primaryBtn, marginTop: 8 }} onClick={reset}>Scanner un autre repas</button>
        <button style={{ ...sc.secondaryBtn, marginTop: 8 }} onClick={closeOverlay}>Fermer</button>
      </div>
    </div>
  );

  // ── Preview ───────────────────────────────────────────────────────────────────
  if (step === 'preview' && previewUrl) return (
    <div style={{ ...sc.screen, position: 'relative', background: '#000' }}>
      <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="aperçu" />
      <div style={sc.previewOverlay}>
        {error && <div style={sc.errorBox}><span style={sc.errorText}>{error}</span></div>}
        <p style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Photo prête</p>
        <p style={{ color: C.textSec, fontSize: 15, margin: '0 0 20px' }}>Confirmer l'analyse ?</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button style={sc.retakeBtn} onClick={reset}>Reprendre</button>
          <button style={{ ...sc.primaryBtn, flex: 1, marginTop: 0 }} onClick={analyze}>Analyser</button>
        </div>
        <button style={{ ...sc.ghostBtn, marginTop: 12, width: '100%', textAlign: 'center' }} onClick={closeOverlay}>
          Annuler
        </button>
      </div>
    </div>
  );

  // ── Camera ────────────────────────────────────────────────────────────────────
  if (step === 'camera') return (
    <div style={{ ...sc.screen, position: 'relative', background: '#000' }}>
      <div ref={videoBoxRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={sc.camOverlay}>
        <div style={sc.focusFrame}>
          {CORNERS.map((c, i) => <div key={i} style={{ ...sc.corner, ...c }} />)}
        </div>
        <div style={sc.camControls}>
          <button style={sc.cancelBtn} onClick={cancelCamera}>Annuler</button>
          <button style={sc.shutterBtn} onClick={capturePhoto}>
            <div style={sc.shutterInner} />
          </button>
          <div style={{ width: 80 }} />
        </div>
      </div>
    </div>
  );

  // ── Pick ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...sc.screen, background: C.bg, overflowY: 'auto' }}>
      <div style={sc.scrollPad}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ color: C.text, fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>Scanner un repas</h2>
            <p style={{ color: C.textSec, fontSize: 15, margin: 0 }}>
              Photographiez une assiette ou un emballage
            </p>
          </div>
          <button style={sc.closeBtn} onClick={closeOverlay} aria-label="Fermer">✕</button>
        </div>

        {error && <div style={{ ...sc.errorBox, marginBottom: 16 }}><span style={sc.errorText}>{error}</span></div>}

        <ScanPickCard
          emoji="📷"
          bg={`${C.primary}18`}
          title="Prendre une photo"
          sub="Utilise la caméra de votre appareil"
          onClick={openCamera}
        />
        <ScanPickCard
          emoji="🖼️"
          bg="rgba(123,97,255,0.12)"
          title="Choisir depuis la galerie"
          sub="Importer une photo existante"
          onClick={openGallery}
        />

        <div style={sc.tip}>
          <p style={{ color: C.textSec, fontSize: 13, margin: 0, lineHeight: '1.6' }}>
            💡 Cadrez bien le repas ou l'étiquette nutritionnelle pour une analyse précise.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────────

function ScanPickCard({ emoji, bg, title, sub, onClick }: {
  emoji: string; bg: string; title: string; sub: string; onClick: () => void;
}) {
  return (
    <button style={sc.pickCard} onClick={onClick}>
      <div style={{ ...sc.pickIcon, background: bg }}>
        <span style={{ fontSize: 36 }}>{emoji}</span>
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>{title}</p>
        <p style={{ fontSize: 13, color: C.textSec, margin: 0 }}>{sub}</p>
      </div>
      <span style={{ color: C.primary, fontSize: 22 }}>›</span>
    </button>
  );
}

function NutriBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: `${color}15`, borderRadius: 10, padding: '12px 6px', border: `1px solid ${color}30` }}>
      <span style={{ fontSize: 20, fontWeight: 700, color }}>
        {value}<span style={{ fontSize: 10, fontWeight: 400 }}>{unit}</span>
      </span>
      <span style={{ fontSize: 10, color: C.textSec, textTransform: 'uppercase', marginTop: 2 }}>{label}</span>
    </div>
  );
}

function MacroChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>
        {value}<span style={{ fontSize: 9 }}>{unit}</span>
      </span>
      <span style={{ fontSize: 10, color: C.textTer }}>{label}</span>
    </div>
  );
}

function ConfidenceDot({ v }: { v: number }) {
  const color = v >= 0.85 ? '#4CAF50' : v >= 0.6 ? '#FFB347' : C.error;
  const label = v >= 0.85 ? 'Élevée' : v >= 0.6 ? 'Moyenne' : 'Faible';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, color }}>Confiance {label}</span>
    </div>
  );
}

function SpinnerKeyframe() {
  return <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>;
}

// ── Camera corners ─────────────────────────────────────────────────────────────
const CORNERS: CSSProperties[] = [
  { top: 0,    left: 0,  borderTop:    `3px solid ${C.primary}`, borderLeft:  `3px solid ${C.primary}` },
  { top: 0,    right: 0, borderTop:    `3px solid ${C.primary}`, borderRight: `3px solid ${C.primary}` },
  { bottom: 0, left: 0,  borderBottom: `3px solid ${C.primary}`, borderLeft:  `3px solid ${C.primary}` },
  { bottom: 0, right: 0, borderBottom: `3px solid ${C.primary}`, borderRight: `3px solid ${C.primary}` },
];

// ── Styles ─────────────────────────────────────────────────────────────────────

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const s: Record<string, CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: C.bg, fontFamily: FONT, position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1, overflowY: 'auto',
  },
  tabBar: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    height: 72, background: C.bgCard,
    borderTop: `1px solid ${C.border}`,
    flexShrink: 0,
  },
  tabItem: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, padding: '4px 12px', borderRadius: 12, minWidth: 50,
    textDecoration: 'none', color: C.textSec, fontSize: 12, fontWeight: 600,
  },
  tabItemActive: {
    background: C.primDim, color: C.primary,
  },
  tabLabel: {
    fontSize: 12, color: C.primary, fontWeight: 600,
  },
  fab: {
    position: 'absolute', bottom: 84, right: 20,
    width: 60, height: 60, borderRadius: '50%',
    background: C.primary, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 4px 20px rgba(0,229,160,0.4)`,
    zIndex: 100,
  },
  overlay: {
    position: 'absolute', inset: 0, zIndex: 200,
  },
};

const sc: Record<string, CSSProperties> = {
  screen: {
    display: 'flex', flexDirection: 'column', height: '100%',
    fontFamily: FONT, boxSizing: 'border-box',
  },
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', flex: 1,
  },
  spinner: {
    width: 48, height: 48, borderRadius: '50%',
    border: '3px solid rgba(0,229,160,0.15)',
    borderTopColor: C.primary,
    animation: '_spin 0.8s linear infinite',
  },
  scrollPad: { padding: '24px 20px 100px', boxSizing: 'border-box' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  small:      { fontSize: 13, margin: 0 },

  // Pick
  pickCard: {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
    width: '100%', background: C.bgCard, borderRadius: 16,
    padding: 16, marginBottom: 12, border: `1px solid ${C.border}`,
    gap: 16, cursor: 'pointer', boxSizing: 'border-box', textAlign: 'left',
  },
  pickIcon: {
    width: 64, height: 64, borderRadius: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tip: { marginTop: 16, background: C.bgElev, borderRadius: 12, padding: '12px 16px' },

  // Camera
  camOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '40px 24px 40px',
  },
  focusFrame: { alignSelf: 'center', width: 260, height: 260, position: 'relative', flexShrink: 0 },
  corner: { position: 'absolute', width: 30, height: 30, borderRadius: 3 },
  camControls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
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
  shutterInner: { width: 60, height: 60, borderRadius: '50%', background: '#fff' },

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
  resultImg: {
    width: '100%', height: 200, objectFit: 'cover',
    borderRadius: 16, marginBottom: 16, display: 'block',
  },
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
    color: '#000', border: 'none', borderRadius: 999,
    fontSize: 16, fontWeight: 700, cursor: 'pointer', boxSizing: 'border-box',
  },
  secondaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 52, background: 'transparent',
    color: C.primary, border: `1px solid ${C.primary}`, borderRadius: 999,
    fontSize: 16, fontWeight: 600, cursor: 'pointer', boxSizing: 'border-box',
  },
  ghostBtn: {
    background: 'transparent', border: 'none', color: C.primary,
    fontSize: 15, cursor: 'pointer', padding: '6px 0',
  },
  closeBtn: {
    background: C.bgElev, border: `1px solid ${C.border}`,
    color: C.textSec, width: 36, height: 36, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 16, flexShrink: 0,
  },

  // Error
  errorBox: {
    background: 'rgba(255,107,107,0.1)', borderRadius: 10,
    border: '1px solid rgba(255,107,107,0.3)', padding: '8px 12px',
  },
  errorText: { fontSize: 13, color: C.error },
};
