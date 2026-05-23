// app/(tabs)/scan.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { scanImage } from '../../src/services/api';
import { ScanResult } from '../../src/types';
import { Card, Button, NutritionBadge, ConfidenceDot } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius } from '../../src/utils/theme';

type ScanStep = 'camera' | 'preview' | 'loading' | 'result';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<ScanStep>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const cameraRef = useRef<CameraView>(null);

  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;
      // Compress
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCapturedUri(compressed.uri);
      setStep('preview');
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCapturedUri(compressed.uri);
      setStep('preview');
    }
  }

  async function analyze() {
    if (!capturedUri) return;
    setStep('loading');
    try {
      const scanResult = await scanImage(capturedUri);
      setResult(scanResult);
      setStep('result');
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Analyse échouée');
      setStep('preview');
    }
  }

  function reset() {
    setCapturedUri(null);
    setResult(null);
    setStep('camera');
  }

  // Permission handling
  if (!permission) {
    return <View style={styles.container}><ActivityIndicator color={Colors.primary} /></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Accès caméra requis</Text>
        <Button label="Autoriser" onPress={requestPermission} />
      </View>
    );
  }

  // Loading step
  if (step === 'loading') {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ ...Typography.h4, color: Colors.textSecondary, marginTop: Spacing.md }}>
          Analyse en cours...
        </Text>
        <Text style={{ ...Typography.bodySmall, color: Colors.textTertiary, marginTop: 4 }}>
          IA Vision + OpenFoodFacts
        </Text>
      </View>
    );
  }

  // Result step
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

        {capturedUri && (
          <Image source={{ uri: capturedUri }} style={styles.resultImage} resizeMode="cover" />
        )}

        {/* Source & confidence */}
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

        {/* Total */}
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

        {/* Items */}
        {result.items.map((item, idx) => (
          <Card key={idx} style={{ marginBottom: Spacing.sm }}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>{item.quantity}</Text>
            </View>
            <View style={styles.itemMacros}>
              <MacroChip label="Cal" value={item.calories} unit="kcal" color={Colors.accent4} />
              <MacroChip label="P" value={item.protein} unit="g" color={Colors.accent3} />
              <MacroChip label="G" value={item.carbs} unit="g" color={Colors.accent2} />
              <MacroChip label="L" value={item.fat} unit="g" color={Colors.accent1} />
            </View>
          </Card>
        ))}

        <Button label="Scanner un autre repas" onPress={reset} style={{ marginTop: Spacing.md }} />
      </ScrollView>
    );
  }

  // Preview step
  if (step === 'preview' && capturedUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
        <View style={styles.previewOverlay}>
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

  // Camera step
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Overlay frame */}
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>Scanner un repas</Text>
            <Text style={styles.cameraSubtitle}>Assiette ou emballage alimentaire</Text>
          </View>

          {/* Focus frame */}
          <View style={styles.focusFrame}>
            <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
            <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
          </View>

          {/* Controls */}
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
              <Text style={{ fontSize: 20 }}>🖼️</Text>
              <Text style={styles.galleryLabel}>Galerie</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shutterBtn} onPress={takePicture} activeOpacity={0.8}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            <View style={{ width: 70 }} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

function MacroChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ ...Typography.label, color, fontWeight: '700' }}>{value}<Text style={{ fontSize: 10 }}>{unit}</Text></Text>
      <Text style={{ ...Typography.label, color: Colors.textTertiary }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: Spacing.lg, paddingTop: 60 },
  cameraHeader: { alignItems: 'center' },
  cameraTitle: { ...Typography.h3, color: '#fff' },
  cameraSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  focusFrame: {
    alignSelf: 'center',
    width: 280,
    height: 280,
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
    paddingBottom: 20,
  },
  galleryBtn: { width: 70, alignItems: 'center' },
  galleryLabel: { ...Typography.label, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
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
  permText: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md, textAlign: 'center' },
  previewImage: { flex: 1 },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,10,15,0.95)',
    padding: Spacing.lg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: 40,
  },
  previewTitle: { ...Typography.h2, color: Colors.textPrimary },
  previewSubtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.lg },
  previewBtns: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  retakeBtn: {
    paddingHorizontal: Spacing.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 100 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  backBtn: { paddingVertical: 6 },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sourceText: { ...Typography.bodySmall, color: Colors.textSecondary },
  sectionTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.md },
  badgesRow: { flexDirection: 'row' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  itemName: { ...Typography.body, color: Colors.textPrimary, flex: 1, fontWeight: '600' },
  itemQty: { ...Typography.bodySmall, color: Colors.textSecondary },
  itemMacros: { flexDirection: 'row', justifyContent: 'space-around' },
});
