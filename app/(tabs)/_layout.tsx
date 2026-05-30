// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs, Slot } from 'expo-router';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../src/utils/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={styles.emoji}>{emoji}</Text>
      {focused && <Text style={styles.tabLabel}>{label}</Text>}
    </View>
  );
}

export default function TabLayout() {
  // On web, _layout.web.tsx owns the full layout (nav bar + FAB).
  // Render Slot only so the two layouts don't stack and create a double nav bar.
  if (Platform.OS === 'web') {
    return <Slot />;
  }

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
      <Tabs.Screen
        name="index"
        options={{
          href: '/',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Accueil" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          href: '/scan',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📷" label="Scanner" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: '/history',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Historique" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: '/profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Profil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
  },
  tabItemActive: {
    backgroundColor: Colors.primaryDim,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
  },
  emoji: { fontSize: 20 },
  tabLabel: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
});
