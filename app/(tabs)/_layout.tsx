// app/(tabs)/_layout.tsx
import React, {
  useState, useRef, useEffect, createContext, useContext,
} from 'react';
import type { CSSProperties } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Tabs, Slot, usePathname } from 'expo-router';
import { Colors, Spacing } from '../../src/utils/theme';
import { supabase } from '../../src/services/supabase';
import type { ScanResult } from '../../src/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

/* ── Scan context — lets child screens open the overlay on web ─────────── */
const ScanCtx = createContext<{ openScan: () => void }>({ openScan: () => {} });
export const useScan = () => useContext(ScanCtx);

/* ── Root export ─────────────────────────────────────────────────────────── */
export default function TabLayout() {
  if (Platform.OS === 'web') return <WebLayout />;
  return <NativeLayout />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   NATIVE LAYOUT
═══════════════════════════════════════════════════════════════════════════ */

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[ns.tabItem, focused && ns.tabItemActive]}>
      <Text style={ns.emoji}>{emoji}</Text>
      {focused && <Text style={ns.tabLabel}>{label}</Text>}
    </View>
  );
}

function NativeLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgCard,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index"   options={{ href: '/',        tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Accueil"    focused={focused} /> }} />
      <Tabs.Screen name="scan"    options={{ href: '/scan',    tabBarIcon: ({ focused }) => <TabIcon emoji="📷" label="Scanner"    focused={focused} /> }} />
      <Tabs.Screen name="history" options={{ href: '/history', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Historique" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ href: '/profile', tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Profil"     focused={focused} /> }} />
    </Tabs>
  );
}

const ns = StyleSheet.create({
  tabItem: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: 12, minWidth: 50,
  },
  tabItemActive: {
    backgroundColor: Colors.primaryDim, flexDirection: 'row', gap: 4, paddingHorizontal: 12,
  },
  emoji: { fontSize: 20 },
  tabLabel: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
});

/* ═══════════════════════════════════════════════════════════════════════════
   WEB LAYOUT
═══════════════════════════════════════════════════════════════════════════ */

const C = {
  bg:     '#0A0A0F',
  card:   '#13131A',
  elev:   '#1C1C26',
  green:  '#00E5A0',
  text:   '#FFFFFF',
  muted:  'rgba(255,255,255,0.6)',
  faint:  'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.08)',
  red:    '#FF6B6B',
  a1:     '#FF6B6B',
  a2:     '#FFB347',
  a3:     '#4ECDC4',
  a4:     '#00E5A0',
};
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function WebLayout() {
  const [scanOpen, setScanOpen] = useState(false);
  const path = usePathname();

  return (
    <ScanCtx.Provider value={{ openScan: () => setScanOpen(true) }}>
      <div style={ws.root}>
        <SpinnerStyle />

        {/* Page content */}
        <div style={ws.content}><Slot /></div>

        {/* Bottom nav bar: Accueil | Historique | 📷 | Profil */}
        <nav style={ws.nav}>
          <NavLink href="/"        emoji="🏠" label="Accueil"    active={path === '/' || path === '/index'} />
          <NavLink href="/history" emoji="📋" label="Historique" active={path === '/history'} />
          <button style={ws.camBtn} onClick={() => setScanOpen(true)} aria-label="Scanner un repas">
            <div style={ws.camCircle}><span style={{ fontSize: 24 }}>📷</span></div>
          </button>
          <NavLink href="/profile" emoji="⚙️" label="Profil"     active={path === '/profile'} />
        </nav>

        {/* Scan overlay */}
        {scanOpen && (
          <div style={ws.overlay}>
            <ScanOverlay onClose={() => setScanOpen(false)} />
          </div>
        )}
      </div>
    </ScanCtx.Provider>
  );
}

function NavLink({ href, emoji, label, active }: {
  href: string; emoji: string; label: string; active: boolean;
}) {
  return (
    <a href={href} style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '6px 0', height: '100%', cursor: 'pointer',
      textDecoration: 'none', color: active ? C.green : C.muted, gap: 2,
    } as CSSProperties}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: active ? '600' : '400' } as CSSProperties}>{label}</span>
    </a>
  );
}

const ws: Record<string, CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', background: C.bg, fontFamily: FONT,
    position: 'relative', overflow: 'hidden',
  },
  content: { flex: 1, overflowY: 'auto' as any },
  nav: {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
    height: 72, background: C.card,
    borderTop: `1px solid ${C.border}`,
    flexShrink: 0, zIndex: 10,
  },
  camBtn: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    height: '100%', padding: 0,
  },
  camCircle: {
    width: 52, height: 52, borderRadius: '50%',
    background: C.green, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 2px 16px rgba(0,229,160,0.45)`,
  },
  overlay: {
    position: 'absolute', inset: 0, zIndex: 200, background: C.bg,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   SCAN OVERLAY
═══════════════════════════════════════════════════════════════════════════ */

type Step = 'pick' | 'camera' | 'preview' | 'loading' | 'result';

function ScanOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep]     = useState<Step>('pick');
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [blob, setBlob]     = useState<Blob | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError]   = useState('');

  const galleryRef = useRef<HTMLInputElement | null>(null);
  const boxRef     = useRef<HTMLDivElement | null>(null);
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  /* Hidden file input for gallery picker */
  useEffect(() => {
    const el = document.createElement('input');
    el.type = 'file'; el.accept = 'image/*'; el.style.display = 'none';
    el.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setBlob(file);
      setImgUrl(URL.createObjectURL(file));
      setStep('preview');
      el.value = '';
    };
    document.body.appendChild(el);
    galleryRef.current = el;
    return () => el.remove();
  }, []);

  /* Inject <video> once stream is ready */
  useEffect(() => {
    if (step !== 'camera' || !streamRef.current || !boxRef.current) return;
    const v = document.createElement('video');
    v.srcObject = streamRef.current;
    v.autoplay = true; v.playsInline = true; v.muted = true;
    Object.assign(v.style, {
      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
    });
    boxRef.current.appendChild(v);
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
      setError('getUserMedia non supporté. Utilisez « Choisir une photo ».');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      setStep('camera');
    } catch {
      setError('Accès caméra refusé. Utilisez « Choisir une photo ».');
    }
  }

  function capturePhoto() {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    canvas.toBlob(b => {
      if (!b) return;
      setBlob(b);
      setImgUrl(URL.createObjectURL(b));
      stopStream();
      setStep('preview');
    }, 'image/jpeg', 0.85);
  }

  function reset() {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setBlob(null); setImgUrl(null); setResult(null); setError('');
    stopStream();
    setStep('pick');
  }

  function closeAll() { reset(); onClose(); }

  async function analyze() {
    if (!blob) return;
    setStep('loading'); setError('');
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
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Analyse échouée');
      }
      setResult(await res.json());
      setStep('result');
    } catch (e: any) {
      setError(e.message ?? 'Analyse échouée');
      setStep('preview');
    }
  }

  /* ── Loading ── */
  if (step === 'loading') return (
    <div style={{ ...so.screen, background: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <div style={so.spinner} />
      <p style={{ color: C.muted, marginTop: 16, fontSize: 16, margin: '16px 0 4px' }}>Analyse en cours…</p>
      <p style={{ color: C.faint, margin: 0, fontSize: 13 }}>IA Vision + OpenFoodFacts</p>
    </div>
  );

  /* ── Result ── */
  if (step === 'result' && result) return (
    <div style={{ ...so.screen, background: C.bg, overflowY: 'auto' as any }}>
      <div style={so.pad}>
        <div style={so.row}>
          <button style={so.ghost} onClick={reset}>← Nouveau scan</button>
          <button style={so.ghost} onClick={closeAll}>✕ Fermer</button>
        </div>
        {imgUrl && <img src={imgUrl} style={so.thumb} alt="" />}
        <div style={so.card}>
          <p style={so.cardTitle}>Total du repas</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill label="Calories"  v={result.total.calories} u="kcal" c={C.a4} />
            <Pill label="Protéines" v={result.total.protein}  u="g"    c={C.a3} />
            <Pill label="Glucides"  v={result.total.carbs}    u="g"    c={C.a2} />
            <Pill label="Lipides"   v={result.total.fat}      u="g"    c={C.a1} />
          </div>
        </div>
        {result.items.map((item, i) => (
          <div key={i} style={{ ...so.card, marginBottom: 8 }}>
            <div style={so.row}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text } as CSSProperties}>{item.name}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{item.quantity}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Chip l="Cal" v={item.calories} u="kcal" c={C.a4} />
              <Chip l="P"   v={item.protein}  u="g"    c={C.a3} />
              <Chip l="G"   v={item.carbs}    u="g"    c={C.a2} />
              <Chip l="L"   v={item.fat}      u="g"    c={C.a1} />
            </div>
          </div>
        ))}
        <button style={so.primary} onClick={reset}>Scanner un autre repas</button>
        <button style={so.outline}  onClick={closeAll}>Fermer</button>
      </div>
    </div>
  );

  /* ── Preview ── */
  if (step === 'preview' && imgUrl) return (
    <div style={{ ...so.screen, position: 'relative', background: '#000' }}>
      <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
      <div style={so.previewPanel}>
        {error && <div style={{ ...so.errBox, marginBottom: 12 }}><span style={{ fontSize: 13, color: C.red }}>{error}</span></div>}
        <p style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: '0 0 4px' } as CSSProperties}>Photo prête</p>
        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 20px' }}>Confirmer l'analyse ?</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={so.ghost} onClick={reset}>Reprendre</button>
          <button style={{ ...so.primary, flex: 1, marginTop: 0 }} onClick={analyze}>Analyser</button>
        </div>
        <button style={{ ...so.ghost, width: '100%', textAlign: 'center', marginTop: 12 } as CSSProperties} onClick={closeAll}>
          Annuler
        </button>
      </div>
    </div>
  );

  /* ── Camera ── */
  if (step === 'camera') return (
    <div style={{ ...so.screen, position: 'relative', background: '#000' }}>
      <div ref={boxRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={so.camOverlay}>
        <div style={{ alignSelf: 'center', width: 250, height: 250, position: 'relative', flexShrink: 0 }}>
          {CORNERS.map((c, i) => <div key={i} style={{ position: 'absolute', width: 28, height: 28, borderRadius: 3, ...c }} />)}
        </div>
        <div style={so.camControls}>
          <button style={so.camCancel} onClick={() => { stopStream(); setStep('pick'); }}>Annuler</button>
          <button style={so.shutter} onClick={capturePhoto}><div style={so.shutterInner} /></button>
          <div style={{ width: 80 }} />
        </div>
      </div>
    </div>
  );

  /* ── Pick ── */
  return (
    <div style={{ ...so.screen, background: C.bg, overflowY: 'auto' as any }}>
      <div style={so.pad}>
        <div style={{ ...so.row, marginBottom: 8 }}>
          <h2 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0 } as CSSProperties}>Scanner un repas</h2>
          <button style={so.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px' }}>Photographiez une assiette ou un emballage</p>

        {error && <div style={{ ...so.errBox, marginBottom: 16 }}><span style={{ fontSize: 13, color: C.red }}>{error}</span></div>}

        <PickCard emoji="📷" title="Prendre une photo"          sub="Caméra de votre appareil"     onClick={openCamera} />
        <PickCard emoji="🖼️" title="Choisir depuis la galerie"  sub="Importer une photo existante" onClick={() => galleryRef.current?.click()} />

        <div style={so.tip}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: '1.6' }}>
            💡 Cadrez bien le repas ou l'étiquette pour une analyse précise.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Small components ─────────────────────────────────────────────────────── */

function PickCard({ emoji, title, sub, onClick }: {
  emoji: string; title: string; sub: string; onClick: () => void;
}) {
  return (
    <button style={so.pickCard} onClick={onClick}>
      <div style={so.pickIcon}><span style={{ fontSize: 32 }}>{emoji}</span></div>
      <div style={{ flex: 1, textAlign: 'left' } as CSSProperties}>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 2px' } as CSSProperties}>{title}</p>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{sub}</p>
      </div>
      <span style={{ color: C.green, fontSize: 20 }}>›</span>
    </button>
  );
}

function Pill({ label, v, u, c }: { label: string; v: number; u: string; c: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: `${c}15`, borderRadius: 10, padding: '10px 4px', border: `1px solid ${c}30` }}>
      <span style={{ fontSize: 17, fontWeight: 700, color: c } as CSSProperties}>{v}<span style={{ fontSize: 10 }}>{u}</span></span>
      <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase' } as CSSProperties}>{label}</span>
    </div>
  );
}

function Chip({ l, v, u, c }: { l: string; v: number; u: string; c: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: c } as CSSProperties}>{v}<span style={{ fontSize: 9 }}>{u}</span></span>
      <span style={{ fontSize: 10, color: C.faint }}>{l}</span>
    </div>
  );
}

/* ── CSS helpers ─────────────────────────────────────────────────────────── */

function SpinnerStyle() {
  return <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>;
}

const CORNERS: CSSProperties[] = [
  { top: 0,    left: 0,  borderTop:    `3px solid ${C.green}`, borderLeft:  `3px solid ${C.green}` },
  { top: 0,    right: 0, borderTop:    `3px solid ${C.green}`, borderRight: `3px solid ${C.green}` },
  { bottom: 0, left: 0,  borderBottom: `3px solid ${C.green}`, borderLeft:  `3px solid ${C.green}` },
  { bottom: 0, right: 0, borderBottom: `3px solid ${C.green}`, borderRight: `3px solid ${C.green}` },
];

const so: Record<string, CSSProperties> = {
  screen: {
    display: 'flex', flexDirection: 'column', height: '100%',
    fontFamily: FONT, boxSizing: 'border-box',
  },
  pad:    { padding: '24px 20px 100px', boxSizing: 'border-box' },
  row:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  spinner: {
    width: 48, height: 48, borderRadius: '50%',
    border: '3px solid rgba(0,229,160,0.15)',
    borderTopColor: C.green,
    animation: '_sp 0.8s linear infinite',
  },
  thumb: {
    width: '100%', height: 200, objectFit: 'cover',
    borderRadius: 16, marginBottom: 16, display: 'block',
  },
  card: {
    background: C.card, borderRadius: 16, padding: 16,
    border: `1px solid ${C.border}`, marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 12px' },
  previewPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'rgba(10,10,15,0.96)', padding: '24px 24px 40px',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, boxSizing: 'border-box',
  },
  camOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', padding: '40px 24px',
  },
  camControls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  camCancel: {
    width: 80, height: 52, background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.8)', fontSize: 15, cursor: 'pointer',
  },
  shutter: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)', border: '3px solid #fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxSizing: 'border-box',
  },
  shutterInner: { width: 60, height: 60, borderRadius: '50%', background: '#fff' },
  pickCard: {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
    width: '100%', background: C.card, borderRadius: 16,
    padding: 16, marginBottom: 12, border: `1px solid ${C.border}`,
    gap: 16, cursor: 'pointer', boxSizing: 'border-box',
  },
  pickIcon: {
    width: 60, height: 60, borderRadius: 12, flexShrink: 0,
    background: 'rgba(0,229,160,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tip: { marginTop: 8, background: C.elev, borderRadius: 12, padding: '12px 16px' },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 52, background: C.green,
    color: '#000', border: 'none', borderRadius: 999,
    fontSize: 16, fontWeight: 700, cursor: 'pointer',
    boxSizing: 'border-box', marginTop: 12,
  },
  outline: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 52, background: 'transparent',
    color: C.green, border: `1px solid ${C.green}`, borderRadius: 999,
    fontSize: 16, fontWeight: 600, cursor: 'pointer',
    boxSizing: 'border-box', marginTop: 8,
  },
  ghost: {
    background: 'transparent', border: 'none', color: C.green,
    fontSize: 15, cursor: 'pointer', padding: '6px 0',
  },
  closeBtn: {
    background: C.elev, border: `1px solid ${C.border}`,
    color: C.muted, width: 36, height: 36, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 16, flexShrink: 0,
  },
  errBox: {
    background: 'rgba(255,107,107,0.1)', borderRadius: 10,
    border: '1px solid rgba(255,107,107,0.3)', padding: '8px 12px',
  },
};
