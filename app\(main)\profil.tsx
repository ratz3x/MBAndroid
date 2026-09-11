// ============================================================
// Profil — User Profile & Settings
// Mercedes-Benz Luxury & Executive Styling
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  Platform,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Spacing, CommonStyles } from '../../src/constants/theme';
import { getInitials, formatChapter } from '../../src/utils/helpers';
import { useProfile } from '../../src/hooks/useProfile';
import { TierService, TIER_CONFIG, MemberTierData, MemberTier } from '../../src/services/tierService';
import { SponsorService, type SponsorItem } from '../../src/services/sponsorService';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string | null;
  badge?: string;
  isHighlight?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export default function ProfilScreen() {
  const router = useRouter();
  const { user, profile: authProfile, signOut, isAdmin } = useAuth();
  const { member } = useProfile(user?.id);
  const [avatarError, setAvatarError] = useState(false);
  const [tierData, setTierData] = useState<MemberTierData | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingTier, setSyncingTier] = useState(false);

  // ── Sponsor Dashboard State ──────────────────────────────────
  const isSponsor = !!(member?.member_number?.includes('-SPN-'));
  const [sponsorData, setSponsorData] = useState<SponsorItem | null>(null);
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewMonths, setRenewMonths] = useState(3);
  const [renewProof, setRenewProof] = useState('');
  const [renewNotes, setRenewNotes] = useState('');
  const [submittingRenew, setSubmittingRenew] = useState(false);

  const fetchTier = async (forceRecalculate = false) => {
    const uid = user?.id || 'default_user';
    if (forceRecalculate) {
      setSyncingTier(true);
      try {
        const data = await TierService.recalculateRealPoints(uid);
        setTierData(data);
      } finally {
        setSyncingTier(false);
      }
    } else {
      const data = await TierService.getMemberTierData(uid);
      setTierData(data);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const uid = user?.id || 'default_user';
      const data = await TierService.getMemberTierData(uid);
      if (isMounted) setTierData(data);
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // ── Load sponsor data jika user adalah sponsor ───────────────
  useEffect(() => {
    let isMounted = true;
    const loadSponsor = async () => {
      if (!isSponsor || !member?.member_number) return;
      try {
        const list = await SponsorService.getSponsors();
        const found = list.find((s) => s.sponsor_id === member.member_number);
        if (isMounted && found) setSponsorData(found);
      } catch {}
    };
    loadSponsor();
    return () => { isMounted = false; };
  }, [isSponsor, member?.member_number]);

  const handleOpenRenewModal = () => {
    if (sponsorData?.pending_renewal) {
      setRenewMonths(sponsorData.pending_renewal.months || 3);
      setRenewProof(sponsorData.pending_renewal.payment_proof_url || '');
      setRenewNotes(sponsorData.pending_renewal.notes || '');
    } else {
      setRenewMonths(3);
      setRenewProof('');
      setRenewNotes('');
    }
    setRenewModalVisible(true);
  };

  const handlePickProofImage = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = (e: any) => {
        const file: File = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev: ProgressEvent<FileReader>) => {
            const base64Url = ev.target?.result as string;
            if (base64Url) {
              setRenewProof(base64Url);
            }
          };
          reader.readAsDataURL(file);
        }
        document.body.removeChild(input);
      };
      input.click();
    } else {
      Alert.prompt
        ? Alert.prompt(
            'URL Foto Bukti Transfer',
            'Tempel URL gambar bukti transfer:',
            [
              { text: 'Batal', style: 'cancel' },
              { text: 'Simpan', onPress: (url?: string) => { if (url?.trim()) setRenewProof(url.trim()); } },
            ],
            'plain-text',
            renewProof
          )
        : Alert.alert('Info', 'Tempel URL gambar bukti transfer di kolom teks di bawah form.');
    }
  };

  const handleSubmitRenewSponsor = async () => {
    if (!sponsorData) return;
    if (!renewProof.trim()) {
      Alert.alert(
        'Bukti Transfer Wajib',
        'Wajib melampirkan bukti transfer ke Bank Mandiri 137-00-1234567-8 a.n. MERCEDES-BENZ CLUB INDONESIA.'
      );
      return;
    }
    setSubmittingRenew(true);
    try {
      const res = await SponsorService.requestRenewSponsor({
        sponsorId: sponsorData.id,
        months: renewMonths,
        paymentProofUrl: renewProof.trim(),
        notes: renewNotes.trim(),
      });
      if (res.success) {
        Alert.alert('Pengajuan Terkirim 🎉', res.message);
        setRenewModalVisible(false);
        // Refresh sponsor data
        const list = await SponsorService.getSponsors();
        const found = list.find((s) => s.sponsor_id === member?.member_number);
        if (found) setSponsorData(found);
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengajukan perpanjangan.');
    } finally {
      setSubmittingRenew(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTier(true);
      if (isSponsor && member?.member_number) {
        const list = await SponsorService.getSponsors();
        const found = list.find((s) => s.sponsor_id === member.member_number);
        if (found) setSponsorData(found);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const [adminSyncing, setAdminSyncing] = useState(false);

  const handleAdminResetAll = async () => {
    setAdminSyncing(true);
    try {
      await TierService.resetAndRecalculateAll();
      await fetchTier(false);
      Alert.alert(
        'Sinkronisasi Sukses',
        'Seluruh tier admin & member telah dihitung ulang sesuai data real (Forum, Event & Lapak Toko).'
      );
    } catch (e) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat sinkronisasi data tier.');
    } finally {
      setAdminSyncing(false);
    }
  };

  const currentTier = tierData?.tier || 'BRONZE';
  const tierProgress = TierService.getTierProgress(tierData?.points ?? 0);
  const tierConfig = tierProgress.config;

  const avatarUrl =
    authProfile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Apakah Anda yakin ingin keluar dari akun?')) {
        signOut();
      }
    } else {
      Alert.alert('Keluar dari Akun', 'Apakah Anda yakin ingin keluar?', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: signOut },
      ]);
    }
  };

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
    } else {
      Alert.alert('Informasi', `${item.label} akan segera hadir pada update berikutnya.`);
    }
  };

  // ── Menu Groupings ──────────────────────────────────────────
  const menuGroups: MenuGroup[] = [
    {
      title: 'AKUN & KEANGGOTAAN',
      items: [
        ...(isAdmin
          ? [
              {
                icon: 'shield-checkmark-outline' as const,
                label: 'Dashboard Admin',
                route: '/(main)/admin',
                isHighlight: true,
              },
            ]
          : []),
        {
          icon: 'person-outline' as const,
          label: 'Edit Profil & Keanggotaan',
          route: '/(main)/keanggotaan/register',
        },
        {
          icon: 'notifications-outline' as const,
          label: 'Notifikasi',
          route: null,
        },
        {
          icon: 'lock-closed-outline' as const,
          label: 'Keamanan & Password',
          route: null,
        },
      ],
    },
    {
      title: 'LAYANAN & SPONSOR',
      items: [
        {
          icon: 'card-outline' as const,
          label: 'Koperasi',
          route: '/(main)/koperasi',
        },
        {
          icon: 'ribbon-outline' as const,
          label: 'Sponsorship',
          route: '/(main)/sponsorship',
        },
      ],
    },
    {
      title: 'INFORMASI & BANTUAN',
      items: [
        {
          icon: 'help-circle-outline' as const,
          label: 'Bantuan & FAQ',
          route: null,
        },
        {
          icon: 'document-text-outline' as const,
          label: 'Syarat & Ketentuan',
          route: null,
        },
        {
          icon: 'information-circle-outline' as const,
          label: 'Tentang Aplikasi',
          route: null,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C5A059" colors={['#C5A059']} />
        }
      >
        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Profil Saya</Text>
        </View>

        {/* 1. Header Profil & Avatar (Glass-Card Elegan) */}
        <View style={styles.profileGlassCard}>
          <View style={styles.profileRow}>
            {/* Metallic Ring Avatar */}
            <View style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                {avatarUrl && !avatarError ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {getInitials(authProfile?.full_name ?? user?.user_metadata?.full_name ?? 'MB')}
                  </Text>
                )}
              </View>
              {isAdmin && (
                <View style={styles.avatarAdminBadge}>
                  <Ionicons name="shield-checkmark" size={11} color="#E4E4E7" />
                </View>
              )}
            </View>

            {/* Profile Text Metadata */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {authProfile?.full_name ?? 'Nama Anggota'}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email}
              </Text>
              {member && (
                <>
                  <Text style={styles.memberNumber} numberOfLines={1}>
                    {member.member_number ?? 'PENDING VERIFIKASI'}
                  </Text>
                  <Text style={styles.chapterText} numberOfLines={1}>
                    {formatChapter(member.chapter)}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Minimalist Status Pills */}
          <View style={styles.statusRow}>
            {/* Status Aktif / Pending */}
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  member?.status === 'active' ? styles.dotActive : styles.dotPending,
                ]}
              />
              <Text style={styles.statusText}>
                {member?.status === 'active' ? 'Aktif' : member?.status ? member.status.toUpperCase() : 'Aktif'}
              </Text>
            </View>

            {/* Super Admin / Role Pill */}
            {isAdmin && (
              <View style={styles.rolePill}>
                <Text style={styles.roleText}>
                  {authProfile?.role ? authProfile.role.replace('_', ' ').toUpperCase() : 'SUPER ADMIN'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 2. Card Kendaraan (Exclusive Garage Badge) */}
        {member && (
          <View style={styles.vehicleBadgeCard}>
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleIconBox}>
                <Ionicons name="car-sport-outline" size={22} color="#D4D4D8" />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleMetaLabel}>KENDARAAN RESMI</Text>
                <Text style={styles.vehicleModel}>
                  {member.car_model} ({member.car_year})
                </Text>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{member.car_plate}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 2.7. Kartu Status Kemitraan Sponsor (hanya muncul jika sponsor login) */}
        {isSponsor && sponsorData && (() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const isExpired = sponsorData.contract_end < todayStr;
          const remainingDays = Math.max(
            0,
            Math.ceil((new Date(sponsorData.contract_end).getTime() - Date.now()) / 86400000)
          );
          return (
            <View style={{
              backgroundColor: '#0F0F11',
              borderWidth: 1,
              borderColor: isExpired ? 'rgba(239,68,68,0.4)' : 'rgba(251,191,36,0.35)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 14,
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: 'rgba(251,191,36,0.12)',
                  borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="ribbon" size={18} color="#FBBF24" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: '#71717A', fontWeight: '600', letterSpacing: 1 }}>
                    STATUS KEMITRAAN SPONSOR RESMI
                  </Text>
                  <Text style={{ fontSize: 14, color: '#FAFAFA', fontWeight: '700' }} numberOfLines={1}>
                    {sponsorData.name}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                  borderWidth: 0.5,
                  borderColor: isExpired ? '#EF4444' : '#34D399',
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isExpired ? '#EF4444' : '#34D399' }}>
                    {isExpired ? '🔴 EXPIRED' : `🟢 AKTIF`}
                  </Text>
                </View>
              </View>

              {/* Detail baris */}
              <View style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="id-card-outline" size={13} color="#FBBF24" />
                  <Text style={{ fontSize: 12, color: '#A1A1AA' }}>
                    KTA: <Text style={{ color: '#FBBF24', fontWeight: '700' }}>{sponsorData.sponsor_id}</Text>
                    {' '}• {sponsorData.category}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar-outline" size={13} color="#A1A1AA" />
                  <Text style={{ fontSize: 12, color: '#A1A1AA' }}>
                    Masa: {sponsorData.contract_start} s/d {sponsorData.contract_end}
                    {!isExpired && (
                      <Text style={{ color: '#34D399', fontWeight: '600' }}> ({remainingDays} hari lagi)</Text>
                    )}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="storefront-outline" size={13} color={isExpired ? '#71717A' : '#FBBF24'} />
                  <Text style={{ fontSize: 12, color: isExpired ? '#71717A' : '#A1A1AA' }}>
                    Lapak: <Text style={{ color: isExpired ? '#71717A' : '#FBBF24' }}>
                      {sponsorData.lapak_id || '-'}
                    </Text>
                    {' '}({isExpired ? 'Berakhir' : 'Aktif'})
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={13} color={isExpired ? '#71717A' : '#34D399'} />
                  <Text style={{ fontSize: 12, color: isExpired ? '#71717A' : '#34D399' }}>
                    Forum: {isExpired ? 'Terkunci (Jatuh Tempo)' : 'Akses Penuh Aktif'}
                  </Text>
                </View>
              </View>

              {/* Banner Notifikasi Status Pengajuan (Disetujui / Ditolak) */}
              {sponsorData.last_notification && (
                <View style={{
                  backgroundColor: sponsorData.last_notification.type === 'REJECTED'
                    ? 'rgba(239,68,68,0.1)'
                    : 'rgba(52,211,153,0.1)',
                  borderWidth: 1,
                  borderColor: sponsorData.last_notification.type === 'REJECTED' ? '#EF4444' : '#34D399',
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons
                        name={sponsorData.last_notification.type === 'REJECTED' ? 'close-circle' : 'checkmark-circle'}
                        size={16}
                        color={sponsorData.last_notification.type === 'REJECTED' ? '#F87171' : '#34D399'}
                      />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: sponsorData.last_notification.type === 'REJECTED' ? '#F87171' : '#34D399' }}>
                        {sponsorData.last_notification.title}
                      </Text>
                    </View>
                    <Pressable
                      onPress={async () => {
                        await SponsorService.dismissNotification(sponsorData.id);
                        const list = await SponsorService.getSponsors();
                        const found = list.find((s) => s.sponsor_id === member?.member_number);
                        if (found) setSponsorData(found);
                      }}
                      hitSlop={6}
                    >
                      <Ionicons name="close" size={14} color="#A1A1AA" />
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 11, color: '#FAFAFA', lineHeight: 16 }}>
                    {sponsorData.last_notification.message}
                  </Text>
                </View>
              )}

              {/* Status pending atau tombol perpanjang */}
              <View style={{ marginTop: 12 }}>
                {sponsorData.pending_renewal ? (
                  <View style={{
                    backgroundColor: 'rgba(251,191,36,0.08)',
                    borderWidth: 1, borderColor: '#FBBF24',
                    borderRadius: 8, padding: 10,
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                  }}>
                    <Ionicons name="time" size={16} color="#FBBF24" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FBBF24' }}>
                        Menunggu Persetujuan Admin
                      </Text>
                      <Text style={{ fontSize: 11, color: '#D4D4D8', marginTop: 2 }}>
                        +{sponsorData.pending_renewal.months} Bulan •{' '}
                        Rp {sponsorData.pending_renewal.fee.toLocaleString('id-ID')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleOpenRenewModal}
                      style={{ backgroundColor: 'rgba(251,191,36,0.2)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#FBBF24' }}>Ubah Bukti</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleOpenRenewModal}
                    style={({ pressed }) => ({
                      backgroundColor: pressed
                        ? (sponsorData.last_notification?.type === 'REJECTED' ? 'rgba(239,68,68,0.25)' : 'rgba(251,191,36,0.25)')
                        : (sponsorData.last_notification?.type === 'REJECTED' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.12)'),
                      borderWidth: 1,
                      borderColor: sponsorData.last_notification?.type === 'REJECTED' ? '#EF4444' : '#FBBF24',
                      borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    })}
                  >
                    <Ionicons
                      name={sponsorData.last_notification?.type === 'REJECTED' ? 'refresh-circle' : 'refresh'}
                      size={15}
                      color={sponsorData.last_notification?.type === 'REJECTED' ? '#F87171' : '#FBBF24'}
                    />
                    <Text style={{ color: sponsorData.last_notification?.type === 'REJECTED' ? '#F87171' : '#FBBF24', fontSize: 13, fontWeight: '700' }}>
                      {sponsorData.last_notification?.type === 'REJECTED'
                        ? 'Ajukan Ulang Perpanjangan (Upload Struk Baru)'
                        : 'Perpanjang Sewa Lapak (Wajib Bayar)'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })()}

        {/* 2.5. Card Tier Loyalitas & Prestise Anggota (MBUX Dark Luxury) */}
        <View style={[styles.tierCard, { borderColor: tierConfig.badgeColor + '55' }]}>
          <View style={styles.tierTopRow}>
            <View style={styles.tierBadgeLeft}>
              <View
                style={[
                  styles.tierStarCircle,
                  { backgroundColor: tierConfig.badgeColor + '1F', borderColor: tierConfig.badgeColor },
                ]}
              >
                <Ionicons name="sparkles" size={14} color={tierConfig.badgeColor} />
              </View>
              <View>
                <Text style={styles.tierSubHeader}>TIER KEANGGOTAAN RESMI</Text>
                <Text style={[styles.tierTitleHeader, { color: tierConfig.badgeColor }]}>
                  {tierConfig.tier} • {tierConfig.title}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => fetchTier(true)}
                disabled={syncingTier}
                hitSlop={8}
                style={({ pressed }) => [{ opacity: pressed || syncingTier ? 0.5 : 1, padding: 4 }]}
              >
                {syncingTier ? (
                  <ActivityIndicator size="small" color="#C5A059" />
                ) : (
                  <Ionicons name="refresh-circle" size={20} color="#A1A1AA" />
                )}
              </Pressable>
              <View style={styles.pointsPillBox}>
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text style={styles.pointsCountText}>{tierData?.points ?? 0}</Text>
                <Text style={styles.pointsCountLabel}>Poin</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar ke Tier Berikutnya */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${tierProgress.progressPercent}%`, backgroundColor: tierConfig.badgeColor },
                ]}
              />
            </View>
            <View style={styles.progressBarTextRow}>
              <Text style={styles.progressPercentText}>{tierProgress.progressPercent}% Progres</Text>
              <Text style={styles.progressGoalText}>
                {tierProgress.nextTier
                  ? `${tierProgress.pointsNeeded} poin lagi ke ${tierProgress.nextTier}`
                  : '⭐ Tier Tertinggi VIP Pillar!'}
              </Text>
            </View>
          </View>

          {/* Highlight Benefit */}
          <View style={styles.tierBenefitSummaryRow}>
            <View style={styles.tierBenefitItem}>
              <Ionicons name="pricetag-outline" size={12} color="#E4E4E7" />
              <Text style={styles.tierBenefitItemText}>Diskon Lapak {tierConfig.sewaDiscount}%</Text>
            </View>
            <View style={styles.tierBenefitItem}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#10B981" />
              <Text style={styles.tierBenefitItemText}>Event 100% Gratis</Text>
            </View>
            <View style={styles.tierBenefitItem}>
              <Ionicons name="car-outline" size={12} color="#60A5FA" />
              <Text style={styles.tierBenefitItemText}>Slot Display</Text>
            </View>
          </View>

          {/* Tombol Buka Modal Info */}
          <Pressable
            style={({ pressed }) => [styles.tierDetailActionBtn, pressed && styles.tierDetailActionBtnPressed]}
            onPress={() => setShowTierModal(true)}
          >
            <Text style={styles.tierDetailActionBtnText}>Lihat Benefit, Aturan Poin & Riwayat</Text>
            <Ionicons name="chevron-forward" size={14} color="#C5A059" />
          </Pressable>
        </View>

        {/* 3. Grouping Menu Navigasi */}
        {menuGroups.map((group) => (
          <View key={group.title} style={styles.groupContainer}>
            <Text style={styles.groupHeaderTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, idx, arr) => (
                <Pressable
                  key={item.label}
                  onPress={() => handleMenuPress(item)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    idx < arr.length - 1 && styles.menuItemBorder,
                    item.isHighlight && styles.menuItemHighlight,
                    pressed && styles.menuItemPressed,
                  ]}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <View style={[styles.menuIconBox, item.isHighlight && styles.menuIconBoxHighlight]}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={item.isHighlight ? '#E4E4E7' : '#A1A1AA'}
                    />
                  </View>
                  <Text style={[styles.menuLabel, item.isHighlight && styles.menuLabelHighlight]}>
                    {item.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#52525B" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* 4. Minimalist Ghost/Outline Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutGhostBtn,
            pressed && styles.signOutGhostBtnPressed,
          ]}
          android_ripple={{ color: 'rgba(239, 68, 68, 0.15)' }}
        >
          <Ionicons name="log-out-outline" size={18} color="#F87171" />
          <Text style={styles.signOutGhostBtnText}>Keluar dari Akun</Text>
        </Pressable>

        <Text style={styles.versionText}>MB Club Indonesia v1.0.0</Text>
        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* ── Modal Perpanjangan Sewa Lapak Sponsor ───────────────── */}
      <Modal visible={renewModalVisible} transparent animationType="slide" onRequestClose={() => setRenewModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Perpanjang Sewa Lapak</Text>
                <Text style={styles.modalSubtitle}>Pembayaran Kemitraan Sponsor Resmi MB INA</Text>
              </View>
              <Pressable onPress={() => setRenewModalVisible(false)} style={styles.modalCloseBtn} hitSlop={8}>
                <Ionicons name="close" size={20} color="#E4E4E7" />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Info sponsor */}
              {sponsorData && (
                <View style={{ backgroundColor: '#18181B', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <Text style={{ fontSize: 10, color: '#71717A', fontWeight: '600', letterSpacing: 1 }}>MITRA SPONSOR</Text>
                  <Text style={{ fontSize: 14, color: '#FAFAFA', fontWeight: '700', marginTop: 2 }}>{sponsorData.name}</Text>
                  <Text style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>
                    {sponsorData.sponsor_id} • Masa saat ini berakhir: {sponsorData.contract_end}
                  </Text>
                </View>
              )}

              {/* Pilih durasi */}
              <Text style={{ fontSize: 12, color: '#A1A1AA', fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 }}>
                PILIH DURASI PERPANJANGAN *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {[3, 6, 12].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setRenewMonths(m)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 10,
                      borderRadius: 8, borderWidth: 1,
                      backgroundColor: renewMonths === m ? 'rgba(251,191,36,0.15)' : '#18181B',
                      borderColor: renewMonths === m ? '#FBBF24' : '#3F3F46',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: renewMonths === m ? '#FBBF24' : '#A1A1AA' }}>
                      +{m} Bln
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Rincian biaya */}
              <View style={{ backgroundColor: 'rgba(251,191,36,0.06)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: '#FBBF24', fontWeight: '700', marginBottom: 8 }}>💰 Rincian Biaya Sewa:</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#A1A1AA' }}>Tarif dasar:</Text>
                  <Text style={{ fontSize: 12, color: '#FAFAFA', fontWeight: '600' }}>Rp 5.000 / bulan</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#A1A1AA' }}>Durasi:</Text>
                  <Text style={{ fontSize: 12, color: '#FAFAFA', fontWeight: '600' }}>{renewMonths} bulan</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: '#F87171' }}>Diskon sponsor:</Text>
                  <Text style={{ fontSize: 12, color: '#F87171', fontWeight: '700' }}>0% (Tanpa Diskon)</Text>
                </View>
                <View style={{ height: 0.5, backgroundColor: '#3F3F46', marginVertical: 6 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#FBBF24', fontWeight: '700' }}>Total dibayar:</Text>
                  <Text style={{ fontSize: 18, color: '#FBBF24', fontWeight: '800' }}>
                    Rp {(renewMonths * 5000).toLocaleString('id-ID')}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: '#71717A', fontStyle: 'italic', marginTop: 6 }}>
                  * Perpanjangan sponsor tidak mendapat diskon. Tarif penuh berlaku.
                </Text>
              </View>

              {/* Rekening pembayaran */}
              <View style={{ backgroundColor: '#0F0F11', borderWidth: 1, borderColor: '#27272A', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: '#60A5FA', fontWeight: '700', marginBottom: 6 }}>🏦 Transfer ke Rekening Resmi MB INA:</Text>
                <Text style={{ fontSize: 12, color: '#E4E4E7', fontWeight: '700' }}>Bank Mandiri</Text>
                <Text style={{ fontSize: 16, color: '#FBBF24', fontWeight: '800', fontFamily: 'monospace', marginVertical: 2 }}>
                  137-00-1234567-8
                </Text>
                <Text style={{ fontSize: 11, color: '#A1A1AA' }}>a.n. MERCEDES-BENZ CLUB INDONESIA</Text>
              </View>

              {/* Upload bukti transfer */}
              <Text style={{ fontSize: 12, color: '#A1A1AA', fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 }}>
                BUKTI TRANSFER PEMBAYARAN <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>

              <Pressable
                onPress={handlePickProofImage}
                style={{
                  backgroundColor: renewProof.trim() ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.06)',
                  borderWidth: 1.5,
                  borderColor: renewProof.trim() ? '#34D399' : '#FBBF24',
                  borderRadius: 8, borderStyle: 'dashed',
                  paddingVertical: 16, paddingHorizontal: 14,
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  marginBottom: 10,
                }}
              >
                <Ionicons
                  name={renewProof.trim() ? 'checkmark-circle' : 'cloud-upload-outline'}
                  size={26}
                  color={renewProof.trim() ? '#34D399' : '#FBBF24'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: renewProof.trim() ? '#34D399' : '#FBBF24' }}>
                    {renewProof.trim() ? '✓ Bukti Terlampir' : 'Upload Bukti Transfer'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>
                    {renewProof.trim() ? 'Tekan untuk mengganti' : 'Foto / screenshot struk transfer'}
                  </Text>
                </View>
                <View style={{ backgroundColor: renewProof.trim() ? '#34D399' : '#FBBF24', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#09090B' }}>
                    {renewProof.trim() ? 'Ganti' : 'Pilih'}
                  </Text>
                </View>
              </Pressable>

              {renewProof.trim() !== '' && (
                <View style={{ backgroundColor: '#18181B', borderWidth: 1, borderColor: '#34D399', borderRadius: 8, padding: 8, marginBottom: 8, alignItems: 'center' }}>
                  <Image source={{ uri: renewProof.trim() }} style={{ width: '100%', height: 140, borderRadius: 6 }} resizeMode="contain" />
                  <Pressable onPress={() => setRenewProof('')} style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="trash-outline" size={13} color="#F87171" />
                    <Text style={{ fontSize: 10, color: '#F87171' }}>Hapus & Ganti Bukti</Text>
                  </Pressable>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View style={{ flex: 1, height: 0.5, backgroundColor: '#3F3F46' }} />
                <Text style={{ fontSize: 10, color: '#52525B' }}>atau tempel URL gambar</Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: '#3F3F46' }} />
              </View>
              <TextInput
                style={{ backgroundColor: '#18181B', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 8, color: '#FAFAFA', fontSize: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 }}
                placeholder="https://drive.google.com/... atau link gambar bukti"
                placeholderTextColor="#52525B"
                value={renewProof}
                onChangeText={setRenewProof}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={{ fontSize: 10, color: '#EF4444', marginBottom: 12 }}>
                * Wajib. Admin tidak dapat menyetujui tanpa bukti transfer.
              </Text>

              {/* Catatan */}
              <Text style={{ fontSize: 12, color: '#A1A1AA', fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 }}>
                CATATAN PEMBAYARAN (OPSIONAL)
              </Text>
              <TextInput
                style={{ backgroundColor: '#18181B', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 8, color: '#FAFAFA', fontSize: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20 }}
                placeholder="Contoh: Transfer via m-Banking Mandiri a.n. PT Pro Motor"
                placeholderTextColor="#71717A"
                value={renewNotes}
                onChangeText={setRenewNotes}
              />

              {/* Tombol aksi */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setRenewModalVisible(false)}
                  style={{ flex: 1, backgroundColor: '#27272A', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#A1A1AA', fontWeight: '700', fontSize: 13 }}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitRenewSponsor}
                  disabled={submittingRenew}
                  style={{ flex: 2, backgroundColor: '#FBBF24', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }}
                >
                  {submittingRenew
                    ? <ActivityIndicator size="small" color="#09090B" />
                    : <Text style={{ color: '#09090B', fontWeight: '800', fontSize: 13 }}>Kirim Pengajuan</Text>
                  }
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Detail Tier & Aturan Poin */}
      <Modal
        visible={showTierModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTierModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Sistem Tier & Loyalitas</Text>
                <Text style={styles.modalSubtitle}>Mercedes-Benz Club Indonesia</Text>
              </View>
              <Pressable
                onPress={() => setShowTierModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#E4E4E7" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Ringkasan Poin Saya */}
              <View style={[styles.modalTierSummary, { borderColor: tierConfig.badgeColor + '55' }]}>
                <View style={[styles.modalTierIconWrap, { backgroundColor: tierConfig.badgeColor + '22', borderColor: tierConfig.badgeColor }]}>
                  <Ionicons name="sparkles" size={18} color={tierConfig.badgeColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTierMeta}>TIER ANDA SAAT INI</Text>
                  <Text style={[styles.modalTierName, { color: tierConfig.badgeColor }]}>
                    {tierConfig.tier} • {tierConfig.title}
                  </Text>
                  <Text style={styles.modalTierPoints}>{tierData?.points ?? 0} Poin Terkumpul</Text>

                  <View style={styles.modalTierActionRow}>
                    <Pressable
                      style={styles.modalSyncBtn}
                      onPress={() => fetchTier(true)}
                      disabled={syncingTier}
                    >
                      {syncingTier ? (
                        <ActivityIndicator size="small" color="#E4E4E7" />
                      ) : (
                        <Ionicons name="sync-outline" size={13} color="#E4E4E7" />
                      )}
                      <Text style={styles.modalSyncBtnText}>Hitung Ulang Real</Text>
                    </Pressable>

                    {isAdmin && (
                      <Pressable
                        style={styles.modalAdminResetBtn}
                        onPress={handleAdminResetAll}
                        disabled={adminSyncing}
                      >
                        {adminSyncing ? (
                          <ActivityIndicator size="small" color="#FBBF24" />
                        ) : (
                          <Ionicons name="refresh" size={13} color="#FBBF24" />
                        )}
                        <Text style={styles.modalAdminResetBtnText}>Reset Semua Member</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              {/* Bagian 1: Aturan Perolehan Poin Komunitas */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>ATURAN PEROLEHAN POIN KOMUNITAS</Text>
                <Text style={styles.modalSectionDesc}>
                  Semua event komunitas 100% GRATIS dan tanpa iuran bulanan. Poin diperoleh dari partisipasi aktif anggota:
                </Text>

                <View style={styles.ruleItem}>
                  <View style={[styles.ruleBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Text style={[styles.rulePoints, { color: '#60A5FA' }]}>+100</Text>
                  </View>
                  <View style={styles.ruleTextCol}>
                    <Text style={styles.ruleTitle}>Kehadiran di Event Resmi Komunitas</Text>
                    <Text style={styles.ruleSubtitle}>Presensi check-in KTA saat gathering chapter, touring, atau jamnas.</Text>
                  </View>
                </View>

                <View style={styles.ruleItem}>
                  <View style={[styles.ruleBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.rulePoints, { color: '#34D399' }]}>+25</Text>
                  </View>
                  <View style={styles.ruleTextCol}>
                    <Text style={styles.ruleTitle}>Bonus Membawa Keluarga / Saudara / Teman</Text>
                    <Text style={styles.ruleSubtitle}>Dihitung per orang pendamping yang ikut meramaikan acara bersama Anda.</Text>
                  </View>
                </View>

                <View style={styles.ruleItem}>
                  <View style={[styles.ruleBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Text style={[styles.rulePoints, { color: '#FBBF24' }]}>+10</Text>
                  </View>
                  <View style={styles.ruleTextCol}>
                    <Text style={styles.ruleTitle}>Ulasan Toko Sponsor Resmi</Text>
                    <Text style={styles.ruleSubtitle}>Memberikan rating & ulasan toko official sponsor setelah bertransaksi.</Text>
                  </View>
                </View>

                <View style={styles.ruleItem}>
                  <View style={[styles.ruleBadge, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                    <Text style={[styles.rulePoints, { color: '#C084FC' }]}>+5</Text>
                  </View>
                  <View style={styles.ruleTextCol}>
                    <Text style={styles.ruleTitle}>Ulasan Toko Anggota (Member)</Text>
                    <Text style={styles.ruleSubtitle}>Memberikan rating & ulasan toko lapak anggota setelah bertransaksi.</Text>
                  </View>
                </View>

                <View style={styles.ruleItem}>
                  <View style={[styles.ruleBadge, { backgroundColor: 'rgba(212, 212, 216, 0.15)' }]}>
                    <Text style={[styles.rulePoints, { color: '#E4E4E7' }]}>+1</Text>
                  </View>
                  <View style={styles.ruleTextCol}>
                    <Text style={styles.ruleTitle}>Aktivitas Forum Diskusi</Text>
                    <Text style={styles.ruleSubtitle}>Membuat topik thread baru atau membalas komentar diskusi forum.</Text>
                  </View>
                </View>

                <View style={styles.ruleItem}>
                  <View style={[styles.ruleBadge, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                    <Text style={[styles.rulePoints, { color: '#FBBF24' }]}>+Sewa</Text>
                  </View>
                  <View style={styles.ruleTextCol}>
                    <Text style={styles.ruleTitle}>Poin Sewa Lapak Toko Resmi</Text>
                    <Text style={styles.ruleSubtitle}>Pemilik lapak mendapatkan poin sebanyak biaya sewa saat disetujui (misal: Rp 48.000 = +48 Poin).</Text>
                  </View>
                </View>
              </View>

              {/* Bagian 2: 4 Jenjang Tier Resmi & Benefit */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>4 JENJANG TIER & BENEFIT</Text>

                {Object.values(TIER_CONFIG).map((cfg) => {
                  const isCurrent = cfg.tier === currentTier;
                  return (
                    <View
                      key={cfg.tier}
                      style={[
                        styles.tierBreakdownCard,
                        isCurrent && { borderColor: cfg.badgeColor, borderWidth: 1.5 },
                      ]}
                    >
                      <View style={styles.tierBreakdownHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.tierBreakdownDot, { backgroundColor: cfg.badgeColor }]} />
                          <Text style={[styles.tierBreakdownTitle, { color: cfg.badgeColor }]}>
                            {cfg.tier} • {cfg.title}
                          </Text>
                        </View>
                        <Text style={styles.tierBreakdownPoints}>
                          {cfg.tier === 'PLATINUM'
                            ? '≥ 3.201 Poin'
                            : `${cfg.minPoints} – ${cfg.maxPoints} Poin`}
                        </Text>
                      </View>

                      <View style={styles.tierPrivilegeList}>
                        {cfg.privileges.map((p, idx) => (
                          <View key={idx} style={styles.privilegeBulletRow}>
                            <Ionicons name="checkmark-circle" size={13} color={cfg.badgeColor} />
                            <Text style={styles.privilegeBulletText}>{p}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Bagian 3: Riwayat Poin Member */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>RIWAYAT PEROLEHAN POIN ANDA</Text>
                {tierData?.history && tierData.history.length > 0 ? (
                  tierData.history.map((log) => (
                    <View key={log.id} style={styles.historyItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyReason}>{log.reason}</Text>
                        <Text style={styles.historyDate}>{log.date}</Text>
                      </View>
                      <Text style={styles.historyPointsText}>+{log.points} Poin</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.historyEmptyText}>Belum ada riwayat perolehan poin.</Text>
                )}
              </View>

              <View style={{ height: 24 }} />
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
    paddingBottom: Spacing['2xl'],
  },
  titleRow: {
    paddingVertical: Spacing.base,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // 1. Profile Glass-Card
  profileGlassCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: Spacing.base,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    borderColor: '#3F3F46',
    padding: 3,
    backgroundColor: '#18181B',
    position: 'relative',
    marginRight: 16,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: '#090A0C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F4F4F5',
    letterSpacing: 0.5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  avatarAdminBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#27272A',
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  profileEmail: {
    fontSize: 12.5,
    color: '#71717A',
    marginTop: 2,
  },
  memberNumber: {
    fontSize: 12,
    color: '#E4E4E7',
    fontWeight: '700',
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  chapterText: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },

  // Status Row & Minimalist Pills
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  dotActive: {
    backgroundColor: '#34D399',
  },
  dotPending: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 11.5,
    color: '#D4D4D8',
    fontWeight: '500',
  },
  rolePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#D4D4D8',
    fontWeight: '500',
  },

  // 2. Card Kendaraan (Garage Badge)
  vehicleBadgeCard: {
    backgroundColor: '#111215',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 18,
    padding: 16,
    marginBottom: Spacing.lg,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  vehicleModel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  plateBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  plateText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: '#F4F4F5',
    letterSpacing: 1.8,
  },

  // 3. Grouped Navigation Cards
  groupContainer: {
    marginBottom: 20,
  },
  groupHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: 'rgba(9, 10, 12, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIconBoxHighlight: {
    borderColor: 'rgba(212, 212, 216, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    color: '#D4D4D8',
    fontWeight: '500',
  },
  menuLabelHighlight: {
    color: '#F4F4F5',
    fontWeight: '600',
  },

  // 4. Ghost/Outline Sign Out Button
  signOutGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    marginTop: 8,
    marginBottom: 16,
  },
  signOutGhostBtnPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  signOutGhostBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#F87171',
    letterSpacing: 0.3,
  },

  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#52525B',
    marginTop: 4,
    marginBottom: 16,
    letterSpacing: 0.4,
  },

  // ── Tier Card & Modal Styles ──────────────────────────────
  tierCard: {
    backgroundColor: '#0D0E12',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.base,
  },
  tierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  tierStarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierSubHeader: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tierTitleHeader: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  pointsPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    gap: 4,
  },
  pointsCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
  },
  pointsCountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FBBF24',
  },
  progressBarContainer: {
    marginTop: 14,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressBarTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressPercentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A1A1AA',
  },
  progressGoalText: {
    fontSize: 10,
    color: '#71717A',
  },
  tierBenefitSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tierBenefitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tierBenefitItemText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  tierDetailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  tierDetailActionBtnPressed: {
    opacity: 0.7,
  },
  tierDetailActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C5A059',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: '#0F1015',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 20,
  },
  modalTierSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#161820',
    borderWidth: 1,
    marginBottom: 20,
  },
  modalTierIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTierMeta: {
    fontSize: 9,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.2,
  },
  modalTierName: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  modalTierPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4D4D8',
    marginTop: 2,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#C5A059',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  modalSectionDesc: {
    fontSize: 12,
    color: '#A1A1AA',
    lineHeight: 18,
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  ruleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
  },
  rulePoints: {
    fontSize: 12,
    fontWeight: '800',
  },
  ruleTextCol: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  ruleSubtitle: {
    fontSize: 10.5,
    color: '#71717A',
    marginTop: 2,
    lineHeight: 15,
  },
  tierBreakdownCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  tierBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tierBreakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierBreakdownTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  tierBreakdownPoints: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A1A1AA',
  },
  tierPrivilegeList: {
    gap: 6,
  },
  privilegeBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privilegeBulletText: {
    fontSize: 11,
    color: '#D4D4D8',
    flex: 1,
    lineHeight: 16,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  historyReason: {
    fontSize: 12,
    color: '#E4E4E7',
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 10,
    color: '#71717A',
    marginTop: 2,
  },
  historyPointsText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 10,
  },
  historyEmptyText: {
    fontSize: 12,
    color: '#71717A',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalTierActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  modalSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalSyncBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  modalAdminResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  modalAdminResetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },
});
