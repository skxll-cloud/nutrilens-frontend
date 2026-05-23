// app/auth/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius } from '../../src/utils/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuthStore();

  async function handleSubmit() {
    setError('');
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        router.replace('/(tabs)');
      } else {
        await signIn(email.trim(), password);
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Background glow */}
        <View style={styles.glow} />

        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 32 }}>🥗</Text>
          </View>
          <Text style={styles.logoText}>NutriLens</Text>
          <Text style={styles.tagline}>Scan. Analyse. Optimise.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>{isSignUp ? 'Créer un compte' : 'Connexion'}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
          </View>

          <Button
            label={isSignUp ? "S'inscrire" : 'Se connecter'}
            onPress={handleSubmit}
            loading={loading}
            style={{ marginTop: Spacing.md }}
          />

          <TouchableOpacity
            onPress={() => { setIsSignUp(!isSignUp); setError(''); }}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>
              {isSignUp ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
              <Text style={{ color: Colors.primary }}>
                {isSignUp ? 'Se connecter' : "S'inscrire"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, justifyContent: 'center' },
  glow: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary,
    opacity: 0.05,
  },
  logoArea: { alignItems: 'center', marginBottom: Spacing.xxl },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoText: { ...Typography.h1, color: Colors.textPrimary, marginBottom: 4 },
  tagline: { ...Typography.body, color: Colors.textSecondary },
  form: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.lg },
  errorBox: {
    backgroundColor: `${Colors.error}18`,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${Colors.error}40`,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.bodySmall, color: Colors.error, textAlign: 'center' },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { ...Typography.label, color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Typography.body,
  },
  switchBtn: { marginTop: Spacing.md, alignItems: 'center' },
  switchText: { ...Typography.body, color: Colors.textSecondary },
});
