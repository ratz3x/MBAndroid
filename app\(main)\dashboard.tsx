// ============================================================
// Dashboard Anggota — KTA Digital + Shortcut Menu
// Mercedes-Benz Club Indonesia (Luxury & Sleek)
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
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
] as const;

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile: authProfile, isAdmin } = useAuth();
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
            <Ionicons name="information-circle-outline" size={32} color={Colors.brand.gold} />
            <Text style={styles.pendingTitle}>Keanggotaan Belum Terdaftar</Text>
            <Text style={styles.pendingDesc}>
              Daftarkan diri Anda sebagai anggota resmi Mercedes-Benz Club Indonesia untuk menerbitkan KTA Digital Anda.
            </Text>
            <Pressable
              onPress={() => router.push('/(main)/keanggotaan/register')}
              style={styles.pendingBtn}
            >
              <Text style={styles.pendingBtnText}>Daftar Keanggotaan →</Text>
            </Pressable>
          </LuxuryCard>
        )}

        {/* Shortcut Menu Utama (Monochromatic Brushed Silver) */}
        <View style={{ marginTop: Spacing['2xl'] }}>
          <SectionHeader title="Menu Utama" subtitle="Fitur & Layanan Aplikasi" />
        </View>
        <View style={styles.shortcutGrid}>
          {SHORTCUTS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route as any)}
              style={styles.shortcutItem}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.08)' }}
            >
              <View style={styles.shortcutIcon}>
                {item.label === 'Koperasi' ? (
                  <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: 'rgba(197,160,89,0.6)', overflow: 'hidden' }}>
                    <Image
                      source={KOPERASI_LOGO}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <Ionicons name={item.icon as any} size={22} color="#D4D4D8" />
                )}
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </Pressable>
          ))}
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
  pendingTitle: { fontSize: Typography.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginTop: Spacing.md },
  pendingDesc: { fontSize: Typography.sm, color: Colors.text.tertiary, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 20, paddingHorizontal: Spacing.base },
  pendingBtn: { marginTop: Spacing.lg },
  pendingBtnText: { fontSize: Typography.base, color: Colors.brand.gold, fontWeight: Typography.weight.semibold },

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
});

