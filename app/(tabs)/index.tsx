// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, Link } from 'expo-router';
import { getDashboard } from '../../src/services/api';
import { DashboardData } from '../../src/types';
import { Card, MacroBar } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius } from '../../src/utils/theme';

const MACROS = [
  { key: 'calories' as const, label: 'Calories', color: Colors.accent4, unit: 'kcal' },
  { key: 'protein' as const, label: 'Protéines', color: Colors.accent3, unit: 'g' },
  { key: 'carbs' as const, label: 'Glucides', color: Colors.accent2, unit: 'g' },
  { key: 'fat' as const, label: 'Lipides', color: Colors.accent1, unit: 'g' },
];

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await getDashboard();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.date}>{todayLabel}</Text>
        </View>
        <View style={styles.logo}>
          <Text style={{ fontSize: 24 }}>🥗</Text>
        </View>
      </View>

      {/* Calorie Ring Card */}
      <Card style={styles.calorieCard}>
        <View style={styles.calorieTop}>
          <View style={styles.calorieRing}>
            <Text style={styles.calorieNumber}>
              {data?.consumed.calories ?? 0}
            </Text>
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>
          <View style={styles.calorieStats}>
            <StatPill
              label="Objectif"
              value={`${data?.goals.calories ?? 2000} kcal`}
              color={Colors.primary}
            />
            <StatPill
              label="Restant"
              value={`${data?.remaining.calories ?? 0} kcal`}
              color={Colors.secondary}
            />
            <StatPill
              label="Repas"
              value={`${data?.consumed.scan_count ?? 0}`}
              color={Colors.accent2}
            />
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(data?.progress.calories ?? 0, 100)}%`,
                backgroundColor: (data?.progress.calories ?? 0) > 100 ? Colors.error : Colors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {data?.progress.calories ?? 0}% de l'objectif journalier
        </Text>
      </Card>

      {/* Macros */}
      <Card style={{ marginTop: Spacing.md }}>
        <Text style={styles.sectionTitle}>Macronutriments</Text>
        {MACROS.filter(m => m.key !== 'calories').map((macro) => (
          <MacroBar
            key={macro.key}
            label={macro.label}
            value={data?.consumed[macro.key] ?? 0}
            goal={data?.goals[macro.key] ?? 1}
            color={macro.color}
            unit={macro.unit}
          />
        ))}
      </Card>

      {/* Quick Scan CTA */}
      <Link href="/scan" asChild>
        <TouchableOpacity style={styles.scanCTA} activeOpacity={0.85}>
          <Text style={{ fontSize: 28 }}>📷</Text>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.ctaTitle}>Scanner un repas</Text>
            <Text style={styles.ctaSubtitle}>Analyse IA instantanée</Text>
          </View>
          <Text style={{ color: Colors.primary, fontSize: 20 }}>→</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ ...Typography.h4, color }}>{value}</Text>
      <Text style={{ ...Typography.label, color: Colors.textTertiary }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  greeting: { ...Typography.h2, color: Colors.textPrimary },
  date: { ...Typography.body, color: Colors.textSecondary, marginTop: 2 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieCard: { padding: Spacing.lg },
  calorieTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  calorieRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
    backgroundColor: Colors.primaryDim,
  },
  calorieNumber: { ...Typography.numberMed, color: Colors.primary },
  calorieUnit: { ...Typography.label, color: Colors.textSecondary },
  calorieStats: { flex: 1, flexDirection: 'row', gap: 4 },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', borderRadius: Radius.full },
  progressText: { ...Typography.label, color: Colors.textTertiary },
  sectionTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.md },
  scanCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDim,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  ctaTitle: { ...Typography.h4, color: Colors.textPrimary },
  ctaSubtitle: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
});
