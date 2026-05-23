// app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { getGoals, updateGoals } from '../../src/services/api';
import { UserGoals } from '../../src/types';
import { Button, Card } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius } from '../../src/utils/theme';

const GOAL_FIELDS: { key: keyof UserGoals; label: string; unit: string; emoji: string; color: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', emoji: '🔥', color: Colors.accent4 },
  { key: 'protein', label: 'Protéines', unit: 'g', emoji: '💪', color: Colors.accent3 },
  { key: 'carbs', label: 'Glucides', unit: 'g', emoji: '🌾', color: Colors.accent2 },
  { key: 'fat', label: 'Lipides', unit: 'g', emoji: '🥑', color: Colors.accent1 },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [goals, setGoals] = useState<UserGoals>({ calories: 2000, protein: 150, carbs: 250, fat: 65 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGoals().then(setGoals).catch(console.error);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateGoals(goals);
      Alert.alert('Sauvegardé', 'Objectifs mis à jour avec succès');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/auth/login');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Profil</Text>

      {/* User info */}
      <Card style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 28 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.email?.split('@')[0] ?? 'Utilisateur'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </Card>

      {/* Goals */}
      <Text style={styles.sectionTitle}>Objectifs journaliers</Text>

      {GOAL_FIELDS.map(field => (
        <Card key={field.key} style={styles.goalCard}>
          <View style={styles.goalRow}>
            <Text style={{ fontSize: 20, marginRight: Spacing.sm }}>{field.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalLabel}>{field.label}</Text>
              <Text style={{ ...Typography.label, color: Colors.textTertiary }}>{field.unit}</Text>
            </View>
            <View style={styles.goalInput}>
              <TextInput
                style={[styles.input, { borderColor: field.color + '40', color: field.color }]}
                value={String(goals[field.key])}
                onChangeText={(v) => setGoals(prev => ({ ...prev, [field.key]: parseFloat(v) || 0 }))}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          </View>
        </Card>
      ))}

      <Button label="Sauvegarder les objectifs" onPress={handleSave} loading={saving} style={{ marginTop: Spacing.md }} />

      {/* About */}
      <Card style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>À propos de NutriLens</Text>
        <Text style={styles.aboutText}>
          NutriLens utilise l'IA Vision de GPT-4o pour analyser vos repas et OpenFoodFacts pour les produits emballés.
          Les estimations IA ont une précision variable selon la qualité de la photo.
        </Text>
        <View style={styles.techRow}>
          {['OpenFoodFacts', 'GPT-4o Vision', 'USDA', 'Supabase'].map(t => (
            <View key={t} style={styles.techBadge}>
              <Text style={styles.techLabel}>{t}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Button
        label="Se déconnecter"
        onPress={handleSignOut}
        variant="secondary"
        style={{ marginTop: Spacing.md, marginBottom: 40 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 100 },
  pageTitle: { ...Typography.h1, color: Colors.textPrimary, marginBottom: Spacing.lg },
  userCard: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, padding: Spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userName: { ...Typography.h4, color: Colors.textPrimary, textTransform: 'capitalize' },
  userEmail: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md },
  goalCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  goalRow: { flexDirection: 'row', alignItems: 'center' },
  goalLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
  goalInput: { width: 100 },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderWidth: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  aboutCard: { marginTop: Spacing.lg, padding: Spacing.md },
  aboutTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.sm },
  aboutText: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },
  techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.md },
  techBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  techLabel: { ...Typography.label, color: Colors.textSecondary },
});
