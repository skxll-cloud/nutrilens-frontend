// app/(tabs)/history.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getHistory, deleteScan } from '../../src/services/api';
import { ScanRecord } from '../../src/types';
import { Card } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius } from '../../src/utils/theme';

export default function HistoryScreen() {
  const [grouped, setGrouped] = useState<Record<string, ScanRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { grouped_by_day } = await getHistory(60);
      setGrouped(grouped_by_day);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleDelete(scanId: string, date: string) {
    Alert.alert('Supprimer', 'Supprimer ce scan ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteScan(scanId);
          setGrouped(prev => {
            const updated = { ...prev };
            updated[date] = updated[date].filter(s => s.id !== scanId);
            if (updated[date].length === 0) delete updated[date];
            return updated;
          });
        },
      },
    ]);
  }

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ ...Typography.body, color: Colors.textSecondary }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      <Text style={styles.pageTitle}>Historique</Text>

      {dates.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>📋</Text>
          <Text style={styles.emptyTitle}>Aucun scan</Text>
          <Text style={styles.emptyText}>Commencez par scanner un repas ou un produit</Text>
        </View>
      )}

      {dates.map(date => {
        const scans = grouped[date];
        const dayTotal = scans.reduce(
          (acc, s) => ({
            calories: acc.calories + s.result.total.calories,
            protein: acc.protein + s.result.total.protein,
          }),
          { calories: 0, protein: 0 }
        );

        const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long',
        });

        return (
          <View key={date} style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{dateLabel}</Text>
              <Text style={styles.dayTotal}>
                {Math.round(dayTotal.calories)} kcal · {Math.round(dayTotal.protein)}g prot.
              </Text>
            </View>

            {scans.map(scan => (
              <Card key={scan.id} style={styles.scanCard}>
                <View style={styles.scanRow}>
                  <View style={styles.scanIcon}>
                    <Text style={{ fontSize: 20 }}>
                      {scan.scan_type === 'product' ? '📦' : '🍽️'}
                    </Text>
                  </View>
                  <View style={styles.scanInfo}>
                    <Text style={styles.scanName} numberOfLines={1}>
                      {scan.result.items[0]?.name ?? 'Scan'}
                      {scan.result.items.length > 1 && ` +${scan.result.items.length - 1}`}
                    </Text>
                    <Text style={styles.scanTime}>
                      {new Date(scan.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.scanNutrition}>
                    <Text style={styles.scanCalories}>{scan.result.total.calories} <Text style={styles.scanUnit}>kcal</Text></Text>
                    <Text style={styles.scanMacros}>
                      P {scan.result.total.protein}g · G {scan.result.total.carbs}g · L {scan.result.total.fat}g
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(scan.id, date)}
                    style={styles.deleteBtn}
                  >
                    <Text style={{ color: Colors.error, fontSize: 16 }}>🗑</Text>
                  </TouchableOpacity>
                </View>

                {/* Source badge */}
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>
                    {scan.result.data_source === 'openfoodfacts'
                      ? '✓ OpenFoodFacts'
                      : scan.result.data_source === 'usda'
                      ? '✓ USDA'
                      : '🤖 IA Estimation'}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 100 },
  pageTitle: { ...Typography.h1, color: Colors.textPrimary, marginBottom: Spacing.lg },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  dayGroup: { marginBottom: Spacing.lg },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  dayLabel: { ...Typography.h4, color: Colors.textPrimary, textTransform: 'capitalize' },
  dayTotal: { ...Typography.bodySmall, color: Colors.textSecondary },
  scanCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  scanRow: { flexDirection: 'row', alignItems: 'center' },
  scanIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  scanInfo: { flex: 1, marginRight: Spacing.sm },
  scanName: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
  scanTime: { ...Typography.label, color: Colors.textTertiary, marginTop: 2 },
  scanNutrition: { alignItems: 'flex-end', marginRight: Spacing.sm },
  scanCalories: { ...Typography.h4, color: Colors.primary },
  scanUnit: { ...Typography.label, color: Colors.textSecondary },
  scanMacros: { ...Typography.label, color: Colors.textTertiary, marginTop: 2 },
  deleteBtn: { padding: 4 },
  sourceBadge: { marginTop: 8, alignSelf: 'flex-start' },
  sourceBadgeText: { ...Typography.label, color: Colors.textTertiary },
});
