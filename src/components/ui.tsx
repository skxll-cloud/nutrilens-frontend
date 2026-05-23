// src/components/ui.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';

// ---- Button ----
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const styles = btnStyles;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.bg : Colors.primary} size="small" />
      ) : (
        <Text style={[styles.label, variant !== 'primary' && { color: Colors.primary }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.primaryDim, borderWidth: 1, borderColor: Colors.primary },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.4 },
  label: { ...Typography.h4, color: Colors.bg, letterSpacing: 0.3 },
});

// ---- Card ----
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function Card({ children, style, elevated }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? Colors.bgElevated : Colors.bgCard,
          borderRadius: Radius.lg,
          padding: Spacing.md,
          borderWidth: 1,
          borderColor: Colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---- MacroBar ----
interface MacroBarProps {
  label: string;
  value: number;
  goal: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, value, goal, color, unit = 'g' }: MacroBarProps) {
  const pct = Math.min((value / goal) * 100, 100);
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ ...Typography.label, color: Colors.textSecondary, textTransform: 'uppercase' }}>
          {label}
        </Text>
        <Text style={{ ...Typography.bodySmall, color: Colors.textPrimary }}>
          <Text style={{ fontWeight: '700' }}>{value}</Text>
          <Text style={{ color: Colors.textSecondary }}>/{goal}{unit}</Text>
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: Colors.border, borderRadius: Radius.full, overflow: 'hidden' }}>
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: Radius.full,
          }}
        />
      </View>
    </View>
  );
}

// ---- NutritionBadge ----
interface NutritionBadgeProps {
  label: string;
  value: number;
  unit?: string;
  color: string;
}

export function NutritionBadge({ label, value, unit = 'g', color }: NutritionBadgeProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        backgroundColor: `${color}15`,
        borderRadius: Radius.md,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: `${color}30`,
      }}
    >
      <Text style={{ ...Typography.h3, color, marginBottom: 2 }}>
        {value}
        <Text style={{ fontSize: 12, fontWeight: '400' }}>{unit}</Text>
      </Text>
      <Text style={{ ...Typography.label, color: Colors.textSecondary, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

// ---- ConfidenceDot ----
export function ConfidenceDot({ confidence }: { confidence: number }) {
  const color = confidence >= 0.85 ? Colors.success : confidence >= 0.6 ? Colors.warning : Colors.error;
  const label = confidence >= 0.85 ? 'High' : confidence >= 0.6 ? 'Medium' : 'Low';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ ...Typography.label, color }}>{label} confidence</Text>
    </View>
  );
}
