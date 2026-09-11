// ============================================================
// Register Screen — Create new account
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

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      Alert.alert('Google Sign-In Gagal', error.message ?? 'Terjadi kesalahan saat mendaftar dengan Google');
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Password dan konfirmasi password tidak cocok');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password minimal 8 karakter');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (error) {
      Alert.alert('Pendaftaran Gagal', error.message);
    } else {
      Alert.alert(
        'Pendaftaran Berhasil',
        'Akun berhasil dibuat. Silakan cek email Anda untuk verifikasi, lalu lanjutkan pendaftaran keanggotaan.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={MBCI_LOGO} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.title}>Buat Akun Baru</Text>
            <Text style={styles.subtitle}>Langkah 1 dari 2 — Informasi Akun</Text>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {[1, 2].map((step) => (
              <React.Fragment key={step}>
                <View style={[styles.stepCircle, step === 1 && styles.stepCircleActive]}>
                  <Text style={[styles.stepNum, step === 1 && styles.stepNumActive]}>{step}</Text>
                </View>
                {step < 2 && <View style={styles.stepLine} />}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.form}>
            {[
              { label: 'Nama Lengkap', value: fullName, onChange: setFullName, icon: 'person-outline', placeholder: 'Nama sesuai KTP', type: 'default' },
              { label: 'Email', value: email, onChange: setEmail, icon: 'mail-outline', placeholder: 'email@example.com', type: 'email-address' },
            ].map((field) => (
              <View key={field.label} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name={field.icon as any} size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.text.disabled}
                    keyboardType={field.type as any}
                    autoCapitalize={field.type === 'email-address' ? 'none' : 'words'}
                  />
                </View>
              </View>
            ))}

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 karakter"
                  placeholderTextColor={Colors.text.disabled}
                  secureTextEntry={!showPass}
                />
                <Pressable onPress={() => setShowPass((v) => !v)}>
                  <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.text.tertiary} />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Konfirmasi Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Ulangi password"
                  placeholderTextColor={Colors.text.disabled}
                  secureTextEntry={!showPass}
                />
              </View>
            </View>

            <MetallicButton
              label="Lanjutkan Pendaftaran"
              onPress={handleRegister}
              loading={loading}
              variant="gold"
              size="lg"
              icon="arrow-forward-outline"
              iconPosition="right"
              style={{ marginTop: Spacing.md }}
            />

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg }}>
              <View style={{ flex: 1, height: 1, backgroundColor: Colors.border.default }} />
              <Text style={{ color: Colors.text.tertiary, paddingHorizontal: Spacing.md, fontSize: Typography.xs }}>atau</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: Colors.border.default }} />
            </View>

            {/* Google Sign-In */}
            <MetallicButton
              label="Daftar dengan Google"
              onPress={handleGoogleRegister}
              loading={googleLoading}
              variant="outline"
              size="lg"
              icon="logo-google"
              style={{ marginBottom: Spacing.md }}
            />

            <Pressable onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
              <Text style={styles.loginText}>
                Sudah punya akun? <Text style={styles.loginGold}>Masuk</Text>
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
  header: { alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.lg },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.brand.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  title: { fontSize: Typography['2xl'], fontWeight: Typography.weight.bold, color: Colors.text.primary, textAlign: 'center' },
  subtitle: { fontSize: Typography.sm, color: Colors.text.tertiary, marginTop: 4, textAlign: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { borderColor: Colors.brand.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  stepNum: { fontSize: Typography.sm, color: Colors.text.tertiary, fontWeight: Typography.weight.semibold },
  stepNumActive: { color: Colors.brand.gold },
  stepLine: { flex: 1, height: 1, backgroundColor: Colors.border.default, marginHorizontal: Spacing.xs },
  form: {},
  fieldGroup: { marginBottom: Spacing.base },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.weight.medium, color: Colors.text.secondary, marginBottom: Spacing.xs },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border.default,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, height: 50, fontSize: Typography.base, color: Colors.text.primary },
  inputFlex: { flex: 1 },
  loginLink: { alignItems: 'center', marginTop: Spacing.xl },
  loginText: { fontSize: Typography.base, color: Colors.text.tertiary },
  loginGold: { color: Colors.brand.gold, fontWeight: Typography.weight.semibold },
});
