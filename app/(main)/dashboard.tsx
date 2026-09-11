// ============================================================
// Dashboard Anggota — KTA Digital + Shortcut Menu
// Mercedes-Benz Club Indonesia (Luxury & Sleek)
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { KTACard } from '../../src/components/dashboard/KTACard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { LuxuryCard } from '../../src/components/ui/LuxuryCard';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../src/constants/theme';
import { formatChapter } from '../../src/utils/helpers';

const KOPERASI_LOGO = require('../../assets/images/logo-koperasi.jpg');
const MBCI_LOGO = require('../../assets/images/logo-mbci.jpg');

// ── Shortcut Menu Configuration (Monochromatic Brushed Silver) ─────────
const SHORTCUTS = [
  { icon: 'calendar-outline', label: 'Event', route: '/(main)/event' },
  { icon: 'people-outline', label: 'Organisasi', route: '/(main)/organisasi' },
  { icon: 'images-outline', label: 'Gallery', route: '/(main)/gallery' },
  { icon: 'chatbubbles-outline', label: 'Forum', route: '/(main)/forum' },
  { icon: 'storefront-outline', label: 'Toko', route: '/(main)/toko' },
  { icon: 'card-outline', label: 'Koperasi', route: '/(main)/koperasi' },
  { icon: 'ribbon-outline', label: 'Sponsor', route: '/(main)/sponsorship' },
  { icon: 'person-add-outline', label: 'Keanggotaan', route: '/(main)/keanggotaan' },
  { icon: 'alert-circle-outline', label: 'SOS Rescue', route: '/(main)/sos' },
] as const;

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile: authProfile, isAdmin, signOut } = useAuth();
  const { profile, member, loading, refetch } = useProfile(user?.id);
  const [localMember, setLocalMember] = useState<any>(null);

  const loadLocalBackup = useCallback(async () => {
    if (!user?.id) return;
    try {
      const cached = await AsyncStorage.getItem('mb_local_member_' + user.id);
      if (cached) {
        setLocalMember(JSON.parse(cached));
      }
    } catch {}
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refetch();
      loadLocalBackup();
    }, [refetch, loadLocalBackup])
  );

  const activeMember = member || localMember;
  const activeProfile = profile || authProfile;

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (!loading && !activeMember && user?.id) {
      const checkModal = async () => {
        try {
          const seen = await AsyncStorage.getItem('mb_welcome_modal_seen_' + user.id);
          if (!seen) {
            setShowWelcomeModal(true);
          }
        } catch {}
      };
      checkModal();
    }
  }, [loading, activeMember, user?.id]);

  const handleDismissWelcome = async () => {
    setShowWelcomeModal(false);
    if (user?.id) {
      try {
        await AsyncStorage.setItem('mb_welcome_modal_seen_' + user.id, 'true');
      } catch {}
    }
  };

  const handleGoToRegister = async () => {
    await handleDismissWelcome();
    router.push('/(main)/keanggotaan/register');
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Selamat Datang,</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {authProfile?.full_name ?? 'Anggota'}
            </Text>
          </View>
          <View style={styles.topBarRight}>
            {isAdmin && (
              <Pressable
                onPress={() => router.push('/(main)/admin')}
                style={styles.adminBadge}
              >
                <View style={styles.adminDot} />
                <Ionicons name="shield-checkmark" size={13} color="#E4E4E7" />
                <Text style={styles.adminBadgeText}>MODE ADMIN</Text>
                <Ionicons name="chevron-forward" size={12} color="#71717A" />
              </Pressable>
            )}
            <Pressable onPress={() => router.push('/(main)/profil')} style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color={Colors.text.primary} />
            </Pressable>
            <Pressable
              onPress={async () => {
                await signOut();
                router.replace('/(auth)/login');
              }}
              style={styles.logoutBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="log-out-outline" size={20} color="#F87171" />
            </Pressable>
          </View>
        </View>

        {/* KTA Digital */}
        <SectionHeader
          title="Kartu Tanda Anggota"
          subtitle="KTA Digital MBCI"
        />

        {loading && !activeMember ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Colors.brand.gold} />
          </View>
        ) : activeMember && activeProfile ? (
          <KTACard profile={activeProfile} member={activeMember} />
        ) : (
          /* Belum mendaftar */
          <LuxuryCard variant="gold" style={styles.pendingCard}>
            <View style={styles.pendingIconRing}>
              <Ionicons name="card-outline" size={30} color={Colors.brand.gold} />
            </View>
            <Text style={styles.pendingTitle}>Keanggotaan Belum Terdaftar</Text>
            <Text style={styles.pendingDesc}>
              Akun Anda telah aktif! Lengkapi data profil dan Mercedes-Benz Anda untuk menerbitkan KTA Digital resmi MBCI.
            </Text>
            <Pressable
              onPress={() => router.push('/(main)/keanggotaan/register')}
              style={({ pressed }) => [
                styles.pendingBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.pendingBtnText}>Daftar Keanggotaan Sekarang</Text>
              <Ionicons name="arrow-forward" size={16} color="#000000" />
            </Pressable>
          </LuxuryCard>
        )}

        {/* Emergency SOS Roadside Assistance Banner */}
        <Pressable
          onPress={() => router.push('/(main)/sos')}
          style={styles.sosBanner}
          android_ripple={{ color: 'rgba(239, 68, 68, 0.2)' }}
        >
          <View style={styles.sosBannerIconBox}>
            <Ionicons name="warning" size={22} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.sosBadgeRow}>
              <View style={styles.sosLiveDot} />
              <Text style={styles.sosBadgeText}>BANTUAN DARURAT & RESCUE 24 JAM</Text>
            </View>
            <Text style={styles.sosBannerTitle}>SOS & Roadside Assistance</Text>
            <Text style={styles.sosBannerSubtitle}>
              Mogok mesin, derek tol 14080, overheat & towing flatdeck
            </Text>
          </View>
          <View style={styles.sosArrowBox}>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </View>
        </Pressable>

        {/* Shortcut Menu Utama (Monochromatic Brushed Silver) */}
        <View style={{ marginTop: Spacing.xl }}>
          <SectionHeader title="Menu Utama" subtitle="Fitur & Layanan Aplikasi" />
        </View>
        <View style={styles.shortcutGrid}>
          {SHORTCUTS.map((item) => {
            const isSos = item.label === 'SOS Rescue';
            return (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.route as any)}
                style={styles.shortcutItem}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
              >
                <View style={[styles.shortcutIcon, isSos && styles.shortcutIconSos]}>
                  {item.label === 'Koperasi' ? (
                    <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: 'rgba(197,160,89,0.6)', overflow: 'hidden' }}>
                      <Image
                        source={KOPERASI_LOGO}
                        style={{ width: 36, height: 36, borderRadius: 18 }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : isSos ? (
                    <Ionicons name="alert-circle" size={24} color="#EF4444" />
                  ) : (
                    <Ionicons name={item.icon as any} size={22} color="#D4D4D8" />
                  )}
                </View>
                <Text style={[styles.shortcutLabel, isSos && styles.shortcutLabelSos]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Layanan & Aksi Eksklusif Anggota */}
        {activeMember && (
          <View style={{ marginTop: Spacing['2xl'] }}>
            <SectionHeader
              title="Layanan Eksklusif"
              subtitle="Akses cepat fitur keanggotaan MBCI"
            />
            <View style={styles.actionList}>
              <Pressable
                onPress={() => router.push('/(main)/keanggotaan')}
                style={styles.actionCard}
                android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons name="qr-code-outline" size={20} color="#E4E4E7" />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>KTA Digital & Verifikasi</Text>
                  <Text style={styles.actionDesc}>Periksa kelengkapan data & status KTA resmi</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#71717A" />
              </Pressable>

              <Pressable
                onPress={() => router.push('/(main)/event')}
                style={styles.actionCard}
                android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons name="scan-outline" size={20} color="#E4E4E7" />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Presensi & Event</Text>
                  <Text style={styles.actionDesc}>Check-in kehadiran touring & gathering nasional</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#71717A" />
              </Pressable>

              <Pressable
                onPress={() => router.push('/(main)/organisasi')}
                style={styles.actionCard}
                android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons name="business-outline" size={20} color="#E4E4E7" />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Direktori & Chapter</Text>
                  <Text style={styles.actionDesc}>
                    {activeMember.chapter ? `Terhubung dengan ${formatChapter(activeMember.chapter)}` : 'Informasi struktur organisasi MBCI'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#71717A" />
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* Onboarding Welcome Modal for New / Unregistered Users */}
      <Modal
        visible={showWelcomeModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismissWelcome}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconRing}>
              <Image source={MBCI_LOGO} style={styles.modalLogo} resizeMode="cover" />
            </View>

            <Text style={styles.modalTitle}>Selamat Datang di Mercedes-Benz Club Indonesia!</Text>
            <Text style={styles.modalGreeting}>
              {authProfile?.full_name || user?.email}
            </Text>

            <Text style={styles.modalDesc}>
              Akun Anda telah aktif di MB Club Indonesia. Untuk menerbitkan{' '}
              <Text style={{ color: Colors.brand.gold, fontWeight: '700' }}>KTA Digital Resmi</Text>,
              silakan lengkapi pilihan chapter dan data kendaraan Mercedes-Benz Anda.
            </Text>

            <Pressable
              onPress={handleGoToRegister}
              style={({ pressed }) => [
                styles.modalPrimaryBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons name="card-outline" size={18} color="#000000" />
              <Text style={styles.modalPrimaryBtnText}>LENGKAPI DATA KTA SEKARANG</Text>
            </Pressable>

            <Pressable
              onPress={handleDismissWelcome}
              style={styles.modalSecondaryBtn}
            >
              <Text style={styles.modalSecondaryBtnText}>Lihat Beranda Dahulu</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.base },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    marginBottom: Spacing.base,
  },
  greeting: { fontSize: Typography.sm, color: Colors.text.tertiary },
  userName: { fontSize: Typography.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, maxWidth: 220 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  // Floating Admin Mode Badge
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 23, 27, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 212, 216, 0.25)',
    gap: 6,
  },
  adminDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F4F4F5',
    letterSpacing: 1,
  },

  notifBtn: {
    padding: Spacing.xs,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoutBtn: {
    padding: Spacing.xs,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },

  loadingCard: {
    height: 160,
    backgroundColor: Colors.background.card,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.base,
  },
  pendingCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    marginHorizontal: Spacing.base,
  },
  pendingIconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pendingTitle: { fontSize: Typography.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginTop: Spacing.xs },
  pendingDesc: { fontSize: Typography.sm, color: Colors.text.tertiary, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 20, paddingHorizontal: Spacing.base },
  pendingBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.brand.gold,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.brand.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pendingBtnText: { fontSize: 13, color: '#000000', fontWeight: '700', letterSpacing: 0.5 },

  // Onboarding Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#121318',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    padding: 24,
    alignItems: 'center',
  },
  modalIconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: Colors.brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: Colors.brand.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  modalLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  modalGreeting: {
    fontSize: 14,
    color: Colors.brand.gold,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 13,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalPrimaryBtn: {
    width: '100%',
    backgroundColor: Colors.brand.gold,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  modalSecondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
  },

  // Shortcut Grid
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  shortcutItem: {
    width: '23%',
    alignItems: 'center',
  },
  shortcutIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(23, 23, 27, 0.85)',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#A1A1AA',
    letterSpacing: 0.3,
    marginTop: 8,
    textAlign: 'center',
  },

  // Layanan Eksklusif Cards
  actionList: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0E12',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 212, 216, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F4F4F5',
    letterSpacing: 0.2,
  },
  actionDesc: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },

  // SOS Emergency Roadside Banner
  sosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: Spacing.xl,
    gap: 12,
  },
  sosBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  sosLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  sosBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F87171',
    letterSpacing: 0.8,
  },
  sosBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  sosBannerSubtitle: {
    fontSize: 11,
    color: '#D4D4D8',
    marginTop: 2,
  },
  sosArrowBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SOS Shortcut overrides
  shortcutIconSos: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  shortcutLabelSos: {
    color: '#F87171',
    fontWeight: '700',
  },
});

