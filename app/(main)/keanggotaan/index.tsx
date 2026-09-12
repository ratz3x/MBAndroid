// ============================================================
// Keanggotaan — Member list & status
// Mercedes-Benz Club Indonesia
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KOPERASI_LOGO = require('../../../assets/images/logo-koperasi.jpg');
import { MetallicButton } from '../../../src/components/ui/MetallicButton';
import { LuxuryCard } from '../../../src/components/ui/LuxuryCard';
import { Colors, Typography, Spacing, CommonStyles } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { useProfile } from '../../../src/hooks/useProfile';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';

export default function KeanggotaanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { member, loading, refetch } = useProfile(user?.id);
  const [localMember, setLocalMember] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);

  // Load fallback local storage if Supabase network is syncing
  const loadLocalBackup = useCallback(async () => {
    if (!user?.id) return;
    try {
      const cached = await AsyncStorage.getItem('mb_local_member_' + user.id);
      if (cached) {
        setLocalMember(JSON.parse(cached));
      }
    } catch {}
  }, [user?.id]);

  // Re-fetch automatically whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
      loadLocalBackup();
    }, [refetch, loadLocalBackup])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), loadLocalBackup()]);
    setRefreshing(false);
  };

  const activeMember = member || localMember;
  const isPending = activeMember && (activeMember.status === 'pending' || !activeMember.is_approved);
  const isActive = activeMember && activeMember.status === 'active';

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand.gold}
            colors={[Colors.brand.gold]}
          />
        }
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.title}>Keanggotaan</Text>
          <Pressable
            onPress={onRefresh}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerRefreshBtn}
          >
            <Ionicons name="refresh-outline" size={18} color={Colors.brand.gold} />
          </Pressable>
        </View>

        {loading && !activeMember ? (
          <LuxuryCard style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.brand.gold} />
            <Text style={styles.loadingText}>Memeriksa status pendaftaran...</Text>
          </LuxuryCard>
        ) : isPending ? (
          /* ============================================================
             STATE: SUDAH MENDAFTAR (DALAM PROSES VERIFIKASI E-KTA)
             ============================================================ */
          <LuxuryCard variant="gold" style={styles.pendingCard}>
            {/* Top Status Header */}
            <View style={styles.pendingHeaderRow}>
              <View style={styles.pendingIconBox}>
                <Ionicons name="hourglass-outline" size={26} color={Colors.brand.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.pendingBadgeRow}>
                  <View style={styles.pendingStatusBadge}>
                    <View style={styles.pendingDot} />
                    <Text style={styles.pendingStatusBadgeText}>DALAM PROSES VERIFIKASI</Text>
                  </View>
                </View>
                <Text style={styles.pendingTitle}>Terima Kasih Sudah Mendaftar! 🎉</Text>
              </View>
            </View>

            <Text style={styles.pendingDesc}>
              Data pendaftaran resmi Anda telah tersimpan di sistem Mercedes-Benz Club Indonesia.
              Saat ini E-KTA digital Anda sedang dalam tahap verifikasi & penerbitan oleh Admin Chapter.
            </Text>

            {/* Nomor KTA Box */}
            <View style={styles.ktaBox}>
              <Text style={styles.ktaBoxLabel}>
                {activeMember.member_number ? 'NOMOR REGISTRASI RESMI (KTA)' : 'STATUS NOMOR KTA'}
              </Text>
              <Text style={styles.ktaBoxNumber}>
                {activeMember.member_number || 'MENUNGGU VERIFIKASI ADMIN'}
              </Text>
            </View>

            {/* Info Summary */}
            <View style={styles.infoContainer}>
              {[
                { label: 'Chapter Resmi', value: activeMember.chapter ?? 'Pusat' },
                {
                  label: 'Kendaraan',
                  value: `${activeMember.car_brand ?? 'Mercedes-Benz'} ${activeMember.car_model ?? ''} (${activeMember.car_plate ?? ''})`.trim(),
                },
                { label: 'Tanggal Pengajuan', value: activeMember.join_date ?? '-' },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Progress Stepper Visual */}
            <View style={styles.stepperContainer}>
              <Text style={styles.stepperTitle}>Tahapan Penerbitan E-KTA:</Text>

              {/* Step 1 */}
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, styles.stepDone]}>
                  <Ionicons name="checkmark" size={13} color="#000" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepNameActive}>1. Formulir Pendaftaran Terkirim</Text>
                  <Text style={styles.stepDesc}>Data tersimpan di database resmi.</Text>
                </View>
              </View>

              <View style={styles.stepLine} />

              {/* Step 2 */}
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, styles.stepCurrent]}>
                  <Ionicons name="time" size={13} color="#000" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepNameCurrent}>2. Verifikasi Dokumen & Chapter</Text>
                  <Text style={styles.stepDesc}>Admin chapter sedang memverifikasi berkas.</Text>
                </View>
              </View>

              <View style={styles.stepLine} />

              {/* Step 3 */}
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, styles.stepWait]}>
                  <Ionicons name="shield-outline" size={13} color="#6B7280" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepNameWait}>3. Penerbitan E-KTA Digital</Text>
                  <Text style={styles.stepDesc}>KTA aktif otomatis dengan barcode & QR Code.</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsCol}>
              <MetallicButton
                label="Edit / Perbarui Data Pendaftaran"
                onPress={() => router.push('/(main)/keanggotaan/register')}
                variant="gold"
                size="md"
                icon="create-outline"
                style={{ width: '100%' }}
              />
              <MetallicButton
                label="Cek / Segarkan Status Terkini"
                onPress={onRefresh}
                variant="outline"
                size="md"
                icon="refresh-outline"
                style={{ width: '100%', marginTop: 8 }}
              />
            </View>
          </LuxuryCard>
        ) : isActive ? (
          /* ============================================================
             STATE: ANGGOTA AKTIF (E-KTA RESMI TERBIT)
             ============================================================ */
          <LuxuryCard variant="gold">
            <View style={styles.statusRow}>
              <Text style={styles.memberLabel}>Status Keanggotaan</Text>
              <StatusBadge status={activeMember.status} />
            </View>
            <View style={styles.divider} />
            {[
              { label: 'No. Anggota KTA', value: activeMember.member_number },
              { label: 'Chapter', value: activeMember.chapter ?? 'Pusat' },
              {
                label: 'Kendaraan',
                value: `${activeMember.car_model ?? ''} (${activeMember.car_plate ?? ''})`,
              },
              { label: 'Bergabung Sejak', value: activeMember.join_date },
            ].map((row) => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
            <MetallicButton
              label="Edit Data Anggota"
              onPress={() => router.push('/(main)/keanggotaan/register')}
              variant="outline"
              size="md"
              icon="create-outline"
              style={{ marginTop: Spacing.base }}
            />
          </LuxuryCard>
        ) : (
          /* ============================================================
             STATE: BELUM PERNAH MENDAFTAR
             ============================================================ */
          <LuxuryCard variant="gold" style={styles.noMemberCard}>
            <Ionicons name="person-add-outline" size={48} color={Colors.brand.gold} />
            <Text style={styles.noMemberTitle}>Belum Terdaftar sebagai Anggota</Text>
            <Text style={styles.noMemberDesc}>
              Daftarkan diri Anda sebagai anggota resmi Mercedes-Benz Club Indonesia dan nikmati berbagai keuntungan eksklusif.
            </Text>
            <MetallicButton
              label="Mulai Pendaftaran"
              onPress={() => router.push('/(main)/keanggotaan/register')}
              variant="gold"
              size="md"
              icon="arrow-forward-outline"
              iconPosition="right"
              style={{ marginTop: Spacing.md }}
            />
          </LuxuryCard>
        )}

        {/* Keuntungan Anggota Resmi (Grid 2 Kolom / 2 Kartu Per Baris) */}
        <View style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.title}>
              Keuntungan Anggota Resmi
            </Text>
            <View style={styles.gridCountBadge}>
              <Text style={styles.gridCountBadgeText}>6 LAYANAN</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: Colors.text.tertiary }}>
            Hak istimewa, tingkatan loyalitas, & fasilitas resmi khusus member ber-MID
          </Text>
        </View>

        {/* Grid 2 Kolom */}
        <View style={styles.benefitGrid}>
          {[
            {
              icon: 'ribbon-outline',
              title: 'KTA Digital',
              desc: 'QR Code resmi & chip MID di Beranda',
              badge: 'KTA RESMI',
              badgeColor: '#FBBF24',
              action: () => router.push('/(main)/dashboard' as any),
            },
            {
              icon: 'trophy-outline',
              title: 'Tier Member',
              desc: 'Sistem Bronze, Silver, Gold, Platinum',
              badge: 'SISTEM BARU',
              badgeColor: '#38BDF8',
              action: () => setShowTierModal(true),
            },
            {
              icon: 'calendar-outline',
              title: 'Akses Event',
              desc: 'Prioritas daftar touring & gathering',
              badge: 'AGENDA KLUB',
              badgeColor: '#60A5FA',
              action: () => router.push('/(main)/event' as any),
            },
            {
              icon: 'pricetag-outline',
              title: 'Diskon Mitra',
              desc: 'Potongan bengkel, asuransi, & hotel',
              badge: 'REKANAN',
              badgeColor: '#34D399',
              action: () => router.push('/(main)/sponsorship' as any),
            },
            {
              isLogo: true,
              title: 'Koperasi',
              desc: 'Tabungan sukarela & e-passbook',
              badge: 'SIMPANAN',
              badgeColor: '#F59E0B',
              action: () => router.push('/(main)/koperasi' as any),
            },
            {
              icon: 'storefront-outline',
              title: 'Toko Resmi',
              desc: 'Merchandise resmi, part OEM, & lapak',
              badge: 'MARKET',
              badgeColor: '#C084FC',
              action: () => router.push('/(main)/toko' as any),
            },
          ].map((benefit) => (
            <Pressable
              key={benefit.title}
              onPress={benefit.action}
              style={({ pressed }) => [
                styles.gridBenefitCard,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.gridBenefitHeader}>
                <View style={styles.gridBenefitIconWrap}>
                  {(benefit as any).isLogo ? (
                    <Image source={KOPERASI_LOGO} style={{ width: 20, height: 20, borderRadius: 10 }} resizeMode="contain" />
                  ) : (
                    <Ionicons name={(benefit as any).icon as any} size={18} color={benefit.badgeColor} />
                  )}
                </View>
                <View style={[styles.gridBenefitBadge, { backgroundColor: `${benefit.badgeColor}20`, borderColor: `${benefit.badgeColor}40` }]}>
                  <Text style={[styles.gridBenefitBadgeText, { color: benefit.badgeColor }]}>
                    {benefit.badge}
                  </Text>
                </View>
              </View>

              <Text style={styles.gridBenefitTitle} numberOfLines={1}>
                {benefit.title}
              </Text>
              <Text style={styles.gridBenefitDesc} numberOfLines={2}>
                {benefit.desc}
              </Text>

              <View style={styles.gridBenefitActionRow}>
                <Text style={[styles.gridBenefitActionText, { color: benefit.badgeColor }]}>
                  {benefit.title === 'Tier Member' ? 'Pelajari Tier' : 'Buka Layanan'}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={benefit.badgeColor} />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* MODAL: PANDUAN SISTEM TIER & LOYALITAS KEANGGOTAAN MBCI        */}
      {/* ============================================================ */}
      <Modal
        visible={showTierModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTierModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tierModalContent}>
            {/* Header Modal */}
            <View style={styles.tierModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.tierModalIconRing}>
                  <Ionicons name="trophy" size={22} color="#38BDF8" />
                </View>
                <View>
                  <Text style={styles.tierModalTitle}>Tingkatan Tier Keanggotaan</Text>
                  <Text style={styles.tierModalSubtitle}>Sistem loyalitas & privilese resmi MBCI</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowTierModal(false)}
                style={styles.tierModalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <View style={styles.tierNoticeBox}>
                <Ionicons name="information-circle-outline" size={18} color="#38BDF8" />
                <Text style={styles.tierNoticeText}>
                  Tingkatan Tier dihitung otomatis dari akumulasi poin kehadiran di event resmi, keaktifan chapter, dan aktivitas di aplikasi Mercedes-Benz Club Indonesia.
                </Text>
              </View>

              {/* 4 Kartu Level Tier */}
              {[
                {
                  tier: 'BRONZE',
                  title: 'Star Explorer',
                  badgeColor: '#CD7F32',
                  points: '0 – 600 Poin',
                  benefits: [
                    'Akses KTA Digital resmi dengan QR Code',
                    'Gratis pendaftaran di seluruh event komunitas',
                    'Diskon sewa lapak toko marketplace 5%',
                    'Akses forum diskusi resmi seluruh chapter',
                  ],
                },
                {
                  tier: 'SILVER',
                  title: 'Star Voyager',
                  badgeColor: '#E4E4E7',
                  points: '601 – 1.400 Poin',
                  benefits: [
                    'Seluruh keuntungan tier Bronze',
                    'Diskon sewa lapak toko marketplace 10%',
                    'Badge Silver eksklusif di profil & forum',
                    'Prioritas slot display mobil di gathering chapter',
                  ],
                },
                {
                  tier: 'GOLD',
                  title: 'Star Ambassador',
                  badgeColor: '#FBBF24',
                  points: '1.401 – 3.200 Poin',
                  benefits: [
                    'Seluruh keuntungan tier Silver',
                    'Diskon sewa lapak toko marketplace 15%',
                    'Slot parkir VIP (Paddock) di acara gathering resmi',
                    'Posisi barisan depan pada konvoi touring nasional',
                    'Ekstra kupon undian doorprize gathering tahunan',
                  ],
                },
                {
                  tier: 'PLATINUM',
                  title: 'Star Legend / VIP Pillar',
                  badgeColor: '#38BDF8',
                  points: '3.201+ Poin',
                  benefits: [
                    'Seluruh keuntungan tier Gold',
                    'Diskon sewa lapak toko marketplace 20%',
                    'Meja kehormatan (VIP Lounge) di Gala Dinner / Munas',
                    'Plakat apresiasi pilar komunitas dari Pengurus Pusat',
                    'Merchandise eksklusif edisi terbatas Jamnas MBCI',
                  ],
                },
              ].map((item) => (
                <View
                  key={item.tier}
                  style={[
                    styles.tierLevelCard,
                    { borderColor: `${item.badgeColor}40` },
                  ]}
                >
                  <View style={styles.tierLevelHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={[
                          styles.tierLevelBadge,
                          { backgroundColor: `${item.badgeColor}25`, borderColor: `${item.badgeColor}60` },
                        ]}
                      >
                        <Text style={[styles.tierLevelBadgeText, { color: item.badgeColor }]}>
                          {item.tier}
                        </Text>
                      </View>
                      <Text style={styles.tierLevelTitle}>{item.title}</Text>
                    </View>
                    <Text style={[styles.tierPointsBadge, { color: item.badgeColor }]}>
                      {item.points}
                    </Text>
                  </View>

                  <View style={styles.tierBenefitList}>
                    {item.benefits.map((b, idx) => (
                      <View key={idx} style={styles.tierBenefitItem}>
                        <Ionicons name="checkmark-circle" size={14} color={item.badgeColor} />
                        <Text style={styles.tierBenefitText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <Pressable
                onPress={() => setShowTierModal(false)}
                style={styles.tierCloseActionBtn}
              >
                <Text style={styles.tierCloseActionBtnText}>Saya Mengerti</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.base,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  headerRefreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.1)',
  },

  // Loading State
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    gap: 12,
  },
  loadingText: {
    fontSize: Typography.sm,
    color: Colors.text.secondary,
  },

  // State: Belum Terdaftar
  noMemberCard: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  noMemberTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  noMemberDesc: {
    fontSize: Typography.sm,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },

  // State: Pendaftaran Sedang Diproses
  pendingCard: {
    padding: Spacing.base,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  pendingIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pendingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 6,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  pendingStatusBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  pendingTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  pendingDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 14,
  },

  // KTA Box
  ktaBox: {
    backgroundColor: '#0E0F12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262933',
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  ktaBoxLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#8E94A0',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  ktaBoxNumber: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.gold,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },

  // Info Container
  infoContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#20222A',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: Typography.xs,
    color: Colors.text.tertiary,
  },
  infoValue: {
    fontSize: Typography.xs,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },

  // Stepper Visual
  stepperContainer: {
    backgroundColor: 'rgba(201, 168, 76, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.15)',
    padding: 14,
    marginBottom: 16,
  },
  stepperTitle: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.gold,
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: {
    backgroundColor: '#10B981',
  },
  stepCurrent: {
    backgroundColor: '#F59E0B',
  },
  stepWait: {
    backgroundColor: '#262933',
  },
  stepLine: {
    width: 2,
    height: 12,
    backgroundColor: '#2E323D',
    marginLeft: 10,
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepNameActive: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: '#10B981',
  },
  stepNameCurrent: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#F59E0B',
  },
  stepNameWait: {
    fontSize: 12,
    fontWeight: Typography.weight.medium,
    color: '#6B7280',
  },
  stepDesc: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 1,
  },

  actionButtonsCol: {
    gap: 8,
  },

  // Active State
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  memberLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border.default,
    marginBottom: Spacing.md,
  },

  gridCountBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridCountBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },

  // 2-Column Grid Benefit Cards (2 Kartu Per Baris)
  benefitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  gridBenefitCard: {
    width: '48.5%',
    backgroundColor: '#121214',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  gridBenefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridBenefitIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  gridBenefitBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  gridBenefitBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  gridBenefitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  gridBenefitDesc: {
    fontSize: 10.5,
    color: '#A1A1AA',
    lineHeight: 14,
    height: 28,
    marginBottom: 8,
  },
  gridBenefitActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  gridBenefitActionText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Modal Styles for Tier Guide
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
  },
  tierModalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#121214',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    padding: Spacing.base,
  },
  tierModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tierModalIconRing: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierModalTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  tierModalSubtitle: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  tierModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  tierNoticeText: {
    fontSize: 11,
    color: '#BAE6FD',
    flex: 1,
    lineHeight: 16,
  },
  tierLevelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  tierLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tierLevelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  tierLevelBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tierLevelTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tierPointsBadge: {
    fontSize: 11,
    fontWeight: '800',
  },
  tierBenefitList: {
    gap: 4,
  },
  tierBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierBenefitText: {
    fontSize: 11,
    color: '#D4D4D8',
    flex: 1,
    lineHeight: 15,
  },
  tierCloseActionBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  tierCloseActionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#000',
  },
});
