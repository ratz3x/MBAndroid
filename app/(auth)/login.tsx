// ============================================================
// Login Screen
// Mercedes-Benz Club Indonesia
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { MetallicButton } from '../../src/components/ui/MetallicButton';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

const MBCI_LOGO = require('../../assets/images/logo-mbci.jpg');

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Login Gagal', error.message);
    } else {
      router.replace('/(main)/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      Alert.alert('Google Login Gagal', error.message ?? 'Terjadi kesalahan saat masuk dengan Google');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
          </Pressable>

          {/* Header with Official MBCI Logo */}
          <View style={styles.header}>
            <View style={styles.logoRing}>
              <Image
                source={MBCI_LOGO}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Selamat Datang</Text>
            <Text style={styles.subtitle}>Masuk ke akun MB Club Indonesia Anda</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={Colors.text.disabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.text.disabled}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={Colors.text.tertiary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Forgot password */}
            <Pressable style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Lupa password?</Text>
            </Pressable>

            {/* Submit */}
            <MetallicButton
              label="Masuk"
              onPress={handleLogin}
              loading={loading}
              variant="gold"
              size="lg"
              style={styles.submitBtn}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In */}
            <MetallicButton
              label="Lanjutkan dengan Google"
              onPress={handleGoogleLogin}
              loading={googleLoading}
              variant="outline"
              size="lg"
              icon="logo-google"
              style={{ marginBottom: Spacing.lg }}
            />

            {/* Register */}
            <Pressable onPress={() => router.push('/(auth)/register')} style={styles.registerBtn}>
              <Text style={styles.registerText}>
                Belum punya akun?{' '}
                <Text style={styles.registerLink}>Daftar Sekarang</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing['2xl'] },
  backBtn: { marginTop: Spacing.base, padding: Spacing.xs, alignSelf: 'flex-start' },
  header: { alignItems: 'center', marginTop: Spacing['2xl'], marginBottom: Spacing['3xl'] },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.brand.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
  },
  logoImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  title: { fontSize: Typography['2xl'], fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.base, color: Colors.text.tertiary, textAlign: 'center' },
  form: { flex: 1 },
  fieldGroup: { marginBottom: Spacing.base },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.weight.medium, color: Colors.text.secondary, marginBottom: Spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    height: 50,
    fontSize: Typography.base,
    color: Colors.text.primary,
  },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: Spacing.xs },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: Spacing.xl },
  forgotText: { fontSize: Typography.sm, color: Colors.brand.gold },
  submitBtn: { marginBottom: Spacing.xl },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: Colors.border.default },
  dividerText: { fontSize: Typography.sm, color: Colors.text.tertiary, marginHorizontal: Spacing.md },
  registerBtn: { alignItems: 'center' },
  registerText: { fontSize: Typography.base, color: Colors.text.tertiary },
  registerLink: { color: Colors.brand.gold, fontWeight: Typography.weight.semibold },
});
