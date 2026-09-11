// ============================================================
// Landing Page — Mercedes-Benz Club Indonesia
// Luxury Dark Automotive Editorial Design (Exact Web Match)
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import { useAuth } from '../src/context/AuthContext';

const HERO_BG = require('../assets/images/hero-gwagon.jpg');
const MBCI_LOGO = require('../assets/images/logo-mbci.jpg');

const serifFont = Platform.select({
  web: "'Cormorant Garamond', Georgia, serif",
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export default function LandingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { user, profile, isAdmin, signOut } = useAuth();

  const isDesktop = width >= 768;

  let secondaryBtnLabel = 'LOGIN MEMBER / PENGURUS →';
  let secondaryBtnRoute = '/(auth)/login';

  if (user) {
    if (isAdmin) {
      secondaryBtnLabel = 'MASUK PORTAL ADMIN →';
      secondaryBtnRoute = '/(main)/admin';
    } else {
      secondaryBtnLabel = 'BUKA DASHBOARD MEMBER →';
      secondaryBtnRoute = '/(main)/dashboard';
    }
  }

  const handleRegister = () => {
    if (user) {
      router.push('/(main)/keanggotaan/register');
    } else {
      router.push('/(auth)/register');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Minimal Luxury Top Navbar */}
        <View style={styles.navbar}>
          <View style={styles.navBrand}>
            <Image source={MBCI_LOGO} style={styles.navLogo} resizeMode="contain" />
            <Text style={styles.navBrandText}>MB CLUB INDONESIA</Text>
          </View>
          <View style={styles.navRight}>
            {user ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  onPress={() => router.push(secondaryBtnRoute as any)}
                  style={styles.navUserBtn}
                >
                  <View style={styles.navUserDot} />
                  <Text style={styles.navUserText}>
                    {isAdmin ? 'Portal Admin' : profile?.full_name ?? 'Dashboard'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    await signOut();
                    router.replace('/(auth)/login');
                  }}
                  style={styles.navLogoutBtn}
                >
                  <Ionicons name="log-out-outline" size={13} color="#EF4444" />
                  <Text style={styles.navLogoutText}>Keluar</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                style={styles.navLoginBtn}
              >
                <Text style={styles.navLoginText}>Masuk</Text>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && styles.desktopScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ============================================================ */}
          {/* 1. HERO SECTION (Identical to Web v2-hero-wrap)               */}
          {/* ============================================================ */}
          <View style={[styles.heroWrap, isDesktop ? styles.heroWrapDesktop : styles.heroWrapMobile]}>
            {/* Background Car Image */}
            <Image
              source={HERO_BG}
              style={[
                styles.heroBg,
                Platform.OS === 'web' && ({ objectPosition: 'right center' } as any),
              ]}
              resizeMode="cover"
            />

            {/* Cinematic Gradient Overlay (Left-Vignette for text clarity + car visibility) */}
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
                <Defs>
                  {/* Horizontal Vignette */}
                  <SvgGradient id="v2Horizontal" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#000000" stopOpacity="0.96" />
                    <Stop offset="35%" stopColor="#000000" stopOpacity="0.88" />
                    <Stop offset="68%" stopColor="#000000" stopOpacity="0.35" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
                  </SvgGradient>
                  {/* Vertical Subtle Blend */}
                  <SvgGradient id="v2Vertical" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#000000" stopOpacity={isDesktop ? '0.45' : '0.75'} />
                    <Stop offset="40%" stopColor="#000000" stopOpacity={isDesktop ? '0.0' : '0.2'} />
                    <Stop offset="100%" stopColor="#000000" stopOpacity={isDesktop ? '0.75' : '0.92'} />
                  </SvgGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#v2Horizontal)" />
                <Rect width="100%" height="100%" fill="url(#v2Vertical)" />
              </Svg>
            </View>

            {/* Hero Text Content (Left-Aligned Editorial) */}
            <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>
              {/* Eyebrow Label */}
              <Text style={styles.eyebrow}>
                MERCEDES-BENZ CLUB INDONESIA
              </Text>

              {/* Serif Headline */}
              <View style={styles.heroTitle}>
                <Text style={[styles.titleHomeOf, isDesktop && styles.titleHomeOfDesktop]}>
                  The Home of
                </Text>
                <Text style={[styles.titleStarEnthusiasts, isDesktop && styles.titleStarEnthusiastsDesktop]}>
                  Star Enthusiasts
                </Text>
              </View>

              {/* Description Paragraph */}
              <Text style={styles.heroDescription}>
                Wadah resmi bagi seluruh pecinta dan pemilik Mercedes-Benz di Indonesia. Menjaga warisan, menyatukan inovasi, dan mempererat persaudaraan antar bintang.
              </Text>

              {/* Dual Action Buttons */}
              <View style={styles.buttonRow}>
                {/* Button 1: DAFTAR MEMBER (Solid Gold) */}
                <Pressable
                  onPress={handleRegister}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text style={styles.btnPrimaryText}>DAFTAR MEMBER</Text>
                </Pressable>

                {/* Button 2: MASUK PORTAL ADMIN / LOGIN (Outline) */}
                <Pressable
                  onPress={() => router.push(secondaryBtnRoute as any)}
                  style={({ pressed }) => [
                    styles.btnSecondary,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text style={styles.btnSecondaryText}>{secondaryBtnLabel}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* ============================================================ */}
          {/* 2. STATS & METRICS BAR (Matching Web v2 Metrics)             */}
          {/* ============================================================ */}
          <View style={[styles.statsWrap, isDesktop && styles.statsWrapDesktop]}>
            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>18</Text>
                <Text style={styles.statLabel}>REGIONAL CHAPTER</Text>
                <Text style={styles.statSub}>Di 38 Provinsi Indonesia</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCol}>
                <Text style={styles.statNumber}>111</Text>
                <Text style={styles.statLabel}>KLUB TERDAFTAR RESMI</Text>
                <Text style={styles.statSub}>Komunitas Terverifikasi</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCol}>
                <Text style={styles.statNumber}>5.000+</Text>
                <Text style={styles.statLabel}>ANGGOTA AKTIF TERDAFTAR</Text>
                <Text style={styles.statSub}>Pemilik Mercedes-Benz</Text>
              </View>
            </View>
          </View>

          {/* Footer Note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Aplikasi & Portal Resmi Mercedes-Benz Club Indonesia · Est. 2012
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },

  // Navbar
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 10,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  navBrandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F4F4F5',
    letterSpacing: 1.5,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLoginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
  },
  navLoginText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C5A059',
    letterSpacing: 0.5,
  },
  navUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(23, 23, 27, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(212, 212, 216, 0.2)',
  },
  navUserDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  navUserText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  navLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  navLogoutText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F87171',
  },

  // Scroll Content
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  desktopScrollContent: {
    maxWidth: 1440,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },

  // Hero Wrap
  heroWrap: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  heroWrapDesktop: {
    height: 520,
    minHeight: 480,
    maxHeight: 560,
    borderRadius: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.9,
    shadowRadius: 60,
    elevation: 10,
    justifyContent: 'center',
  },
  heroWrapMobile: {
    minHeight: 480,
    paddingVertical: 36,
    justifyContent: 'center',
  },
  heroBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  // Hero Content
  heroContent: {
    position: 'relative',
    zIndex: 3,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  heroContentDesktop: {
    paddingHorizontal: 56,
    paddingVertical: 48,
    maxWidth: 580,
  },
  eyebrow: {
    fontSize: 11.5,
    letterSpacing: 2.6,
    color: '#C5A059',
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginBottom: 18,
  },
  titleHomeOf: {
    fontFamily: serifFont,
    fontSize: 34,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 40,
  },
  titleHomeOfDesktop: {
    fontSize: 50,
    lineHeight: 56,
  },
  titleStarEnthusiasts: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    fontSize: 34,
    fontWeight: '700',
    color: '#C5A059',
    lineHeight: 42,
  },
  titleStarEnthusiastsDesktop: {
    fontSize: 50,
    lineHeight: 58,
  },
  heroDescription: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 23,
    marginBottom: 28,
    maxWidth: 480,
    fontWeight: '400',
  },

  // Action Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  btnPrimary: {
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 6,
    backgroundColor: '#C5A059',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 4,
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111111',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  btnSecondary: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C5A059',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Stats Section
  statsWrap: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  statsWrapDesktop: {
    paddingHorizontal: 0,
    marginTop: 36,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(14, 19, 31, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    flexWrap: 'wrap',
    gap: 16,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
    minWidth: 100,
  },
  statNumber: {
    fontFamily: serifFont,
    fontSize: 32,
    fontWeight: '900',
    color: '#DFBA73',
    lineHeight: 36,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },
  statSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 11,
    color: '#71717A',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
