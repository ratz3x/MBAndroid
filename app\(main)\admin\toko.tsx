// ============================================================
// Toko Resmi & Marketplace — Halaman Admin MBCI
// Mengadopsi Modul M7 E-Commerce dari MBCINA
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../../src/constants/theme';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import {
  MarketplaceService,
  type Lapak,
  type LapakProduct,
  type LapakReview,
  type LapakSewaLog,
  type LapakStatus,
  type ProductStatus,
} from '../../../src/services/marketplaceService';

type SubTab = 'lapak' | 'products' | 'verify' | 'reviews' | 'reports';

const CATEGORIES = [
  'Semua',
  'Parts & Komponen',
  'Merchandise Resmi',
  'Aksesoris & Variasi',
  'Jasa & Bengkel',
  'Mobil / Unit',
];

export default function AdminTokoScreen() {
  const router = useRouter();
  const [activeSubtab, setActiveSubtab] = useState<SubTab>('lapak');
  const [loading, setLoading] = useState(false);

  // Data states
  const [lapakList, setLapakList] = useState<Lapak[]>([]);
  const [products, setProducts] = useState<LapakProduct[]>([]);
  const [reviews, setReviews] = useState<LapakReview[]>([]);
  const [reports, setReports] = useState<{
    totalLapak: number;
    activeLapak: number;
    pendingLapak: number;
    expiredLapak: number;
    totalIncome: number;
    logs: LapakSewaLog[];
  }>({
    totalLapak: 0,
    activeLapak: 0,
    pendingLapak: 0,
    expiredLapak: 0,
    totalIncome: 0,
    logs: [],
  });

  // Filters
  const [lapakCategory, setLapakCategory] = useState('Semua');
  const [lapakStatus, setLapakStatus] = useState<string>('ALL');
  const [lapakSearch, setLapakSearch] = useState('');

  const [productCategory, setProductCategory] = useState('Semua');
  const [productCondition, setProductCondition] = useState('ALL');
  const [productSearch, setProductSearch] = useState('');

  const [verifyStatus, setVerifyStatus] = useState<string>('PENDING');

  // Modals
  const [reviewModal, setReviewModal] = useState<{
    visible: boolean;
    lapak: Lapak | null;
    rejectionReason: string;
  }>({
    visible: false,
    lapak: null,
    rejectionReason: '',
  });

  const [renewModal, setRenewModal] = useState<{
    visible: boolean;
    lapak: Lapak | null;
    months: number;
  }>({
    visible: false,
    lapak: null,
    months: 6,
  });

  const [productVerifyModal, setProductVerifyModal] = useState<{
    visible: boolean;
    product: LapakProduct | null;
    rejectionReason: string;
  }>({
    visible: false,
    product: null,
    rejectionReason: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lapaks, prods, revs, reps] = await Promise.all([
        MarketplaceService.getLapakList(
          lapakCategory === 'Semua' ? 'ALL' : lapakCategory,
          lapakStatus,
          lapakSearch
        ),
        MarketplaceService.getProducts({
          category: productCategory === 'Semua' ? 'ALL' : productCategory,
          condition: productCondition,
          search: productSearch,
        }),
        MarketplaceService.getReviews(),
        MarketplaceService.getSewaReports(),
      ]);
      setLapakList(lapaks);
      setProducts(prods);
      setReviews(revs);
      setReports(reps);
    } catch (e) {
      console.warn('Error loading admin toko data:', e);
    } finally {
      setLoading(false);
    }
  }, [lapakCategory, lapakStatus, lapakSearch, productCategory, productCondition, productSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Handlers Lapak ──────────────────────────────────────────
  const handleApproveLapak = async () => {
    if (!reviewModal.lapak) return;

    // Kasus 1: Pengajuan Perpanjangan Sewa (Member atau Sponsor)
    if (reviewModal.lapak.pending_renewal) {
      const proof = reviewModal.lapak.pending_renewal.payment_proof_url;
      if (!proof || !proof.trim()) {
        Alert.alert(
          'Tidak Dapat Menyetujui',
          'Penyewa lapak (member maupun sponsor) WAJIB melampirkan bukti transfer pembayaran sewa lapak sebelum Admin menyetujui perpanjangan!'
        );
        return;
      }
      const res = await MarketplaceService.approveRenewLapak(reviewModal.lapak.id);
      if (res.success) {
        showToast(res.message);
        setReviewModal({ visible: false, lapak: null, rejectionReason: '' });
        await loadData();
      } else {
        Alert.alert('Gagal Menyetujui Perpanjangan', res.message);
      }
      return;
    }

    // Kasus 2: Permohonan Lapak Baru
    const isSponsorFreeInitial =
      reviewModal.lapak.final_fee === 0 ||
      reviewModal.lapak.payment_proof_url === 'SPONSORSHIP_PACKAGE_BENEFIT' ||
      (reviewModal.lapak.member_id.includes('SPN') && reviewModal.lapak.sewa_fee === 0);

    if (!isSponsorFreeInitial && (!reviewModal.lapak.payment_proof_url || !reviewModal.lapak.payment_proof_url.trim())) {
      Alert.alert(
        'Tidak Dapat Menyetujui',
        'Penyewa lapak harus mengirim bukti transfer. Tanpa bukti transfer ke rekening resmi Bank Mandiri (137-00-1234567-8 a.n. MERCEDES-BENZ CLUB INDONESIA), Admin/Pengurus tidak dapat menyetujui permohonan sewa lapak.'
      );
      return;
    }

    const res = await MarketplaceService.verifyLapak(reviewModal.lapak.id, 'APPROVED');
    if (res.success) {
      showToast(res.message);
      setReviewModal({ visible: false, lapak: null, rejectionReason: '' });
      await loadData();
    } else {
      Alert.alert('Gagal Menyetujui', res.message);
    }
  };

  const handleRejectLapak = async () => {
    if (!reviewModal.lapak) return;
    if (!reviewModal.rejectionReason.trim()) {
      Alert.alert('Perhatian', 'Mohon tuliskan alasan penolakan sewa lapak.');
      return;
    }

    if (reviewModal.lapak.pending_renewal) {
      const res = await MarketplaceService.rejectRenewLapak(
        reviewModal.lapak.id,
        reviewModal.rejectionReason
      );
      if (res.success) {
        showToast(res.message);
        setReviewModal({ visible: false, lapak: null, rejectionReason: '' });
        await loadData();
      }
      return;
    }

    const res = await MarketplaceService.verifyLapak(
      reviewModal.lapak.id,
      'REJECTED',
      reviewModal.rejectionReason
    );
    if (res.success) {
      showToast(res.message);
      setReviewModal({ visible: false, lapak: null, rejectionReason: '' });
      await loadData();
    }
  };

  const handleRenewLapak = async () => {
    if (!renewModal.lapak) return;
    const res = await MarketplaceService.renewLapakSewa(
      renewModal.lapak.id,
      renewModal.months,
      'GOLD'
    );
    if (res.success) {
      showToast(res.message);
      setRenewModal({ visible: false, lapak: null, months: 6 });
      await loadData();
    }
  };

  const handleDeleteLapak = (lapak: Lapak) => {
    const doDelete = async () => {
      const res = await MarketplaceService.deleteLapak(lapak.id);
      showToast(res.message);
      await loadData();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Hapus lapak '${lapak.name}' beserta seluruh produk dagangan di dalamnya?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Hapus Lapak',
        `Apakah Anda yakin ingin menghapus '${lapak.name}' beserta seluruh produk di dalamnya?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Hapus', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  // ── Handlers Produk ─────────────────────────────────────────
  const handleApproveProduct = async (product: LapakProduct) => {
    const res = await MarketplaceService.verifyProduct(product.id, 'APPROVED');
    if (res.success) {
      showToast(res.message);
      await loadData();
    }
  };

  const handleRejectProduct = async () => {
    if (!productVerifyModal.product) return;
    if (!productVerifyModal.rejectionReason.trim()) {
      Alert.alert('Perhatian', 'Mohon tuliskan alasan penolakan iklan produk.');
      return;
    }
    const res = await MarketplaceService.verifyProduct(
      productVerifyModal.product.id,
      'REJECTED',
      productVerifyModal.rejectionReason
    );
    if (res.success) {
      showToast(res.message);
      setProductVerifyModal({ visible: false, product: null, rejectionReason: '' });
      await loadData();
    }
  };

  const handleDeleteProduct = (product: LapakProduct) => {
    const doDelete = async () => {
      const res = await MarketplaceService.deleteProduct(product.id);
      showToast(res.message);
      await loadData();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Hapus iklan '${product.name}' secara permanen?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Hapus Iklan', `Hapus iklan "${product.name}" secara permanen?`, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ── Render Status Badge ─────────────────────────────────────
  const renderLapakStatusBadge = (status: LapakStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <View style={[styles.statusBadge, styles.badgeActive]}>
            <View style={[styles.statusDot, { backgroundColor: '#34D399' }]} />
            <Text style={[styles.statusText, { color: '#34D399' }]}>AKTIF</Text>
          </View>
        );
      case 'PENDING':
        return (
          <View style={[styles.statusBadge, styles.badgePending]}>
            <View style={[styles.statusDot, { backgroundColor: '#FBBF24' }]} />
            <Text style={[styles.statusText, { color: '#FBBF24' }]}>PENDING</Text>
          </View>
        );
      case 'EXPIRED':
        return (
          <View style={[styles.statusBadge, styles.badgeExpired]}>
            <View style={[styles.statusDot, { backgroundColor: '#F87171' }]} />
            <Text style={[styles.statusText, { color: '#F87171' }]}>EXPIRED</Text>
          </View>
        );
      case 'REJECTED':
        return (
          <View style={[styles.statusBadge, styles.badgeExpired]}>
            <View style={[styles.statusDot, { backgroundColor: '#F87171' }]} />
            <Text style={[styles.statusText, { color: '#F87171' }]}>DITOLAK</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.topHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#F4F4F5" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Toko Resmi & Marketplace</Text>
            <Text style={styles.headerSubtitle}>
              Pusat pengelolaan sewa lapak, direktori produk & iklan, verifikasi moderasi, dan laporan merchant MB INA
            </Text>
          </View>
          <Pressable onPress={() => setActiveSubtab('reports')} style={styles.reportHeaderBtn}>
            <Ionicons name="bar-chart-outline" size={15} color="#D4D4D8" />
            <Text style={styles.reportHeaderBtnText}>Laporan Sewa</Text>
          </Pressable>
        </View>

        {/* Feedback Toast */}
        {toastMessage && (
          <View style={styles.toastCard}>
            <Ionicons name="checkmark-circle" size={18} color="#D4D4D8" />
            <Text style={styles.toastText}>{toastMessage}</Text>
            <Pressable onPress={() => setToastMessage(null)}>
              <Ionicons name="close" size={18} color="#71717A" />
            </Pressable>
          </View>
        )}

        {/* ── Sub Navigation Tabs Bar ────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabBar}>
          {[
            { key: 'lapak' as SubTab, label: 'Manajemen Lapak & Merchant', icon: 'storefront-outline' },
            { key: 'products' as SubTab, label: 'Katalog Produk & Iklan', icon: 'pricetags-outline' },
            {
              key: 'verify' as SubTab,
              label: `Verifikasi Iklan & Moderasi (${products.filter((p) => p.status === 'PENDING').length})`,
              icon: 'shield-checkmark-outline',
            },
            { key: 'reviews' as SubTab, label: 'Ulasan & Penilaian', icon: 'star-outline' },
            { key: 'reports' as SubTab, label: 'Laporan Sewa & Penjualan', icon: 'trending-up-outline' },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveSubtab(tab.key)}
              style={[styles.tabBtn, activeSubtab === tab.key && styles.tabBtnActive]}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={activeSubtab === tab.key ? '#09090B' : '#A1A1AA'}
              />
              <Text style={[styles.tabBtnText, activeSubtab === tab.key && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SUBTAB 1: MANAJEMEN LAPAK & MERCHANT                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeSubtab === 'lapak' && (
          <View>
            {/* Price & Discount Banner MBCINA */}
            <View style={styles.pricingBanner}>
              <View style={styles.pricingLeft}>
                <Text style={styles.pricingLabel}>Biaya Sewa Dasar:</Text>
                <Text style={styles.pricingValue}>Rp 5.000 / bulan</Text>
              </View>
              <View style={styles.pricingTiers}>
                <Text style={styles.pricingLabel}>Diskon Tier:</Text>
                <View style={[styles.tierPill, { borderColor: '#D97706' }]}>
                  <Text style={[styles.tierPillText, { color: '#D97706' }]}>Bronze 5%</Text>
                </View>
                <View style={[styles.tierPill, { borderColor: '#A1A1AA' }]}>
                  <Text style={[styles.tierPillText, { color: '#E4E4E7' }]}>Silver 10%</Text>
                </View>
                <View style={[styles.tierPill, { borderColor: '#FBBF24' }]}>
                  <Text style={[styles.tierPillText, { color: '#FBBF24' }]}>Gold 15%</Text>
                </View>
                <View style={[styles.tierPill, { borderColor: '#38BDF8' }]}>
                  <Text style={[styles.tierPillText, { color: '#38BDF8' }]}>Platinum 20%</Text>
                </View>
              </View>
            </View>

            {/* Filter Controls */}
            <View style={styles.filterSection}>
              <View style={styles.filterRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari nama, kode, pemilik..."
                  placeholderTextColor="#71717A"
                  value={lapakSearch}
                  onChangeText={setLapakSearch}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {['ALL', 'PENDING_RENEWAL', 'ACTIVE', 'PENDING', 'EXPIRED', 'REJECTED'].map((st) => (
                    <Pressable
                      key={st}
                      onPress={() => setLapakStatus(st)}
                      style={[styles.chip, lapakStatus === st && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, lapakStatus === st && styles.chipTextActive]}>
                        {st === 'ALL'
                          ? 'Status: Semua'
                          : st === 'PENDING_RENEWAL'
                          ? `🔄 Perpanjangan Pending (${lapakList.filter((l) => l.pending_renewal).length})`
                          : st}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Lapak List Cards */}
            {(() => {
              const filteredList = lapakList.filter((l) => {
                if (lapakStatus === 'PENDING_RENEWAL') return !!l.pending_renewal;
                if (lapakStatus !== 'ALL') return l.sewa_status === lapakStatus;
                return true;
              }).filter((l) => {
                if (!lapakSearch.trim()) return true;
                const q = lapakSearch.toLowerCase();
                return (
                  l.name.toLowerCase().includes(q) ||
                  l.id.toLowerCase().includes(q) ||
                  l.pemilik.toLowerCase().includes(q) ||
                  l.member_id.toLowerCase().includes(q)
                );
              });

              if (filteredList.length === 0) {
                return (
                  <View style={styles.emptyCard}>
                    <Ionicons name="storefront-outline" size={32} color="#71717A" />
                    <Text style={styles.emptyText}>Tidak ada data lapak yang sesuai filter.</Text>
                  </View>
                );
              }

              return filteredList.map((lapak, idx) => (
                <View key={lapak.id} style={styles.lapakCard}>
                  <View style={styles.lapakCardHeader}>
                    <View style={styles.lapakNumBox}>
                      <Text style={styles.lapakNumText}>{idx + 1}</Text>
                    </View>
                    <Image
                      source={{ uri: lapak.logo_url || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=300' }}
                      style={styles.lapakLogo}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.lapakName}>{lapak.name}</Text>
                        <Text style={styles.lapakCode}>{lapak.id}</Text>
                      </View>
                      <Text style={styles.lapakCategory}>{lapak.category}</Text>
                      <Text style={styles.lapakOwner}>
                        Pemilik: {lapak.pemilik} • <Text style={{ fontFamily: 'monospace' }}>{lapak.member_id}</Text>
                      </Text>
                    </View>
                    {renderLapakStatusBadge(lapak.sewa_status)}
                  </View>

                  <View style={styles.hairline} />

                  {/* Period & Fee Info */}
                  <View style={styles.lapakDetailsRow}>
                    <View>
                      <Text style={styles.detailLabel}>Periode Sewa</Text>
                      <Text style={styles.detailValue}>
                        {lapak.sewa_start_date} s/d {lapak.sewa_end_date}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.detailLabel}>Biaya Sewa</Text>
                      <Text style={styles.detailFee}>
                        Rp {lapak.final_fee?.toLocaleString('id-ID')}
                        <Text style={styles.detailFeeSub}> (Diskon {lapak.tier_discount}%)</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Status Pengajuan Perpanjangan Sewa Pending */}
                  {lapak.pending_renewal && (
                    <View
                      style={{
                        backgroundColor: 'rgba(251, 191, 36, 0.08)',
                        borderWidth: 1,
                        borderColor: '#FBBF24',
                        borderRadius: 8,
                        padding: 8,
                        marginHorizontal: 12,
                        marginBottom: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons name="time" size={14} color="#FBBF24" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FBBF24', flex: 1 }}>
                        Menunggu Persetujuan Perpanjangan (+{lapak.pending_renewal.months} Bulan • Rp {lapak.pending_renewal.final_fee.toLocaleString('id-ID')})
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.lapakActionRow}>
                    <Pressable
                      onPress={() => setReviewModal({ visible: true, lapak, rejectionReason: '' })}
                      style={[
                        styles.actionBtnPrimary,
                        lapak.pending_renewal && { backgroundColor: '#FBBF24' },
                      ]}
                    >
                      <Ionicons
                        name={lapak.pending_renewal ? 'receipt' : 'shield-checkmark'}
                        size={13}
                        color="#09090B"
                      />
                      <Text style={styles.actionBtnPrimaryText}>
                        {lapak.pending_renewal ? 'Review Perpanjangan' : 'Review Permohonan'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setRenewModal({ visible: true, lapak, months: 6 })}
                      style={styles.actionBtnOutline}
                    >
                      <Ionicons name="calendar-outline" size={13} color="#D4D4D8" />
                      <Text style={styles.actionBtnOutlineText}>Perpanjang Sewa</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteLapak(lapak)} style={styles.actionBtnDanger}>
                      <Ionicons name="trash-outline" size={13} color="#F87171" />
                    </Pressable>
                  </View>
                </View>
              ));
            })()}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SUBTAB 2: KATALOG PRODUK & IKLAN                         */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeSubtab === 'products' && (
          <View>
            <View style={styles.filterSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama produk, sparepart, atau lokasi..."
                placeholderTextColor="#71717A"
                value={productSearch}
                onChangeText={setProductSearch}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {['ALL', 'NEW', 'USED'].map((cnd) => (
                  <Pressable
                    key={cnd}
                    onPress={() => setProductCondition(cnd)}
                    style={[styles.chip, productCondition === cnd && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, productCondition === cnd && styles.chipTextActive]}>
                      {cnd === 'ALL' ? 'Kondisi: Semua' : cnd === 'NEW' ? 'Baru (New)' : 'Bekas (Used)'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {products.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="pricetags-outline" size={32} color="#71717A" />
                <Text style={styles.emptyText}>Belum ada produk sesuai filter.</Text>
              </View>
            ) : (
              products.map((prod) => (
                <View key={prod.id} style={styles.productCard}>
                  <Image source={{ uri: prod.images[0] }} style={styles.productThumb} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <View style={[styles.conditionPill, prod.condition === 'NEW' ? styles.pillNew : styles.pillUsed]}>
                        <Text style={styles.conditionText}>{prod.condition}</Text>
                      </View>
                    </View>
                    <Text style={styles.productPrice}>Rp {prod.price.toLocaleString('id-ID')}</Text>
                    <Text style={styles.productLapakText}>
                      Toko: {prod.lapak_name} • {prod.location}
                    </Text>
                    <Text style={styles.productSellerText}>
                      Penjual: {prod.seller_name} ({prod.member_id})
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDeleteProduct(prod)} style={styles.productDeleteBtn}>
                    <Ionicons name="trash-outline" size={16} color="#F87171" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SUBTAB 3: VERIFIKASI IKLAN & MODERASI                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeSubtab === 'verify' && (
          <View>
            <View style={{ marginBottom: 12 }}>
              <SectionHeader
                title="Antrean Verifikasi Iklan Produk"
                subtitle="Moderasi produk member sebelum diterbitkan ke katalog publik"
                accentColor="#A1A1AA"
              />
            </View>

            {products.filter((p) => p.status === 'PENDING').length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#34D399" />
                <Text style={[styles.emptyText, { color: '#34D399', marginTop: 8 }]}>
                  Semua iklan sudah diverifikasi!
                </Text>
                <Text style={{ color: '#71717A', fontSize: 12, marginTop: 4 }}>
                  Tidak ada permohonan iklan baru yang sedang menunggu moderasi.
                </Text>
              </View>
            ) : (
              products
                .filter((p) => p.status === 'PENDING')
                .map((prod) => (
                  <View key={prod.id} style={styles.verifyCard}>
                    <View style={{ flexDirection: 'row' }}>
                      <Image source={{ uri: prod.images[0] }} style={styles.verifyThumb} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.verifyTitle}>{prod.name}</Text>
                        <Text style={styles.verifyPrice}>Rp {prod.price.toLocaleString('id-ID')}</Text>
                        <Text style={styles.verifyMeta}>Lapak: {prod.lapak_name}</Text>
                        <Text style={styles.verifyMeta}>
                          Pengiklan: {prod.seller_name} ({prod.member_id})
                        </Text>
                        <Text style={styles.verifyMeta}>Lokasi: {prod.location} • Kategori: {prod.category}</Text>
                        <Text style={styles.verifyDesc} numberOfLines={2}>
                          {prod.description}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.verifyActions}>
                      <Pressable
                        onPress={() =>
                          setProductVerifyModal({
                            visible: true,
                            product: prod,
                            rejectionReason: '',
                          })
                        }
                        style={styles.verifyBtnReject}
                      >
                        <Text style={styles.verifyBtnRejectText}>Tolak / Minta Revisi</Text>
                      </Pressable>
                      <Pressable onPress={() => handleApproveProduct(prod)} style={styles.verifyBtnApprove}>
                        <Ionicons name="checkmark" size={15} color="#09090B" />
                        <Text style={styles.verifyBtnApproveText}>Setujui & Publikasikan</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SUBTAB 4: ULASAN & PENILAIAN                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeSubtab === 'reviews' && (
          <View>
            <View style={{ marginBottom: 12 }}>
              <SectionHeader
                title="Ulasan & Testimoni Transaksi"
                subtitle="Penilaian terverifikasi antar-sesama anggota Mercedes-Benz Club Indonesia"
                accentColor="#A1A1AA"
              />
            </View>

            {reviews.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={32} color="#71717A" />
                <Text style={styles.emptyText}>Belum ada ulasan yang diterima.</Text>
              </View>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewLapakName}>{rev.lapak_name}</Text>
                      <Text style={styles.reviewAuthor}>
                        Oleh: {rev.user_name} ({rev.member_id})
                      </Text>
                    </View>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= rev.rating ? 'star' : 'star-outline'}
                          size={13}
                          color="#FBBF24"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewContent}>"{rev.content}"</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(rev.created_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SUBTAB 5: LAPORAN SEWA & PENJUALAN                        */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeSubtab === 'reports' && (
          <View>
            {/* KPI Summary Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Total Lapak</Text>
                <Text style={styles.kpiValue}>{reports.totalLapak}</Text>
              </View>
              <View style={[styles.kpiCard, { borderColor: 'rgba(52, 211, 153, 0.3)' }]}>
                <Text style={[styles.kpiLabel, { color: '#34D399' }]}>Lapak Aktif</Text>
                <Text style={[styles.kpiValue, { color: '#34D399' }]}>{reports.activeLapak}</Text>
              </View>
              <View style={[styles.kpiCard, { borderColor: 'rgba(248, 113, 113, 0.3)' }]}>
                <Text style={[styles.kpiLabel, { color: '#F87171' }]}>Lapak Expired</Text>
                <Text style={[styles.kpiValue, { color: '#F87171' }]}>{reports.expiredLapak}</Text>
              </View>
              <View style={[styles.kpiCard, { borderColor: 'rgba(251, 191, 36, 0.4)' }]}>
                <Text style={[styles.kpiLabel, { color: '#FBBF24' }]}>Total Pendapatan</Text>
                <Text style={[styles.kpiValue, { color: '#FBBF24' }]}>
                  Rp {reports.totalIncome.toLocaleString('id-ID')}
                </Text>
              </View>
            </View>

            {/* Riwayat Log Sewa Table */}
            <View style={{ marginTop: 20 }}>
              <SectionHeader
                title="Riwayat Log Transaksi Sewa"
                subtitle="Catatan pembayaran & perpanjangan masa aktif sewa lapak"
                accentColor="#A1A1AA"
              />
            </View>

            {reports.logs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={32} color="#71717A" />
                <Text style={styles.emptyText}>Belum ada riwayat transaksi sewa.</Text>
              </View>
            ) : (
              reports.logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.logLapakName}>{log.lapak_name}</Text>
                      <View style={[styles.logActionPill, log.action === 'SEWA' ? styles.pillNew : styles.pillUsed]}>
                        <Text style={styles.logActionText}>{log.action}</Text>
                      </View>
                    </View>
                    <Text style={styles.logNotes}>{log.notes}</Text>
                    <Text style={styles.logDates}>
                      Periode: {log.period_start} s/d {log.period_end}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.logFee}>Rp {log.fee.toLocaleString('id-ID')}</Text>
                    <View style={[styles.statusBadge, log.payment_status === 'PAID' ? styles.badgeActive : styles.badgePending]}>
                      <Text style={[styles.statusText, { color: log.payment_status === 'PAID' ? '#34D399' : '#FBBF24' }]}>
                        {log.payment_status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal Review Lapak (Approve / Reject) ───────────────── */}
      <Modal visible={reviewModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Permohonan Lapak</Text>
              <Pressable onPress={() => setReviewModal({ visible: false, lapak: null, rejectionReason: '' })}>
                <Ionicons name="close" size={20} color="#71717A" />
              </Pressable>
            </View>

            {reviewModal.lapak && (
              <ScrollView style={{ maxHeight: 400 }}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Nama Lapak:</Text>
                  <Text style={styles.modalInfoValue}>{reviewModal.lapak.name}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Pemilik & KTA:</Text>
                  <Text style={styles.modalInfoValue}>
                    {reviewModal.lapak.pemilik} ({reviewModal.lapak.member_id})
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Kategori:</Text>
                  <Text style={styles.modalInfoValue}>{reviewModal.lapak.category}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>WhatsApp:</Text>
                  <Text style={styles.modalInfoValue}>{reviewModal.lapak.contact_whatsapp}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Tagihan Sewa:</Text>
                  <Text style={[styles.modalInfoValue, { color: '#FBBF24', fontWeight: '700' }]}>
                    Rp {reviewModal.lapak.final_fee.toLocaleString('id-ID')}
                  </Text>
                </View>

                {/* Status Bukti Transfer Pembayaran / Benefit Sponsor */}
                {(() => {
                  const isRenewal = Boolean(reviewModal.lapak.pending_renewal);
                  const isSponsor = reviewModal.lapak.member_id.includes('SPN');

                  // Kasus A: Pengajuan Perpanjangan Sewa (Member maupun Sponsor WAJIB Bayar & Bukti Transfer)
                  if (isRenewal && reviewModal.lapak.pending_renewal) {
                    const ren = reviewModal.lapak.pending_renewal;
                    return (
                      <View style={styles.modalProofSection}>
                        <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)', borderWidth: 1, borderColor: '#FBBF24', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#FBBF24', marginBottom: 4 }}>
                            🔄 Permohonan Perpanjangan Sewa (+{ren.months} Bulan)
                          </Text>
                          <Text style={{ fontSize: 12, color: '#FFFFFF', marginBottom: 2 }}>
                            Total Biaya: <Text style={{ fontWeight: '700' }}>Rp {ren.final_fee.toLocaleString('id-ID')}</Text>
                            {isSponsor ? ' (Sponsor: 0% Diskon • Bayar Penuh)' : ` (Diskon Tier ${ren.tier_discount}%)`}
                          </Text>
                          {ren.notes ? (
                            <Text style={{ fontSize: 11, color: '#D4D4D8', fontStyle: 'italic', marginTop: 2 }}>
                              Catatan Pemohon: "{ren.notes}"
                            </Text>
                          ) : null}
                        </View>

                        <Text style={styles.inputLabel}>Bukti Transfer Pembayaran Perpanjangan:</Text>
                        {ren.payment_proof_url ? (
                          <View style={styles.modalProofCard}>
                            <View style={styles.modalProofHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                                <Text style={styles.modalProofOkText}>Bukti Transfer Terlampir</Text>
                              </View>
                              <Text style={styles.modalProofAccNo}>Rek. Mandiri 137-00-1234567-8</Text>
                            </View>
                            <Image
                              source={{ uri: ren.payment_proof_url }}
                              style={styles.modalProofImg}
                              resizeMode="cover"
                            />
                          </View>
                        ) : (
                          <View style={styles.modalProofAlertBox}>
                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.modalProofAlertTitle}>BUKTI TRANSFER BELUM TERSEDIA</Text>
                              <Text style={styles.modalProofAlertDesc}>
                                Admin/Pengurus tidak dapat menyetujui perpanjangan tanpa bukti transfer pembayaran yang sah.
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  }

                  // Kasus B: Permohonan Lapak Baru - Benefit Gratis 3 Bulan Khusus Mitra Sponsor Baru
                  const isSponsorBenefit =
                    reviewModal.lapak.final_fee === 0 ||
                    reviewModal.lapak.payment_proof_url === 'SPONSORSHIP_PACKAGE_BENEFIT' ||
                    (isSponsor && reviewModal.lapak.sewa_fee === 0);

                  if (isSponsorBenefit) {
                    return (
                      <View style={styles.modalProofSection}>
                        <Text style={styles.inputLabel}>Fasilitas Benefit Sponsor Resmi:</Text>
                        <View style={[styles.modalProofCard, { borderColor: '#FBBF24', backgroundColor: 'rgba(251, 191, 36, 0.08)', padding: 12 }]}>
                          <View style={styles.modalProofHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="gift" size={16} color="#FBBF24" />
                              <Text style={[styles.modalProofOkText, { color: '#FBBF24', fontWeight: '700' }]}>
                                🎁 MITRA SPONSOR RESMI (GRATIS 3 BULAN)
                              </Text>
                            </View>
                            <Text style={[styles.modalProofAccNo, { color: '#FBBF24' }]}>Fasilitas PKS</Text>
                          </View>
                          <Text style={{ color: '#D4D4D8', fontSize: 12, marginTop: 6, lineHeight: 17 }}>
                            Lapak ini milik mitra sponsor resmi Mercedes-Benz Club Indonesia dengan Nomor KTA {reviewModal.lapak.member_id}. Sesuai kebijakan federasi, lapak diberikan gratis selama 3 bulan pertama dan tidak memerlukan bukti transfer bank.
                          </Text>
                        </View>
                      </View>
                    );
                  }

                  // Kasus C: Permohonan Lapak Baru - Member Biasa (Wajib Bukti Transfer)
                  return (
                    <View style={styles.modalProofSection}>
                      <Text style={styles.inputLabel}>Bukti Transfer ke Rekening Resmi:</Text>
                      {reviewModal.lapak.payment_proof_url ? (
                        <View style={styles.modalProofCard}>
                          <View style={styles.modalProofHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                              <Text style={styles.modalProofOkText}>Bukti Transfer Mandiri Terlampir</Text>
                            </View>
                            <Text style={styles.modalProofAccNo}>Rek. 137-00-1234567-8</Text>
                          </View>
                          <Image
                            source={{ uri: reviewModal.lapak.payment_proof_url }}
                            style={styles.modalProofImg}
                            resizeMode="cover"
                          />
                        </View>
                      ) : (
                        <View style={styles.modalProofAlertBox}>
                          <Ionicons name="alert-circle" size={20} color="#EF4444" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.modalProofAlertTitle}>BUKTI TRANSFER BELUM TERSEDIA</Text>
                            <Text style={styles.modalProofAlertDesc}>
                              Admin/Pengurus tidak dapat menyetujui permohonan lapak ini tanpa bukti transfer pembayaran yang sah.
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Reward Poin Loyalitas Pemilik Lapak */}
                {(() => {
                  const isSponsor = reviewModal.lapak.member_id.includes('SPN');
                  if (isSponsor) return null;
                  const fee = reviewModal.lapak.pending_renewal
                    ? reviewModal.lapak.pending_renewal.final_fee
                    : (reviewModal.lapak.final_fee || reviewModal.lapak.sewa_fee || 0);
                  const rewardPts = Math.round(fee / 1000);
                  return (
                    <View style={styles.modalRewardPillBox}>
                      <Ionicons name="sparkles" size={15} color="#FBBF24" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalRewardTitle}>Poin Loyalitas Pemilik Lapak</Text>
                        <Text style={styles.modalRewardDesc}>
                          Pemilik lapak otomatis menerima <Text style={{ color: '#FBBF24', fontWeight: '800' }}>{rewardPts} Poin</Text> (Rp {fee.toLocaleString('id-ID')} = {rewardPts} Poin) saat disetujui.
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                <View style={{ marginTop: 14 }}>
                  <Text style={styles.inputLabel}>Catatan / Alasan Penolakan (Jika Ditolak):</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Tuliskan catatan alasan revisi atau penolakan..."
                    placeholderTextColor="#71717A"
                    multiline
                    numberOfLines={3}
                    value={reviewModal.rejectionReason}
                    onChangeText={(t) => setReviewModal((prev) => ({ ...prev, rejectionReason: t }))}
                  />
                </View>

                {(() => {
                  const isRenewal = Boolean(reviewModal.lapak.pending_renewal);
                  const isSponsor = reviewModal.lapak.member_id.includes('SPN');
                  const isSponsorBenefit =
                    !isRenewal &&
                    (reviewModal.lapak.final_fee === 0 ||
                     reviewModal.lapak.payment_proof_url === 'SPONSORSHIP_PACKAGE_BENEFIT' ||
                     (isSponsor && reviewModal.lapak.sewa_fee === 0));

                  const proofUrl = isRenewal
                    ? reviewModal.lapak.pending_renewal?.payment_proof_url
                    : reviewModal.lapak.payment_proof_url;

                  const canApprove = Boolean(proofUrl) || isSponsorBenefit;

                  return (
                    <View style={styles.modalActionRow}>
                      <Pressable onPress={handleRejectLapak} style={styles.modalBtnReject}>
                        <Text style={styles.modalBtnRejectText}>
                          {isRenewal ? 'Tolak Perpanjangan' : 'Tolak Permohonan'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleApproveLapak}
                        style={[
                          styles.modalBtnApprove,
                          !canApprove && styles.modalBtnApproveDisabled,
                        ]}
                      >
                        <Text style={styles.modalBtnApproveText}>
                          {isRenewal
                            ? `Setujui Perpanjangan (+${reviewModal.lapak.pending_renewal?.months} Bulan)`
                            : `Setujui & Aktifkan (+${Math.round((reviewModal.lapak.final_fee || 0) / 1000)} Poin)`}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal Perpanjang Sewa Lapak ─────────────────────────── */}
      <Modal visible={renewModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Perpanjang Masa Sewa Lapak</Text>
              <Pressable onPress={() => setRenewModal({ visible: false, lapak: null, months: 6 })}>
                <Ionicons name="close" size={20} color="#71717A" />
              </Pressable>
            </View>

            {renewModal.lapak && (
              <View>
                <Text style={{ color: '#E4E4E7', fontSize: 13, marginBottom: 12 }}>
                  Perpanjang izin sewa untuk: <Text style={{ fontWeight: '700' }}>{renewModal.lapak.name}</Text>
                </Text>

                <Text style={styles.inputLabel}>Pilih Tambahan Durasi Sewa:</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                  {[1, 3, 6, 12].map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setRenewModal((prev) => ({ ...prev, months: m }))}
                      style={[
                        styles.chip,
                        renewModal.months === m && styles.chipActive,
                        { flex: 1, alignItems: 'center' },
                      ]}
                    >
                      <Text style={[styles.chipText, renewModal.months === m && styles.chipTextActive]}>
                        {m} Bln
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {(() => {
                  const isSponsor = renewModal.lapak.member_id.includes('SPN');
                  const feeCalc = MarketplaceService.calculateRenewalFee(renewModal.months, 'GOLD', isSponsor);
                  return (
                    <View style={styles.pricingSummaryBox}>
                      <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Tarif Dasar Sewa (Rp 5.000/bln):</Text>
                      <Text style={{ color: '#FBBF24', fontWeight: '700', fontSize: 15 }}>
                        Rp {feeCalc.finalFee.toLocaleString('id-ID')}
                        <Text style={{ fontSize: 11, color: isSponsor ? '#F87171' : '#34D399' }}>
                          {isSponsor ? ' (Sponsor: 0% Diskon • Bayar Penuh)' : ` (Diskon Tier Gold ${feeCalc.discountPercent}%)`}
                        </Text>
                      </Text>
                    </View>
                  );
                })()}

                <View style={styles.modalActionRow}>
                  <Pressable
                    onPress={() => setRenewModal({ visible: false, lapak: null, months: 6 })}
                    style={styles.modalBtnReject}
                  >
                    <Text style={styles.modalBtnRejectText}>Batal</Text>
                  </Pressable>
                  <Pressable onPress={handleRenewLapak} style={styles.modalBtnApprove}>
                    <Text style={styles.modalBtnApproveText}>Simpan Perpanjangan</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal Moderasi Produk ──────────────────────────────── */}
      <Modal visible={productVerifyModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tolak / Minta Revisi Iklan</Text>
              <Pressable onPress={() => setProductVerifyModal({ visible: false, product: null, rejectionReason: '' })}>
                <Ionicons name="close" size={20} color="#71717A" />
              </Pressable>
            </View>

            {productVerifyModal.product && (
              <View>
                <Text style={{ color: '#E4E4E7', fontSize: 13, marginBottom: 12 }}>
                  Produk: <Text style={{ fontWeight: '700' }}>{productVerifyModal.product.name}</Text>
                </Text>
                <Text style={styles.inputLabel}>Alasan Penolakan / Catatan Revisi:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Misal: Foto kurang jelas, harga tidak wajar, deskripsi belum lengkap..."
                  placeholderTextColor="#71717A"
                  multiline
                  numberOfLines={3}
                  value={productVerifyModal.rejectionReason}
                  onChangeText={(t) => setProductVerifyModal((prev) => ({ ...prev, rejectionReason: t }))}
                />
                <View style={styles.modalActionRow}>
                  <Pressable
                    onPress={() => setProductVerifyModal({ visible: false, product: null, rejectionReason: '' })}
                    style={styles.modalBtnReject}
                  >
                    <Text style={styles.modalBtnRejectText}>Batal</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleRejectProduct}
                    style={[styles.modalBtnReject, { backgroundColor: '#EF4444' }]}
                  >
                    <Text style={[styles.modalBtnRejectText, { color: '#FFF' }]}>Konfirmasi Tolak</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  content: {
    padding: Spacing.base,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F4F4F5',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
    lineHeight: 16,
  },
  reportHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  reportHeaderBtnText: {
    color: '#D4D4D8',
    fontSize: 11,
    fontWeight: '600',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(39, 39, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 14,
  },
  toastText: {
    flex: 1,
    color: '#F4F4F5',
    fontSize: 12,
  },
  tabScroll: {
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtnActive: {
    backgroundColor: '#E4E4E7',
    borderColor: '#E4E4E7',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  tabBtnTextActive: {
    color: '#09090B',
    fontWeight: '700',
  },
  pricingBanner: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  pricingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FBBF24',
    fontFamily: 'monospace',
  },
  pricingTiers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  filterSection: {
    marginBottom: 14,
  },
  filterRow: {
    gap: 6,
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F4F4F5',
    fontSize: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: 'rgba(244, 244, 245, 0.15)',
    borderColor: '#E4E4E7',
  },
  chipText: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  chipTextActive: {
    color: '#F4F4F5',
    fontWeight: '700',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  emptyText: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 6,
  },
  lapakCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  lapakCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lapakNumBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lapakNumText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
  },
  lapakLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lapakName: {
    color: '#F4F4F5',
    fontSize: 14,
    fontWeight: '700',
  },
  lapakCode: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#D4D4D8',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lapakCategory: {
    color: '#A1A1AA',
    fontSize: 11,
    marginTop: 2,
  },
  lapakOwner: {
    color: '#71717A',
    fontSize: 10,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  badgePending: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  badgeExpired: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hairline: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 10,
  },
  lapakDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 10,
    color: '#71717A',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 11,
    color: '#D4D4D8',
    marginTop: 1,
  },
  detailFee: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
    fontFamily: 'monospace',
  },
  detailFeeSub: {
    fontSize: 10,
    color: '#A1A1AA',
    fontWeight: '400',
  },
  lapakActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#E4E4E7',
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
  },
  actionBtnOutline: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  actionBtnDanger: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  productThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  conditionPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pillNew: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  pillUsed: {
    backgroundColor: 'rgba(161, 161, 170, 0.2)',
  },
  conditionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E4E4E7',
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
    marginTop: 2,
  },
  productLapakText: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 1,
  },
  productSellerText: {
    fontSize: 9,
    color: '#71717A',
  },
  productDeleteBtn: {
    padding: 8,
  },
  verifyCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    marginBottom: 12,
  },
  verifyThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  verifyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  verifyPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
    marginTop: 2,
  },
  verifyMeta: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 1,
  },
  verifyDesc: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 4,
  },
  verifyActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  verifyBtnReject: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnRejectText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '600',
  },
  verifyBtnApprove: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  verifyBtnApproveText: {
    color: '#09090B',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewLapakName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  reviewAuthor: {
    fontSize: 10,
    color: '#71717A',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewContent: {
    fontSize: 12,
    color: '#D4D4D8',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  reviewDate: {
    fontSize: 9,
    color: '#71717A',
    marginTop: 6,
    textAlign: 'right',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F4F4F5',
    marginTop: 4,
  },
  logCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  logLapakName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  logActionPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  logActionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E4E4E7',
  },
  logNotes: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  logDates: {
    fontSize: 10,
    color: '#71717A',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  logFee: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
    fontFamily: 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  modalInfoValue: {
    fontSize: 12,
    color: '#F4F4F5',
  },
  inputLabel: {
    fontSize: 11,
    color: '#A1A1AA',
    marginBottom: 4,
  },
  modalInput: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F4F4F5',
    fontSize: 12,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  modalBtnReject: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  modalBtnRejectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F87171',
  },
  modalBtnApprove: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
  },
  modalBtnApproveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090B',
  },
  pricingSummaryBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 10,
  },
  modalProofSection: {
    marginTop: 10,
    marginBottom: 4,
  },
  modalProofCard: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  modalProofHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  modalProofOkText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#34D399',
  },
  modalProofAccNo: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    color: '#A1A1AA',
  },
  modalProofImg: {
    width: '100%',
    height: 120,
    backgroundColor: '#09090B',
  },
  modalProofAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  modalProofAlertTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F87171',
    letterSpacing: 0.5,
  },
  modalProofAlertDesc: {
    fontSize: 10,
    color: '#D4D4D8',
    marginTop: 2,
    lineHeight: 14,
  },
  modalRewardPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    marginTop: 10,
  },
  modalRewardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },
  modalRewardDesc: {
    fontSize: 10,
    color: '#E4E4E7',
    marginTop: 1,
    lineHeight: 14,
  },
  modalBtnApproveDisabled: {
    opacity: 0.4,
    backgroundColor: '#52525B',
  },
});
