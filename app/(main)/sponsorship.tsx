// ============================================================
// Sponsorship — Direktori Mitra & Kelola Sponsor (Admin)
// Mercedes-Benz Club Indonesia
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Linking,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LuxuryCard } from '../../src/components/ui/LuxuryCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../src/constants/theme';
import { SponsorService, type SponsorItem } from '../../src/services/sponsorService';
import { useAuth } from '../../src/context/AuthContext';

const SPONSOR_ICONS: Record<string, string> = {
  Bengkel: 'build-outline',
  Asuransi: 'shield-outline',
  Aksesoris: 'car-outline',
  Hotel: 'bed-outline',
  Restoran: 'restaurant-outline',
  Default: 'star-outline',
};

const DEFAULT_CATEGORIES = [
  'Bengkel',
  'Asuransi',
  'Aksesoris',
  'Hotel',
  'Restoran',
  'Dealer Resmi',
  'Pelumas & Bahan Bakar',
  'Perbankan & Keuangan',
];

export default function SponsorshipScreen() {
  const { user, profile, isAdmin } = useAuth();

  // Deteksi apakah user yang login adalah sponsor
  const isSponsor = !!(
    user?.id?.startsWith('spn_') ||
    profile?.email?.includes('mbandro.org') && !isAdmin
  );

  const [activeTab, setActiveTab] = useState<'direktori' | 'kelola' | 'dashboard'>(
    isSponsor ? 'dashboard' : 'direktori'
  );
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [sponsorSelf, setSponsorSelf] = useState<SponsorItem | null>(null); // data sponsor yg login
  const [category, setCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // ── State Modal Input Sponsor Baru (Admin) ──────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [nextMemberNumber, setNextMemberNumber] = useState('MBINA-SPN-2026-001');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Bengkel');
  const [formPicName, setFormPicName] = useState('');
  const [formPicPhone, setFormPicPhone] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscount, setFormDiscount] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formDuration, setFormDuration] = useState(3); // 3 bulan default
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('spn@20252027');
  const [submitting, setSubmitting] = useState(false);

  // ── State Modal Perpanjang Sponsor (Wajib Bayar & Bukti Transfer) ──
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [targetRenewSponsor, setTargetRenewSponsor] = useState<SponsorItem | null>(null);
  const [renewMonths, setRenewMonths] = useState(3);
  const [renewProof, setRenewProof] = useState('');
  const [renewNotes, setRenewNotes] = useState('');
  const [submittingRenew, setSubmittingRenew] = useState(false);

  // ── State Modal Review Bukti & Approval Admin ──────────────────
  const [reviewProofModalVisible, setReviewProofModalVisible] = useState(false);
  const [targetReviewSponsor, setTargetReviewSponsor] = useState<SponsorItem | null>(null);

  const loadSponsors = useCallback(async () => {
    setLoading(true);
    try {
      const list = await SponsorService.getSponsors();
      setSponsors(list);
      const cats = Array.from(new Set(list.map((s) => s.category)));
      setCategories(cats);

      // Jika yang login adalah sponsor, cari data dirinya sendiri
      if (isSponsor && user?.email) {
        const self = list.find(
          (s) =>
            s.sponsor_id?.includes('SPN') &&
            (profile?.email === `sponsor_promotor@mbandro.org`
              ? s.sponsor_id === 'MBINA-SPN-2026-001'
              : profile?.email?.includes(s.name?.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15) ?? ''))
        ) ?? list[0]; // fallback ke sponsor pertama jika hanya 1 data
        setSponsorSelf(self ?? null);
      }
    } catch (e) {
      console.warn('Error loading sponsors:', e);
    } finally {
      setLoading(false);
    }
  }, [isSponsor, user?.email, profile?.email]);

  useEffect(() => {
    loadSponsors();
  }, [loadSponsors]);

  useEffect(() => {
    if (isSponsor && activeTab === 'direktori') {
      setActiveTab('dashboard');
    }
  }, [isSponsor, activeTab]);

  const handleOpenAddModal = async () => {
    try {
      const nextNum = await SponsorService.generateNextMemberNumber();
      setNextMemberNumber(nextNum);
    } catch {}
    setFormName('');
    setFormCategory('Bengkel');
    setFormPicName('');
    setFormPicPhone('');
    setFormDescription('');
    setFormDiscount('');
    setFormLogo('');
    setFormWebsite('');
    setFormDuration(3);
    setFormEmail('');
    setFormPassword('spn@20252027');
    setModalVisible(true);
  };

  const handleFillDemoLogo = () => {
    setFormLogo('https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=300');
  };

  const handleOpenRenewModal = (sponsor: SponsorItem) => {
    setTargetRenewSponsor(sponsor);
    if (sponsor.pending_renewal) {
      setRenewMonths(sponsor.pending_renewal.months || 3);
      setRenewProof(sponsor.pending_renewal.payment_proof_url || '');
      setRenewNotes(sponsor.pending_renewal.notes || '');
    } else {
      setRenewMonths(3);
      setRenewProof('');
      setRenewNotes('');
    }
    setRenewModalVisible(true);
  };

  // ── Pilih / upload foto bukti transfer ──────────────────────
  // Web  : membuka file picker bawaan browser (input[type=file])
  // Mobile: membuka prompt untuk tempel URL gambar bukti transfer
  const handlePickProofImage = () => {
    if (Platform.OS === 'web') {
      // Buka file picker HTML native — tidak butuh library eksternal
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
      // Mobile: tempel / ketik URL gambar bukti (Google Drive, WhatsApp, dll.)
      Alert.alert(
        'Upload Bukti Transfer',
        'Tempel link / URL foto bukti transfer (Google Drive, WhatsApp, screenshot).',
        [
          {
            text: 'Masukkan URL',
            onPress: () => {
              // Pada mobile, buka sheet URL — user mengetik di TextInput di modal
              Alert.prompt
                ? Alert.prompt(
                    'URL Foto Bukti Transfer',
                    'Tempel URL gambar bukti transfer:',
                    [
                      { text: 'Batal', style: 'cancel' },
                      {
                        text: 'Simpan',
                        onPress: (url?: string) => {
                          if (url?.trim()) setRenewProof(url.trim());
                        },
                      },
                    ],
                    'plain-text',
                    renewProof
                  )
                : Alert.alert(
                    'Info',
                    'Tempel URL gambar bukti transfer di kolom teks yang tersedia di bawah form.'
                  );
            },
          },
          { text: 'Batal', style: 'cancel' },
        ]
      );
    }
  };


  const handleSubmitRenewSponsor = async () => {
    if (!targetRenewSponsor) return;
    if (!renewProof.trim()) {
      Alert.alert(
        'Bukti Transfer Wajib',
        'Sebelum pengajuan perpanjangan diproses, Anda WAJIB melampirkan bukti transfer pembayaran sewa lapak & kemitraan ke Bank Mandiri 137-00-1234567-8 a.n. MERCEDES-BENZ CLUB INDONESIA.'
      );
      return;
    }

    setSubmittingRenew(true);
    try {
      const res = await SponsorService.requestRenewSponsor({
        sponsorId: targetRenewSponsor.id,
        months: renewMonths,
        paymentProofUrl: renewProof.trim(),
        notes: renewNotes.trim(),
      });

      if (res.success) {
        Alert.alert('Pengajuan Berhasil Dikirim 🎉', res.message);
        setRenewModalVisible(false);
        await loadSponsors();
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengajukan perpanjangan.');
    } finally {
      setSubmittingRenew(false);
    }
  };

  const handleOpenReviewProof = (sponsor: SponsorItem) => {
    setTargetReviewSponsor(sponsor);
    setReviewProofModalVisible(true);
  };

  const handleApproveRenew = async (sponsor: SponsorItem) => {
    try {
      const res = await SponsorService.approveRenewSponsor(sponsor.id);
      if (res.success) {
        Alert.alert('Perpanjangan Disetujui 🎉', res.message);
        setReviewProofModalVisible(false);
        await loadSponsors();
      } else {
        Alert.alert('Gagal Menyetujui', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyetujui perpanjangan.');
    }
  };

  const handleRejectRenew = async (sponsor: SponsorItem) => {
    const doReject = async (reason: string) => {
      try {
        const res = await SponsorService.rejectRenewSponsor(sponsor.id, reason);
        Alert.alert('Pengajuan Ditolak', res.message);
        setReviewProofModalVisible(false);
        await loadSponsors();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Gagal menolak perpanjangan.');
      }
    };

    if (Platform.OS === 'web') {
      const reason = window.prompt('Alasan penolakan perpanjangan:', 'Bukti transfer tidak valid / dana belum masuk.');
      if (reason !== null) {
        await doReject(reason || 'Bukti transfer tidak valid.');
      }
    } else {
      Alert.alert(
        'Tolak Pengajuan',
        'Apakah Anda yakin ingin menolak pengajuan perpanjangan sponsor ini?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Tolak', style: 'destructive', onPress: () => doReject('Bukti transfer tidak valid / nominal tidak sesuai.') },
        ]
      );
    }
  };

  const handleSubmitSponsor = async () => {
    if (!formName.trim()) {
      Alert.alert('Perhatian', 'Nama perusahaan / brand sponsor wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await SponsorService.createSponsor({
        name: formName.trim(),
        category: formCategory,
        picName: formPicName.trim(),
        picPhone: formPicPhone.trim(),
        description: formDescription.trim(),
        discountInfo: formDiscount.trim(),
        logoUrl: formLogo.trim() || undefined,
        websiteUrl: formWebsite.trim() || undefined,
        durationMonths: formDuration,
        autoCreateLapak: true,
      });

      if (res.success && res.sponsor) {
        // Simpan kredensial akun sponsor agar dapat langsung login di form login aplikasi
        const sanitizedName = formName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
        const loginEmail = formEmail.trim() || `sponsor_${sanitizedName}@mbandro.org`;
        const loginPass = formPassword.trim() || 'spn@20252027';

        try {
          const rawAccounts = await AsyncStorage.getItem('@mbclub_sponsor_accounts');
          const accounts = rawAccounts ? JSON.parse(rawAccounts) : [];
          accounts.push({
            id: res.sponsor.id,
            name: res.sponsor.name,
            sponsor_id: res.sponsor.sponsor_id,
            email: loginEmail,
            password: loginPass,
            phone: formPicPhone.trim() || '08123456789',
            logo_url: formLogo.trim() || res.sponsor.logo_url,
          });
          await AsyncStorage.setItem('@mbclub_sponsor_accounts', JSON.stringify(accounts));
        } catch (storageErr) {
          console.warn('Gagal menyimpan kredensial sponsor:', storageErr);
        }

        Alert.alert(
          'Sukses Mendaftarkan Sponsor! 🎉',
          `${res.message}\n\n🔐 Kredensial Login Sponsor:\n• Email: ${loginEmail}\n• Password: ${loginPass}\n\n(Sponsor login melalui form login yang sama dengan member/pengurus)`
        );
        setModalVisible(false);
        await loadSponsors();
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan sponsor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSponsor = (sponsor: SponsorItem) => {
    const doDelete = async () => {
      const res = await SponsorService.deleteSponsor(sponsor.id);
      Alert.alert('Informasi', res.message);
      await loadSponsors();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Hapus sponsor '${sponsor.name}' (${sponsor.sponsor_id})?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Hapus Sponsor',
        `Apakah Anda yakin ingin menghapus data sponsor '${sponsor.name}' (${sponsor.sponsor_id})?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Hapus', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const filtered = category === 'all' ? sponsors : sponsors.filter((s) => s.category === category);

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      {/* ── Header Bar ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sponsorship & Mitra</Text>
          <Text style={styles.subtitle}>Direktori Resmi Mitra Mercedes-Benz Club Indonesia</Text>
        </View>
      </View>

      {/* ── Subtab Navigasi berdasarkan Role ────────────────────── */}
      <View style={styles.tabContainer}>

        {/* Tab Dashboard Saya — hanya untuk Sponsor */}
        {isSponsor && (
          <Pressable
            onPress={() => setActiveTab('dashboard')}
            style={[styles.tabButton, activeTab === 'dashboard' && styles.tabButtonActive]}
          >
            <Ionicons name="ribbon" size={16} color={activeTab === 'dashboard' ? '#FFFFFF' : '#71717A'} />
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
              Dashboard Saya
            </Text>
          </Pressable>
        )}

        {/* Tab Direktori Mitra — hanya untuk Member & Admin (Sponsor TIDAK BOLEH melihat sponsor lain) */}
        {!isSponsor && (
          <Pressable
            onPress={() => setActiveTab('direktori')}
            style={[styles.tabButton, activeTab === 'direktori' && styles.tabButtonActive]}
          >
            <Ionicons name="ribbon-outline" size={16} color={activeTab === 'direktori' ? '#FFFFFF' : '#71717A'} />
            <Text style={[styles.tabText, activeTab === 'direktori' && styles.tabTextActive]}>
              Direktori Mitra
            </Text>
          </Pressable>
        )}

        {/* Tab Kelola Sponsor — hanya Admin */}
        {isAdmin && (
          <Pressable
            onPress={() => setActiveTab('kelola')}
            style={[styles.tabButton, activeTab === 'kelola' && styles.tabButtonActive]}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={activeTab === 'kelola' ? '#FFFFFF' : '#71717A'} />
            <Text style={[styles.tabText, activeTab === 'kelola' && styles.tabTextActive]}>
              Kelola Sponsor
            </Text>
            <View style={styles.adminBadgePill}>
              <Text style={styles.adminBadgePillText}>ADMIN</Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 0: DASHBOARD SPONSOR (hanya untuk sponsor yg login)   */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && isSponsor && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="large" color="#E4E4E7" style={{ marginTop: 40 }} />
          ) : sponsorSelf ? (() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isExpired = sponsorSelf.contract_end < todayStr;
            const remainingDays = Math.max(
              0,
              Math.ceil((new Date(sponsorSelf.contract_end).getTime() - Date.now()) / 86400000)
            );
            return (
              <>
                {/* Header kartu identitas sponsor */}
                <View style={{ backgroundColor: '#141518', borderWidth: 1, borderColor: isExpired ? 'rgba(239,68,68,0.4)' : '#2D3139', borderRadius: 16, padding: 16, marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    {sponsorSelf.logo_url ? (
                      <Image source={{ uri: sponsorSelf.logo_url }} style={{ width: 52, height: 52, borderRadius: 10 }} />
                    ) : (
                      <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#1E2024', borderWidth: 1, borderColor: '#2E3138', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="ribbon-outline" size={26} color="#E4E4E7" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: '#71717A', fontWeight: '600', letterSpacing: 1 }}>MITRA SPONSOR RESMI MB INA</Text>
                      <Text style={{ fontSize: 16, color: '#FAFAFA', fontWeight: '800' }} numberOfLines={1}>{sponsorSelf.name}</Text>
                      <Text style={{ fontSize: 12, color: '#C5A059', fontWeight: '600' }}>{sponsorSelf.sponsor_id} • {sponsorSelf.category}</Text>
                    </View>
                    <View style={{ backgroundColor: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: isExpired ? '#EF4444' : '#10B981' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: isExpired ? '#EF4444' : '#10B981' }}>
                        {isExpired ? '🔴 EXPIRED' : '🟢 AKTIF'}
                      </Text>
                    </View>
                  </View>

                  {/* Detail baris */}
                  <View style={{ gap: 7 }}>
                    {sponsorSelf.pic_name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="person-outline" size={14} color="#A1A1AA" />
                        <Text style={{ fontSize: 12, color: '#A1A1AA' }}>PIC: <Text style={{ color: '#E4E4E7' }}>{sponsorSelf.pic_name}</Text>{sponsorSelf.pic_phone ? ` (${sponsorSelf.pic_phone})` : ''}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="calendar-outline" size={14} color="#A1A1AA" />
                      <Text style={{ fontSize: 12, color: '#A1A1AA' }}>
                        Masa: {sponsorSelf.contract_start} s/d {sponsorSelf.contract_end}
                        {!isExpired && <Text style={{ color: '#10B981', fontWeight: '600' }}> ({remainingDays} hari lagi)</Text>}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="storefront-outline" size={14} color={sponsorSelf.lapak_id ? '#A1A1AA' : '#52525B'} />
                      <Text style={{ fontSize: 12, color: '#A1A1AA' }}>
                        Lapak: <Text style={{ color: sponsorSelf.lapak_id ? '#FFFFFF' : '#52525B' }}>{sponsorSelf.lapak_id || 'Belum ada'}</Text>
                        {sponsorSelf.lapak_id && <Text style={{ color: isExpired ? '#EF4444' : '#10B981' }}> ({isExpired ? 'Berakhir' : 'Aktif'})</Text>}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color={sponsorSelf.has_forum_access ? '#10B981' : '#52525B'} />
                      <Text style={{ fontSize: 12, color: sponsorSelf.has_forum_access ? '#10B981' : '#52525B' }}>
                        Forum: {sponsorSelf.has_forum_access ? 'Akses Penuh Aktif' : 'Terkunci (Jatuh Tempo)'}
                      </Text>
                    </View>
                    {sponsorSelf.website_url ? (
                      <Pressable onPress={() => Linking.openURL(sponsorSelf!.website_url!)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="globe-outline" size={14} color="#A1A1AA" />
                        <Text style={{ fontSize: 12, color: '#E4E4E7', textDecorationLine: 'underline' }}>{sponsorSelf.website_url}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {/* Status pending renewal atau tombol perpanjang */}
                {sponsorSelf.pending_renewal ? (
                  <View style={{ backgroundColor: '#18191D', borderWidth: 1, borderColor: '#2D3139', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Ionicons name="time-outline" size={18} color="#A1A1AA" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#F4F4F5' }}>Menunggu Persetujuan Admin</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#D4D4D8' }}>
                      Perpanjangan +{sponsorSelf.pending_renewal.months} Bulan telah diajukan.{'\n'}
                      Tagihan: <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Rp {sponsorSelf.pending_renewal.fee.toLocaleString('id-ID')}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: '#71717A', marginTop: 4 }}>
                      Diajukan: {new Date(sponsorSelf.pending_renewal.requested_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </Text>
                    <Pressable
                      onPress={() => handleOpenRenewModal(sponsorSelf!)}
                      style={{ marginTop: 8, backgroundColor: '#27272A', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, alignSelf: 'flex-start' }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#E4E4E7' }}>Ubah / Upload Ulang Bukti Transfer</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleOpenRenewModal(sponsorSelf!)}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#D4D4D8' : '#E4E4E7',
                      borderRadius: 12,
                      paddingVertical: 14, paddingHorizontal: 16,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                      marginBottom: 14,
                    })}
                  >
                    <Ionicons name="refresh" size={18} color="#09090B" />
                    <Text style={{ color: '#09090B', fontSize: 14, fontWeight: '800' }}>
                      {sponsorSelf.last_notification?.type === 'REJECTED'
                        ? 'Ajukan Ulang Perpanjangan Sewa Lapak'
                        : 'Perpanjang Sewa Lapak'}
                    </Text>
                  </Pressable>
                )}

                {/* Banner Notifikasi Status Pengajuan Terakhir (Disetujui / Ditolak) */}
                {sponsorSelf.last_notification && (
                  <View style={{
                    backgroundColor: sponsorSelf.last_notification.type === 'REJECTED'
                      ? 'rgba(239,68,68,0.1)'
                      : 'rgba(52,211,153,0.1)',
                    borderWidth: 1.5,
                    borderColor: sponsorSelf.last_notification.type === 'REJECTED' ? '#EF4444' : '#34D399',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 14,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons
                          name={sponsorSelf.last_notification.type === 'REJECTED' ? 'close-circle' : 'checkmark-circle'}
                          size={20}
                          color={sponsorSelf.last_notification.type === 'REJECTED' ? '#F87171' : '#34D399'}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: sponsorSelf.last_notification.type === 'REJECTED' ? '#F87171' : '#34D399' }}>
                          {sponsorSelf.last_notification.title}
                        </Text>
                      </View>
                      <Pressable
                        onPress={async () => {
                          await SponsorService.dismissNotification(sponsorSelf!.id);
                          await loadSponsors();
                        }}
                        hitSlop={8}
                      >
                        <Ionicons name="close" size={16} color="#A1A1AA" />
                      </Pressable>
                    </View>

                    <Text style={{ fontSize: 12, color: '#FAFAFA', lineHeight: 18, marginBottom: 4 }}>
                      {sponsorSelf.last_notification.message}
                    </Text>

                    {sponsorSelf.last_notification.type === 'REJECTED' && (
                      <Pressable
                        onPress={() => handleOpenRenewModal(sponsorSelf!)}
                        style={{
                          backgroundColor: '#EF4444',
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          marginTop: 8,
                        }}
                      >
                        <Ionicons name="refresh-circle" size={18} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                          Ajukan Ulang Perpanjangan (Upload Bukti Baru)
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}


                {/* Deskripsi & penawaran */}
                {sponsorSelf.description && (
                  <View style={{ backgroundColor: '#18181B', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, color: '#71717A', fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 }}>PROFIL MITRA</Text>
                    <Text style={{ fontSize: 13, color: '#D4D4D8', lineHeight: 20 }}>{sponsorSelf.description}</Text>
                    {sponsorSelf.discount_info && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(52,211,153,0.08)', padding: 8, borderRadius: 8 }}>
                        <Ionicons name="pricetag-outline" size={14} color="#34D399" />
                        <Text style={{ fontSize: 12, color: '#34D399', fontWeight: '600' }}>{sponsorSelf.discount_info}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Info cara perpanjangan */}
                <View style={{ backgroundColor: 'rgba(59,130,246,0.06)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Ionicons name="information-circle-outline" size={16} color="#60A5FA" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#60A5FA' }}>Informasi Perpanjangan Kerjasama</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#71717A', lineHeight: 18 }}>
                    Untuk memperpanjang masa kerjasama, tekan tombol di atas lalu:{'  \n'}
                    1. Pilih durasi perpanjangan (3/6/12 bulan){'\n'}
                    2. Transfer ke Bank Mandiri 137-00-1234567-8 a.n. MERCEDES-BENZ CLUB INDONESIA{'\n'}
                    3. Upload bukti transfer{'\n'}
                    4. Kirim pengajuan — Admin akan memverifikasi dalam 1x24 jam.
                  </Text>
                </View>
              </>
            );
          })() : (
            <View style={styles.empty}>
              <Ionicons name="ribbon-outline" size={48} color="#3F3F46" />
              <Text style={styles.emptyText}>Data kemitraan tidak ditemukan.</Text>
              <Text style={{ fontSize: 12, color: '#52525B', textAlign: 'center', marginTop: 6 }}>
                Hubungi Admin MB Club Indonesia untuk mengaktifkan akun sponsor Anda.
              </Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 1: DIREKTORI MITRA (PUBLIC VIEW — DILARANG UNTUK SPONSOR) */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'direktori' && !isSponsor && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Hero Banner */}
              <LuxuryCard variant="gold" style={styles.hero} padding={Spacing.lg}>
                <Ionicons name="ribbon-outline" size={32} color={Colors.brand.gold} />
                <Text style={styles.heroTitle}>Keuntungan Eksklusif Member</Text>
                <Text style={styles.heroDesc}>
                  Nikmati diskon spesial, fasilitas prioritas, dan penawaran eksklusif dari {sponsors.length} mitra resmi MB Club Indonesia.
                </Text>
              </LuxuryCard>

              {/* Category Filter */}
              <View style={styles.catRow}>
                {['all', ...categories].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[styles.chip, category === cat && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, category === cat && styles.chipLabelActive]}>
                      {cat === 'all' ? 'Semua' : cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <SectionHeader title={`${filtered.length} Mitra Resmi Terverifikasi`} />
            </>
          }
          renderItem={({ item }) => (
            <LuxuryCard style={styles.sponsorCard} padding={14}>
              <View style={styles.sponsorRow}>
                <View style={styles.sponsorLogo}>
                  {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.logoImg} />
                  ) : (
                    <Ionicons
                      name={(SPONSOR_ICONS[item.category] ?? SPONSOR_ICONS.Default) as any}
                      size={24}
                      color={Colors.brand.gold}
                    />
                  )}
                </View>
                <View style={styles.sponsorInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.sponsorName}>{item.name}</Text>
                    <View style={styles.partnerPill}>
                      <Ionicons name="checkmark-circle" size={11} color="#34D399" />
                      <Text style={styles.partnerPillText}>Resmi</Text>
                    </View>
                  </View>
                  <Text style={styles.sponsorCat}>
                    {item.category} • No. KTA: <Text style={{ color: '#C5A059' }}>{item.sponsor_id}</Text>
                  </Text>
                </View>
              </View>

              {item.description && (
                <Text style={styles.sponsorDesc} numberOfLines={3}>{item.description}</Text>
              )}

              {item.discount_info && (
                <View style={styles.discountBadge}>
                  <Ionicons name="pricetag-outline" size={13} color="#34D399" />
                  <Text style={styles.discountText}>{item.discount_info}</Text>
                </View>
              )}

              {/* Hak Fasilitas Badges */}
              <View style={styles.facilityRow}>
                <View style={styles.facilityBadge}>
                  <Ionicons name="storefront-outline" size={12} color="#A1A1AA" />
                  <Text style={styles.facilityBadgeText}>Lapak Toko Aktif</Text>
                </View>
                <View style={styles.facilityBadge}>
                  <Ionicons name="chatbubbles-outline" size={12} color="#A1A1AA" />
                  <Text style={styles.facilityBadgeText}>Forum Terverifikasi</Text>
                </View>
              </View>

              {item.website_url && (
                <Pressable
                  onPress={() => Linking.openURL(item.website_url!)}
                  style={styles.websiteBtn}
                >
                  <Ionicons name="globe-outline" size={14} color={Colors.status.info} />
                  <Text style={styles.websiteBtnText}>Kunjungi Website Resmi</Text>
                </Pressable>
              )}
            </LuxuryCard>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="ribbon-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>Belum ada mitra tersedia pada kategori ini.</Text>
            </View>
          }
        />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 2: KELOLA SPONSOR OLEH ADMIN                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'kelola' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* KPI Cards */}
          {(() => {
            const pendingCount = sponsors.filter((s) => s.pending_renewal).length;
            return (
              <>
                <View style={styles.kpiRow}>
                  <View style={styles.kpiBox}>
                    <Text style={styles.kpiLabel}>Total Mitra</Text>
                    <Text style={styles.kpiValue}>{sponsors.length}</Text>
                  </View>
                  <View style={[styles.kpiBox, { borderColor: pendingCount > 0 ? '#E4E4E7' : '#27272A' }]}>
                    <Text style={[styles.kpiLabel, { color: pendingCount > 0 ? '#FFFFFF' : '#71717A' }]}>Perpanjangan Pending</Text>
                    <Text style={[styles.kpiValue, { color: pendingCount > 0 ? '#FFFFFF' : '#71717A' }]}>
                      {pendingCount}
                    </Text>
                  </View>
                  <View style={[styles.kpiBox, { borderColor: '#27272A' }]}>
                    <Text style={[styles.kpiLabel, { color: '#A1A1AA' }]}>Hak Forum Aktif</Text>
                    <Text style={[styles.kpiValue, { color: '#F4F4F5' }]}>
                      {sponsors.filter((s) => s.has_forum_access).length}
                    </Text>
                  </View>
                </View>

                {/* Banner Pengajuan Perpanjangan Menunggu Verifikasi */}
                {pendingCount > 0 && (
                  <View style={{ backgroundColor: '#18191D', borderWidth: 1, borderColor: '#2D3139', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Ionicons name="time-outline" size={20} color="#A1A1AA" />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#F4F4F5' }}>
                        {pendingCount} PENGAJUAN PERPANJANGAN MENUNGGU VERIFIKASI
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#D4D4D8', lineHeight: 18 }}>
                      Sponsor telah mengunggah bukti transfer pembayaran sewa. Tekan tombol <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>"Review Bukti & Setujui"</Text> pada kartu sponsor di bawah ini untuk memverifikasi struk transfer.
                    </Text>
                  </View>
                )}
              </>
            );
          })()}

          {/* Tombol Input Sponsor Baru + Reset Data */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Pressable onPress={handleOpenAddModal} style={[styles.btnAddSponsor, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.btnAddSponsorText}>+ Daftarkan Sponsor Baru</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                const doReset = async () => {
                  const res = await SponsorService.clearAllSponsors();
                  Alert.alert(res.success ? '✅ Reset Berhasil' : '❌ Gagal', res.message);
                  await loadSponsors();
                };
                if (Platform.OS === 'web') {
                  if (window.confirm('Hapus SELURUH data sponsor? Tindakan ini tidak dapat dibatalkan.')) doReset();
                } else {
                  Alert.alert(
                    '⚠️ Hapus Semua Sponsor',
                    'Seluruh data sponsor akan dihapus permanen. Lanjutkan?',
                    [
                      { text: 'Batal', style: 'cancel' },
                      { text: 'Hapus Semua', style: 'destructive', onPress: doReset },
                    ]
                  );
                }
              }}
              style={{
                backgroundColor: 'rgba(239,68,68,0.12)',
                borderWidth: 1,
                borderColor: '#EF4444',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#F87171" />
              <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '700' }}>Reset</Text>
            </Pressable>
          </View>

          {/* Panduan Alur Verifikasi Perpanjangan Sponsor */}
          <View style={{ backgroundColor: '#141518', borderWidth: 1, borderColor: '#27272A', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Ionicons name="information-circle-outline" size={16} color="#A1A1AA" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#F4F4F5' }}>
                Alur Verifikasi Perpanjangan Sewa Lapak & Kemitraan Sponsor:
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#A1A1AA', lineHeight: 18 }}>
              1. Sponsor mengajukan perpanjangan dari halaman <Text style={{ color: '#FAFAFA', fontWeight: '700' }}>Profil</Text> mereka.{'\n'}
              2. Sponsor wajib melampirkan foto / link bukti transfer ke Bank Mandiri 137-00-1234567-8 a.n. MERCEDES-BENZ CLUB INDONESIA.{'\n'}
              3. Setelah diajukan, tombol <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>[📋 Review Bukti & Setujui]</Text> akan otomatis muncul di kartu sponsor di bawah ini untuk Admin memverifikasi.
            </Text>
          </View>

          <SectionHeader title="Daftar Mitra Sponsor Terdaftar" />

          {sponsors.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="file-tray-outline" size={32} color="#71717A" />
              <Text style={styles.emptyText}>Belum ada data sponsor tersimpan.</Text>
            </View>
          ) : (
            sponsors.map((s) => (
              <View key={s.id} style={styles.adminSponsorCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.adminSponsorLogo}>
                    {s.logo_url ? (
                      <Image source={{ uri: s.logo_url }} style={styles.logoImg} />
                    ) : (
                      <Ionicons name="ribbon-outline" size={22} color="#E4E4E7" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminSponsorName}>{s.name}</Text>
                    <Text style={styles.adminSponsorKTA}>{s.sponsor_id} • {s.category}</Text>
                    {s.pic_name && (
                      <Text style={styles.adminSponsorPic}>
                        PIC: {s.pic_name} {s.pic_phone ? `(${s.pic_phone})` : ''}
                      </Text>
                    )}
                  </View>
                  <Pressable onPress={() => handleDeleteSponsor(s)} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={17} color="#F87171" />
                  </Pressable>
                </View>

                <View style={[styles.hairline, { marginVertical: 10 }]} />

                {/* Status Benefit & Pengecekan Jatuh Tempo Realtime */}
                {(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isExpired = s.contract_end < todayStr;
                  const remainingDays = Math.max(
                    0,
                    Math.ceil((new Date(s.contract_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  );

                  return (
                    <View style={styles.benefitStatusRow}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={styles.benefitStatusItem}>
                          <Ionicons name="calendar-outline" size={13} color="#A1A1AA" />
                          <Text style={styles.benefitStatusText}>
                            Masa: {s.duration_months} Bulan ({s.contract_start} s/d {s.contract_end})
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 4,
                            borderWidth: 0.5,
                            borderColor: isExpired ? '#EF4444' : '#34D399',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: isExpired ? '#EF4444' : '#34D399',
                            }}
                          >
                            {isExpired ? '🔴 JATUH TEMPO (EXPIRED)' : `🟢 AKTIF (${remainingDays} Hari Lagi)`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.benefitStatusItem}>
                        <Ionicons name="storefront-outline" size={13} color={isExpired ? '#71717A' : '#A1A1AA'} />
                        <Text style={[styles.benefitStatusText, { color: isExpired ? '#71717A' : '#E4E4E7' }]}>
                          Lapak: {s.lapak_id || 'LPK-SPN-2026-001'} ({isExpired ? 'Masa Sewa Berakhir' : 'Gratis 3 Bulan Aktif'})
                        </Text>
                      </View>

                      <View style={styles.benefitStatusItem}>
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color={isExpired ? '#71717A' : '#34D399'} />
                        <Text style={[styles.benefitStatusText, { color: isExpired ? '#71717A' : '#34D399' }]}>
                          Forum: {isExpired ? 'Terkunci (Jatuh Tempo)' : 'Akses Penuh Aktif'}
                        </Text>
                      </View>

                      {/* Bagian Perpanjangan Kemitraan (Wajib Bayar & Verifikasi Bukti) */}
                      {s.pending_renewal ? (
                        <View
                          style={{
                            backgroundColor: '#18191D',
                            borderWidth: 1,
                            borderColor: '#2D3139',
                            borderRadius: 8,
                            padding: 10,
                            marginTop: 10,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="time-outline" size={16} color="#A1A1AA" />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#F4F4F5', flex: 1 }}>
                              Pengajuan Perpanjangan ({s.pending_renewal.months} Bulan) Menunggu Verifikasi Admin
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#D4D4D8', marginTop: 4 }}>
                            Tagihan Sewa: Rp {s.pending_renewal.fee.toLocaleString('id-ID')} (Tarif Penuh • Tanpa Diskon)
                          </Text>
                          {s.pending_renewal.notes ? (
                            <Text style={{ fontSize: 11, color: '#A1A1AA', fontStyle: 'italic', marginTop: 2 }}>
                              Catatan: "{s.pending_renewal.notes}"
                            </Text>
                          ) : null}

                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                            <Pressable
                              onPress={() => handleOpenReviewProof(s)}
                              style={{
                                backgroundColor: '#E4E4E7',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Ionicons name="receipt-outline" size={14} color="#09090B" />
                              <Text style={{ color: '#09090B', fontSize: 11, fontWeight: '700' }}>
                                Review Bukti & Setujui
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={{
                          backgroundColor: 'rgba(59,130,246,0.06)',
                          borderWidth: 1,
                          borderColor: 'rgba(59,130,246,0.25)',
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 8,
                        }}>
                          <Ionicons name="information-circle-outline" size={14} color="#60A5FA" />
                          <Text style={{ color: '#60A5FA', fontSize: 11, flex: 1 }}>
                            Perpanjangan diajukan oleh Sponsor melalui halaman <Text style={{ fontWeight: '700' }}>Profil</Text> mereka.
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Modal Input Sponsor Baru (Admin) ───────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Input Mitra Sponsor Baru</Text>
                <Text style={styles.modalSubtitle}>Pendaftaran & Penerbitan KTA Sponsor MB INA</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#71717A" />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {/* Auto Generated Member Number Preview */}
              <View style={styles.ktaGeneratedBox}>
                <Ionicons name="id-card" size={20} color="#E4E4E7" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ktaGeneratedLabel}>Nomor KTA Sponsor Resmi (Otomatis):</Text>
                  <Text style={styles.ktaGeneratedValue}>{nextMemberNumber}</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Nama Perusahaan / Brand Sponsor *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Contoh: PT Pro Motor Mercedes-Benz"
                placeholderTextColor="#71717A"
                value={formName}
                onChangeText={setFormName}
              />

              <Text style={styles.fieldLabel}>Kategori Mitra *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setFormCategory(cat)}
                    style={[styles.filterChip, formCategory === cat && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, formCategory === cat && styles.filterChipTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Nama PIC Perusahaan</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Contoh: Rudy Hartono"
                    placeholderTextColor="#71717A"
                    value={formPicName}
                    onChangeText={setFormPicName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>No. WhatsApp PIC</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="081234567890"
                    placeholderTextColor="#71717A"
                    keyboardType="phone-pad"
                    value={formPicPhone}
                    onChangeText={setFormPicPhone}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Durasi Kerjasama Sponsorship</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[3, 6, 12].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setFormDuration(m)}
                    style={[styles.subChip, formDuration === m && styles.subChipActive, { flex: 1, alignItems: 'center' }]}
                  >
                    <Text style={[styles.subChipText, formDuration === m && styles.subChipTextActive]}>
                      {m} Bulan {m === 3 ? '(Standar)' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Benefit Hak Fasilitas */}
              <View style={styles.benefitPackageCard}>
                <Text style={styles.benefitPackageTitle}>🎁 Fasilitas Benefit Terintegrasi:</Text>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                  <Text style={styles.benefitItemText}>
                    <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>GRATIS Sewa Lapak Toko selama 3 Bulan</Text> (Kode Lapak: LPK-SPN-2026-XXX)
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                  <Text style={styles.benefitItemText}>
                    <Text style={{ fontWeight: '700', color: '#34D399' }}>Hak Aktif & Posting di Forum Diskusi selama 3 Bulan</Text> (Badge Sponsor Resmi)
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                  <Text style={styles.benefitItemText}>
                    Pencantuman Profil di Direktori Sponsorship Resmi MB INA
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Diskon / Penawaran Khusus Member</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Contoh: Diskon Servis & Sparepart 15% Member MBCI"
                placeholderTextColor="#71717A"
                value={formDiscount}
                onChangeText={setFormDiscount}
              />

              <Text style={styles.fieldLabel}>Deskripsi Singkat / Profil Sponsor</Text>
              <TextInput
                style={[styles.fieldInput, { height: 65, textAlignVertical: 'top' }]}
                placeholder="Deskripsi bengkel, authorized dealer, layanan unggulan..."
                placeholderTextColor="#71717A"
                multiline
                value={formDescription}
                onChangeText={setFormDescription}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Logo URL</Text>
                <Pressable onPress={handleFillDemoLogo}>
                  <Text style={{ color: '#C5A059', fontSize: 11, fontWeight: '600' }}>+ Isi Contoh Logo</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.fieldInput}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor="#71717A"
                value={formLogo}
                onChangeText={setFormLogo}
              />

              <Text style={styles.fieldLabel}>Website / Link Resmi</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="https://promotor.mercedes-benz.co.id"
                placeholderTextColor="#71717A"
                value={formWebsite}
                onChangeText={setFormWebsite}
              />

              {/* ── Akun Login Sponsor ───────────────────────────── */}
              <View style={{ height: 0.5, backgroundColor: '#27272A', marginVertical: 14 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="key-outline" size={16} color="#A1A1AA" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  Akun Login Sponsor (Mobile App)
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#71717A', marginBottom: 10 }}>
                Sponsor dapat login dari form login yang sama dengan member menggunakan kredensial ini.
              </Text>

              <Text style={styles.fieldLabel}>Email Login Sponsor</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder={
                  formName.trim()
                    ? `sponsor_${formName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15)}@mbandro.org`
                    : 'sponsor_perusahaan@mbandro.org'
                }
                placeholderTextColor="#52525B"
                autoCapitalize="none"
                keyboardType="email-address"
                value={formEmail}
                onChangeText={setFormEmail}
              />
              {!formEmail.trim() && formName.trim() && (
                <Text style={{ fontSize: 10, color: '#71717A', marginTop: -8, marginBottom: 10 }}>
                  Kosongkan untuk auto-generate:{' '}
                  <Text style={{ color: '#E4E4E7' }}>
                    sponsor_{formName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15)}@mbandro.org
                  </Text>
                </Text>
              )}

              <Text style={styles.fieldLabel}>Password Login Sponsor</Text>
              <TextInput
                style={[styles.fieldInput, { marginBottom: 4 }]}
                placeholder="spn@20252027"
                placeholderTextColor="#52525B"
                value={formPassword}
                onChangeText={setFormPassword}
              />
              <Text style={{ fontSize: 10, color: '#71717A', marginBottom: 14 }}>
                Default: <Text style={{ color: '#E4E4E7', fontFamily: 'monospace' }}>spn@20252027</Text>
              </Text>

              <View style={styles.modalActionRow}>
                <Pressable onPress={() => setModalVisible(false)} style={styles.modalBtnCancel}>
                  <Text style={styles.modalBtnCancelText}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitSponsor}
                  disabled={submitting}
                  style={styles.modalBtnSubmit}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#09090B" />
                  ) : (
                    <Text style={styles.modalBtnSubmitText}>Simpan & Terbitkan KTA</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal Pengajuan Perpanjangan Sponsor (Wajib Bayar & Bukti Transfer) ── */}
      <Modal visible={renewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Perpanjang Kerjasama Sponsor</Text>
                <Text style={styles.modalSubtitle}>Pembayaran Sewa Lapak & Hak Forum Resmi</Text>
              </View>
              <Pressable onPress={() => setRenewModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#71717A" />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {targetRenewSponsor && (
                <View style={[styles.ktaGeneratedBox, { marginBottom: 12 }]}>
                  <Ionicons name="business" size={20} color="#E4E4E7" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ktaGeneratedLabel}>Mitra Sponsor:</Text>
                    <Text style={[styles.ktaGeneratedValue, { fontSize: 13 }]}>
                      {targetRenewSponsor.name} ({targetRenewSponsor.sponsor_id})
                    </Text>
                    <Text style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>
                      Masa Berlaku Saat Ini: s/d {targetRenewSponsor.contract_end}
                    </Text>
                  </View>
                </View>
              )}

              {/* Pilihan Durasi */}
              <Text style={styles.fieldLabel}>Pilih Durasi Perpanjangan *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[3, 6, 12].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setRenewMonths(m)}
                    style={[styles.subChip, renewMonths === m && styles.subChipActive, { flex: 1, alignItems: 'center' }]}
                  >
                    <Text style={[styles.subChipText, renewMonths === m && styles.subChipTextActive]}>
                      +{m} Bulan
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Rincian Tarif Sewa (Sponsor Tanpa Diskon) */}
              <View style={[styles.benefitPackageCard, { backgroundColor: '#18191D', borderColor: '#27272A' }]}>
                <Text style={styles.benefitPackageTitle}>💰 Rincian Biaya Sewa Lapak & Forum:</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#D4D4D8' }}>Tarif Dasar Sewa:</Text>
                  <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }}>Rp 5.000 / bulan</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#D4D4D8' }}>Durasi:</Text>
                  <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }}>{renewMonths} Bulan</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: '#F87171' }}>Diskon Sponsor:</Text>
                  <Text style={{ fontSize: 12, color: '#F87171', fontWeight: '700' }}>0% (Tanpa Diskon)</Text>
                </View>
                <View style={[styles.hairline, { marginVertical: 6 }]} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '700' }}>Total Yang Harus Dibayar:</Text>
                  <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '800' }}>
                    Rp {(renewMonths * 5000).toLocaleString('id-ID')}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 6, fontStyle: 'italic' }}>
                  * Aturan Federasi: Fasilitas gratis 3 bulan hanya berlaku saat pendaftaran awal. Perpanjangan selanjutnya wajib membayar sewa penuh tanpa diskon.
                </Text>
              </View>

              {/* Info Rekening Pembayaran */}
              <View style={[styles.benefitPackageCard, { backgroundColor: '#18191D', borderColor: '#27272A', marginTop: 10 }]}>
                <Text style={[styles.benefitPackageTitle, { color: '#FFFFFF' }]}>🏦 Rekening Resmi Pembayaran MB INA:</Text>
                <Text style={{ fontSize: 12, color: '#E4E4E7', fontWeight: '700' }}>Bank Mandiri</Text>
                <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '800', fontFamily: 'monospace' }}>
                  137-00-1234567-8
                </Text>
                <Text style={{ fontSize: 11, color: '#A1A1AA' }}>a.n. MERCEDES-BENZ CLUB INDONESIA</Text>
              </View>

              {/* ── Upload Bukti Transfer (WAJIB) ─────────────────────── */}
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
                    Bukti Transfer Pembayaran <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                </View>

                {/* Tombol Upload / Pilih File */}
                <Pressable
                  onPress={handlePickProofImage}
                  style={{
                    backgroundColor: renewProof.trim()
                      ? 'rgba(52, 211, 153, 0.08)'
                      : 'rgba(255, 255, 255, 0.03)',
                    borderWidth: 1.5,
                    borderColor: renewProof.trim() ? '#34D399' : '#3F3F46',
                    borderRadius: 8,
                    borderStyle: 'dashed',
                    paddingVertical: 16,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <Ionicons
                    name={renewProof.trim() ? 'checkmark-circle' : 'cloud-upload-outline'}
                    size={26}
                    color={renewProof.trim() ? '#34D399' : '#A1A1AA'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: renewProof.trim() ? '#34D399' : '#FFFFFF',
                    }}>
                      {renewProof.trim() ? '✓ Bukti Transfer Terlampir' : 'Upload Bukti Transfer'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>
                      {renewProof.trim()
                        ? 'Tekan untuk mengganti bukti'
                        : 'Foto / screenshot struk transfer (JPG, PNG)'}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: renewProof.trim() ? '#34D399' : '#27272A',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: renewProof.trim() ? '#09090B' : '#E4E4E7' }}>
                      {renewProof.trim() ? 'Ganti' : 'Pilih'}
                    </Text>
                  </View>
                </Pressable>

                {/* Preview gambar bukti jika sudah ada */}
                {renewProof.trim() !== '' && (
                  <View style={{
                    backgroundColor: '#18181B',
                    borderWidth: 1,
                    borderColor: '#34D399',
                    borderRadius: 8,
                    padding: 8,
                    marginBottom: 8,
                    alignItems: 'center',
                  }}>
                    <Image
                      source={{ uri: renewProof.trim() }}
                      style={{ width: '100%', height: 160, borderRadius: 6 }}
                      resizeMode="contain"
                    />
                    <Pressable
                      onPress={() => setRenewProof('')}
                      style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Ionicons name="trash-outline" size={13} color="#F87171" />
                      <Text style={{ fontSize: 10, color: '#F87171' }}>Hapus & Ganti Bukti</Text>
                    </Pressable>
                  </View>
                )}

                {/* Separator + Input URL manual */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={{ flex: 1, height: 0.5, backgroundColor: '#3F3F46' }} />
                  <Text style={{ fontSize: 10, color: '#52525B' }}>atau tempel URL gambar</Text>
                  <View style={{ flex: 1, height: 0.5, backgroundColor: '#3F3F46' }} />
                </View>
                <TextInput
                  style={[styles.fieldInput, { marginBottom: 4 }]}
                  placeholder="https://drive.google.com/... atau link gambar bukti"
                  placeholderTextColor="#52525B"
                  value={renewProof}
                  onChangeText={setRenewProof}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={{ fontSize: 10, color: '#EF4444', marginBottom: 12 }}>
                  * Wajib melampirkan bukti transfer. Admin tidak dapat menyetujui tanpa bukti transfer.
                </Text>
              </View>

              {/* Catatan Tambahan */}
              <Text style={styles.fieldLabel}>Catatan Pembayaran (Opsional)</Text>
              <TextInput
                style={[styles.fieldInput, { marginBottom: 16 }]}
                placeholder="Contoh: Transfer via m-Banking Mandiri a.n. PT Pro Motor"
                placeholderTextColor="#71717A"
                value={renewNotes}
                onChangeText={setRenewNotes}
              />

              <View style={styles.modalActionRow}>
                <Pressable onPress={() => setRenewModalVisible(false)} style={styles.modalBtnCancel}>
                  <Text style={styles.modalBtnCancelText}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitRenewSponsor}
                  disabled={submittingRenew}
                  style={styles.modalBtnSubmit}
                >
                  {submittingRenew ? (
                    <ActivityIndicator size="small" color="#09090B" />
                  ) : (
                    <Text style={styles.modalBtnSubmitText}>Kirim Pengajuan</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal Review Bukti & Approval Admin ─────────────────── */}
      <Modal visible={reviewProofModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Verifikasi Pembayaran Sponsor</Text>
                <Text style={styles.modalSubtitle}>Pemeriksaan Bukti Transfer oleh Admin MB INA</Text>
              </View>
              <Pressable onPress={() => setReviewProofModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#71717A" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {targetReviewSponsor?.pending_renewal && (
                <View>
                  <View style={[styles.ktaGeneratedBox, { marginBottom: 12 }]}>
                    <Ionicons name="business" size={20} color="#E4E4E7" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ktaGeneratedLabel}>Pemohon Perpanjangan:</Text>
                      <Text style={[styles.ktaGeneratedValue, { fontSize: 14 }]}>
                        {targetReviewSponsor.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>
                        KTA: {targetReviewSponsor.sponsor_id} • {targetReviewSponsor.category}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.benefitPackageCard, { backgroundColor: '#18181B', marginBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#A1A1AA' }}>Durasi Diajukan:</Text>
                      <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '700' }}>
                        +{targetReviewSponsor.pending_renewal.months} Bulan
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#A1A1AA' }}>Tarif Sponsor:</Text>
                      <Text style={{ fontSize: 12, color: '#F87171', fontWeight: '700' }}>
                        Rp 5.000 / bln (Tanpa Diskon)
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '700' }}>Nominal Transfer:</Text>
                      <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '800' }}>
                        Rp {targetReviewSponsor.pending_renewal.fee.toLocaleString('id-ID')}
                      </Text>
                    </View>
                    {targetReviewSponsor.pending_renewal.notes ? (
                      <Text style={{ fontSize: 11, color: '#D4D4D8', fontStyle: 'italic', marginTop: 6 }}>
                        Catatan: "{targetReviewSponsor.pending_renewal.notes}"
                      </Text>
                    ) : null}
                  </View>

                  <Text style={styles.fieldLabel}>Lampiran Bukti Transfer:</Text>
                  <View
                    style={{
                      backgroundColor: '#18181B',
                      borderWidth: 1,
                      borderColor: '#27272A',
                      borderRadius: 8,
                      padding: 8,
                      alignItems: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Image
                      source={{ uri: targetReviewSponsor.pending_renewal.payment_proof_url }}
                      style={{ width: '100%', height: 220, borderRadius: 6 }}
                      resizeMode="contain"
                    />
                    <Text style={{ fontSize: 10, color: '#71717A', marginTop: 6 }} numberOfLines={1}>
                      URL: {targetReviewSponsor.pending_renewal.payment_proof_url}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Pressable
                      onPress={() => handleRejectRenew(targetReviewSponsor)}
                      style={[styles.modalBtnCancel, { flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444' }]}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                      <Text style={[styles.modalBtnCancelText, { color: '#EF4444', marginLeft: 4 }]}>
                        Tolak
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleApproveRenew(targetReviewSponsor)}
                      style={[styles.modalBtnSubmit, { flex: 1.5, backgroundColor: '#34D399', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }]}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#09090B" />
                      <Text style={styles.modalBtnSubmitText}>Setujui Perpanjangan</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },
  header: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  title: { fontSize: Typography.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  subtitle: { fontSize: 11, color: '#A1A1AA', marginTop: 2 },

  // Subtabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: '#18181B',
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#27272A',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  adminBadgePill: {
    backgroundColor: '#27272A',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#3F3F46',
  },
  adminBadgePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#D4D4D8',
  },

  hero: { alignItems: 'center', marginBottom: Spacing.base, gap: Spacing.xs },
  heroTitle: { fontSize: Typography.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, textAlign: 'center' },
  heroDesc: { fontSize: Typography.xs, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.base },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border.default,
    backgroundColor: Colors.background.card,
  },
  chipActive: { borderColor: Colors.brand.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  chipLabel: { fontSize: Typography.xs, color: Colors.text.tertiary },
  chipLabelActive: { color: Colors.brand.gold, fontWeight: Typography.weight.semibold },

  sponsorCard: { marginBottom: Spacing.sm },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  sponsorLogo: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
    borderWidth: 0.5, borderColor: Colors.border.default, overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  sponsorInfo: { flex: 1 },
  sponsorName: { fontSize: Typography.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  partnerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(52, 211, 153, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  partnerPillText: { fontSize: 10, color: '#34D399', fontWeight: '700' },
  sponsorCat: { fontSize: Typography.xs, color: '#A1A1AA', marginTop: 2 },
  sponsorDesc: { fontSize: Typography.xs, color: Colors.text.tertiary, lineHeight: 18, marginBottom: Spacing.xs },
  discountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: `${Colors.status.active}15`,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, alignSelf: 'flex-start', marginBottom: Spacing.xs,
  },
  discountText: { fontSize: Typography.xs, color: Colors.status.active, fontWeight: Typography.weight.semibold },
  facilityRow: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  facilityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1E1E24', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: '#2E2E38',
  },
  facilityBadgeText: { fontSize: 10, color: '#D4D4D8', fontWeight: '600' },
  websiteBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 6 },
  websiteBtnText: { fontSize: Typography.xs, color: Colors.status.info },

  empty: { alignItems: 'center', paddingTop: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontSize: Typography.sm, color: Colors.text.tertiary },
  emptyCard: {
    backgroundColor: '#18181B', borderRadius: Radius.lg, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#27272A',
  },

  // Admin Tab Styles
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiBox: {
    flex: 1, backgroundColor: '#18181B', borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#27272A',
  },
  kpiLabel: { fontSize: 10, color: '#71717A', fontWeight: '600' },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#F4F4F5', marginTop: 2 },

  btnAddSponsor: {
    backgroundColor: '#E4E4E7', borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 14,
  },
  btnAddSponsorText: { color: '#09090B', fontWeight: '800', fontSize: 13 },

  benefitNoticeBox: {
    backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A',
    borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 10,
  },
  benefitNoticeTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  benefitNoticeDesc: { color: '#D4D4D8', fontSize: 11, lineHeight: 17 },

  adminSponsorCard: {
    backgroundColor: '#18181B', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#27272A',
  },
  adminSponsorLogo: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#27272A',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 0.5, borderColor: '#3F3F46',
  },
  adminSponsorName: { color: '#F4F4F5', fontWeight: '700', fontSize: 14 },
  adminSponsorKTA: { color: '#C5A059', fontSize: 11, marginTop: 1, fontWeight: '600' },
  adminSponsorPic: { color: '#71717A', fontSize: 11, marginTop: 1 },
  hairline: { height: 1, backgroundColor: '#27272A' },
  benefitStatusRow: { gap: 4 },
  benefitStatusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitStatusText: { color: '#A1A1AA', fontSize: 11 },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 16,
  },
  modalCard: {
    backgroundColor: '#121216', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272A',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  modalTitle: { color: '#F4F4F5', fontSize: 16, fontWeight: '800' },
  modalSubtitle: { color: '#71717A', fontSize: 11, marginTop: 1 },

  ktaGeneratedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#18191D', borderWidth: 1, borderColor: '#2D3139',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  ktaGeneratedLabel: { color: '#D4D4D8', fontSize: 11 },
  ktaGeneratedValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 1 },

  fieldLabel: { color: '#E4E4E7', fontSize: 12, fontWeight: '600', marginBottom: 5, marginTop: 8 },
  fieldInput: {
    backgroundColor: '#18181B', borderRadius: 8, borderWidth: 1, borderColor: '#27272A',
    color: '#F4F4F5', paddingHorizontal: 12, paddingVertical: 9, fontSize: 13,
  },

  filterChip: {
    backgroundColor: '#18181B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    marginRight: 6, borderWidth: 1, borderColor: '#27272A',
  },
  filterChipActive: { borderColor: '#E4E4E7', backgroundColor: '#27272A' },
  filterChipText: { color: '#71717A', fontSize: 11 },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  subChip: {
    backgroundColor: '#18181B', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#27272A',
  },
  subChipActive: { borderColor: '#E4E4E7', backgroundColor: '#27272A' },
  subChipText: { color: '#71717A', fontSize: 11 },
  subChipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  benefitPackageCard: {
    backgroundColor: '#18181B', borderRadius: 10, padding: 12, marginVertical: 10,
    borderWidth: 1, borderColor: '#3F3F46', gap: 6,
  },
  benefitPackageTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 12, marginBottom: 2 },
  benefitItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  benefitItemText: { color: '#D4D4D8', fontSize: 11, flex: 1, lineHeight: 16 },

  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtnCancel: {
    flex: 1, backgroundColor: '#27272A', paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  modalBtnCancelText: { color: '#A1A1AA', fontWeight: '700', fontSize: 13 },
  modalBtnSubmit: {
    flex: 2, backgroundColor: '#E4E4E7', paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  modalBtnSubmitText: { color: '#09090B', fontWeight: '800', fontSize: 13 },
});
