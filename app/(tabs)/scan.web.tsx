// app/(tabs)/scan.web.tsx — web-only scan screen
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { supabase } from '../../src/services/supabase';
import { ScanResult } from '../../src/types';
import { Card, Button, NutritionBadge, ConfidenceDot } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius } from '../../src/utils/theme';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
type ScanStep = 'pick' | 'camera' | 'preview' | 'loading' | 'result';

export default function ScanScreen() {
  const [step, setStep]               = useState<ScanStep>('pick');
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [result, setResult]           = useState<ScanResult | null>(null);
  const [error, setError]             = useState('');

  const videoContainerRef = useRef<any>(null);
  const videoRef          = useRef<HTMLVideoElement | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const fileInputRef      = useRef<HTMLInputElement | null>(null);

  // Hidden file input — created once, lives outside the React tree
  useEffect(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setCapturedBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStep('preview');
      input.value = ''; // allow re-picking same file
    };
    document.body.appendChild(input);
    fileInputRef.current = input;
    return () => { input.remove(); };
  }, []);

  // Attach <video> element to container div when entering camera step
  useEffect(() => {
    if (step !== 'camera' || !streamRef.current || !videoContainerRef.current) return;

    const video = document.createElement('video');
    video.srcObject = streamRef.current;
    video.autoplay   = true;
    video.playsInline = true; // required for iOS Safari
    video.muted      = true;
    video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    videoContainerRef.current.appendChild(video);
    videoRef.current = video;

    return () => { video.remove(); videoRef.current = null; };
  }, [step]);

  // Always clean up stream on unmount
  useEffect(() => () => stopStream(), []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function openCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('getUserMedia non supporté. Utilisez la galerie.');
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

  function openGallery() { fileInputRef.current?.click(); }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopStream();
      setStep('preview');
    }, 'image/jpeg', 0.85);
  }

  function cancelCamera() { stopStream(); setStep('pick'); }

  async function analyze() {
    if (!capturedBlob) return;
    setStep('loading');
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Non authentifié');

      const formData = new FormData();
      formData.append('image', capturedBlob, 'scan.jpg');

      const res = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
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
    setCapturedBlob(null);
    setPreviewUrl(null);
    setResult(null);
    setError('');
    stopStream();
    setStep('pick');
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[Typography.h4, { color: Colors.textSecondary, marginTop: Spacing.md }]}>
          Analyse en cours...
        </Text>
        <Text style={[Typography.bodySmall, { color: Colors.textTertiary, marginTop: 4 }]}>
          IA Vision + OpenFoodFacts
        </Text>
      </View>
    );
  }

  // ─── Result ───────────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultContent}>
        <View style={styles.resultHeader}>
          <TouchableOpacity onPress={reset} style={styles.backBtn}>
            <Text style={{ color: Colors.primary }}>← Nouveau scan</Text>
          </TouchableOpacity>
          <View style={styles.typeBadge}>
            <Text style={{ fontSize: 12, color: result.type === 'product' ? Colors.secondary : Colors.accent3 }}>
              {result.type === 'product' ? '📦 Produit' : '🍽️ Repas'}
            </Text>
          </View>
        </View>

        {previewUrl && (
          <Image source={{ uri: previewUrl }} style={styles.resultImage} resizeMode="cover" />
        )}

        <View style={styles.metaRow}>
          <Text style={styles.sourceText}>
            Source:{' '}
            <Text style={{ color: Colors.primary }}>
              {result.data_source === 'openfoodfacts'
                ? 'OpenFoodFacts'
                : result.data_source === 'usda'
                ? 'USDA'
                : 'Estimation IA'}
            </Text>
          </Text>
          <ConfidenceDot confidence={result.confidence_global} />
        </View>

        <Card style={{ marginBottom: Spacing.md }}>
          <Text style={styles.sectionTitle}>Total du repas</Text>
          <View style={styles.badgesRow}>
            <NutritionBadge label="Calories" value={result.total.calories} unit="kcal" color={Colors.accent4} />
            <View style={{ width: 8 }} />
            <NutritionBadge label="Protéines" value={result.total.protein} unit="g" color={Colors.accent3} />
          </View>
          <View style={[styles.badgesRow, { marginTop: 8 }]}>
            <NutritionBadge label="Glucides" value={result.total.carbs} unit="g" color={Colors.accent2} />
            <View style={{ width: 8 }} />
            <NutritionBadge label="Lipides" value={result.total.fat} unit="g" color={Colors.accent1} />
          </View>
        </Card>

        {result.items.map((item, idx) => (
          <Card key={idx} style={{ marginBottom: Spacing.sm }}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>{item.quantity}</Text>
            </View>
            <View style={styles.itemMacros}>
              <MacroChip label="Cal" value={item.calories} unit="kcal" color={Colors.accent4} />
              <MacroChip label="P"   value={item.protein}  unit="g"    color={Colors.accent3} />
              <MacroChip label="G"   value={item.carbs}    unit="g"    color={Colors.accent2} />
              <MacroChip label="L"   value={item.fat}      unit="g"    color={Colors.accent1} />
            </View>
          </Card>
        ))}

        <Button label="Scanner un autre repas" onPress={reset} style={{ marginTop: Spacing.md }} />
      </ScrollView>
    );
  }

  // ─── Preview ──────────────────────────────────────────────────────────────
  if (step === 'preview' && previewUrl) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="cover" />
        <View style={styles.previewOverlay}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Text style={styles.previewTitle}>Photo prête</Text>
          <Text style={styles.previewSubtitle}>Confirmer l'analyse ?</Text>
          <View style={styles.previewBtns}>
            <TouchableOpacity style={styles.retakeBtn} onPress={reset}>
              <Text style={{ color: Colors.textSecondary }}>Reprendre</Text>
            </TouchableOpacity>
            <Button label="Analyser" onPress={analyze} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    );
  }

  // ─── Camera (getUserMedia stream) ─────────────────────────────────────────
  if (step === 'camera') {
    return (
      <View style={styles.container}>
        {/* Container where the <video> element is injected via useEffect */}
        <View ref={videoContainerRef} style={styles.videoContainer} />

        <View style={styles.cameraOverlay} pointerEvents="box-none">
          <View style={styles.focusFrame}>
            <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
            <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
          </View>

          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelCamera}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterBtn} onPress={capturePhoto} activeOpacity={0.8}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
            <View style={{ width: 80 }} />
          </View>
        </View>
      </View>
    );
  }

  // ─── Pick (initial screen) ────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pickContent}>
      <View style={styles.pickHeader}>
        <Text style={styles.pickTitle}>Scanner un repas</Text>
        <Text style={styles.pickSubtitle}>Photographiez une assiette ou un emballage alimentaire</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Camera button */}
      <TouchableOpacity style={styles.pickCard} onPress={openCamera} activeOpacity={0.8}>
        <View style={[styles.pickIcon, { backgroundColor: `${Colors.primary}18` }]}>
          <Text style={{ fontSize: 36 }}>📷</Text>
        </View>
        <View style={styles.pickCardText}>
          <Text style={styles.pickCardTitle}>Prendre une photo</Text>
          <Text style={styles.pickCardSub}>Utilise la caméra de votre appareil</Text>
        </View>
        <Text style={{ color: Colors.primary, fontSize: 20 }}>›</Text>
      </TouchableOpacity>

      {/* Gallery button */}
      <TouchableOpacity style={styles.pickCard} onPress={openGallery} activeOpacity={0.8}>
        <View style={[styles.pickIcon, { backgroundColor: `${Colors.secondary}18` }]}>
          <Text style={{ fontSize: 36 }}>🖼️</Text>
        </View>
        <View style={styles.pickCardText}>
          <Text style={styles.pickCardTitle}>Choisir depuis la galerie</Text>
          <Text style={styles.pickCardSub}>Importer une photo existante</Text>
        </View>
        <Text style={{ color: Colors.primary, fontSize: 20 }}>›</Text>
      </TouchableOpacity>

      <View style={styles.tip}>
        <Text style={styles.tipText}>
          💡 Cadrez bien le repas ou l'étiquette nutritionnelle pour une analyse précise.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Helper component ─────────────────────────────────────────────────────────
function MacroChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ ...Typography.label, color, fontWeight: '700' }}>
        {value}<Text style={{ fontSize: 10 }}>{unit}</Text>
      </Text>
      <Text style={{ ...Typography.label, color: Colors.textTertiary }}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  center:       { alignItems: 'center', justifyContent: 'center' },

  // Pick screen
  pickContent:  { padding: Spacing.lg, paddingTop: 60, paddingBottom: 100 },
  pickHeader:   { marginBottom: Spacing.xl },
  pickTitle:    { ...Typography.h2, color: Colors.textPrimary, marginBottom: 6 },
  pickSubtitle: { ...Typography.body, color: Colors.textSecondary },
  pickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  pickIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickCardText: { flex: 1 },
  pickCardTitle:{ ...Typography.h4, color: Colors.textPrimary },
  pickCardSub:  { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  tip: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  tipText: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },

  // Camera screen
  videoContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  cameraOverlay:  {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  focusFrame: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderRadius: 3,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelBtn:  { width: 80, alignItems: 'center', justifyContent: 'center', height: 52 },
  cancelText: { ...Typography.body, color: 'rgba(255,255,255,0.8)' },
  shutterBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  // Preview screen
  previewImage: { flex: 1 },
  previewOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,10,15,0.95)',
    padding: Spacing.lg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: 40,
  },
  previewTitle:    { ...Typography.h2, color: Colors.textPrimary },
  previewSubtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.lg },
  previewBtns:     { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  retakeBtn: {
    paddingHorizontal: Spacing.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Result screen
  resultContent: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 100 },
  resultHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  backBtn:       { paddingVertical: 6 },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultImage: {
    width: '100%', height: 200,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  metaRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sourceText:  { ...Typography.bodySmall, color: Colors.textSecondary },
  sectionTitle:{ ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.md },
  badgesRow:   { flexDirection: 'row' },
  itemHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  itemName:    { ...Typography.body, color: Colors.textPrimary, flex: 1, fontWeight: '600' },
  itemQty:     { ...Typography.bodySmall, color: Colors.textSecondary },
  itemMacros:  { flexDirection: 'row', justifyContent: 'space-around' },

  // Shared
  errorBox: {
    backgroundColor: `${Colors.error}18`,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${Colors.error}40`,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.bodySmall, color: Colors.error, textAlign: 'center' },
});
