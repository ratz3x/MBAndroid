// ============================================================
// Toko Resmi & Marketplace — Halaman Member MBCI
// Mengadopsi Proses Bisnis Modul M7 E-Commerce MBCINA
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
  Dimensions,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../../src/constants/theme';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { useAuth } from '../../../src/context/AuthContext';
import { useProfile } from '../../../src/hooks/useProfile';
import {
  MarketplaceService,
  type Lapak,
  type LapakProduct,
  type LapakReview,
  type LapakInteraction,
  type ProductCondition,
} from '../../../src/services/marketplaceService';

const { width } = Dimensions.get('window');
const PRODUCT_CARD_W = (width - Spacing.base * 2 - 12) / 2;

type MemberTab = 'katalog' | 'lapak_saya' | 'produk_saya' | 'ulasan';

const CATEGORIES = [
  'Semua',
  'Parts & Komponen',
  'Merchandise Resmi',
  'Aksesoris & Variasi',
  'Jasa & Bengkel',
  'Mobil / Unit',
];

export default function TokoMemberScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { member } = useProfile(user?.id);

  const [activeTab, setActiveTab] = useState<MemberTab>('katalog');
  const [loading, setLoading] = useState(false);

  // Data states
  const [products, setProducts] = useState<LapakProduct[]>([]);
  const [myLapak, setMyLapak] = useState<Lapak | null>(null);
  const [myProducts, setMyProducts] = useState<LapakProduct[]>([]);
  const [reviews, setReviews] = useState<LapakReview[]>([]);
  const [interactions, setInteractions] = useState<LapakInteraction[]>([]);

  // Filters
  const [category, setCategory] = useState('Semua');
  const [condition, setCondition] = useState('ALL');
  const [search, setSearch] = useState('');

  // Sewa Lapak Baru Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Parts & Komponen');
  const [formWa, setFormWa] = useState(profile?.phone || '082129709696');
  const [formMonths, setFormMonths] = useState(6);
  const [formProof, setFormProof] = useState('');

  // Perpanjang Sewa Lapak Form State
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewMonths, setRenewMonths] = useState(6);
  const [renewProof, setRenewProof] = useState('');
  const [renewNotes, setRenewNotes] = useState('');
  const [submittingRenew, setSubmittingRenew] = useState(false);

  // Tambah Produk Baru Form State
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCondition, setProdCondition] = useState<ProductCondition>('NEW');
  const [prodCategory, setProdCategory] = useState('Parts & Komponen');
  const [prodLocation, setProdLocation] = useState('Jakarta');
  const [prodWa, setProdWa] = useState(profile?.phone || '081234567890');
  const [prodImage, setProdImage] = useState('https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600');

  // Review Form Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [targetReviewLapak, setTargetReviewLapak] = useState<{ id: string; name: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allProds, lapak, revs, inters] = await Promise.all([
        MarketplaceService.getProducts({
          category: category === 'Semua' ? 'ALL' : category,
          condition,
          search,
          onlyPublished: true,
        }),
        MarketplaceService.getLapakByUserId(user?.id, member?.member_number),
        MarketplaceService.getReviews(),
        MarketplaceService.getInteractions(),
      ]);

      setProducts(allProds);
      setMyLapak(lapak);
      setReviews(revs);
      setInteractions(inters);

      if (lapak) {
        const userProds = await MarketplaceService.getProducts({ lapakId: lapak.id });
        setMyProducts(userProds);
      }
    } catch (e) {
      console.warn('Error loading member marketplace data:', e);
    } finally {
      setLoading(false);
    }
  }, [category, condition, search, user?.id, member?.member_number]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Kalkulasi biaya sewa lapak realtime & deteksi sponsor resmi
  const memberNum = member?.member_number || (profile as any)?.member_number || '';
  const isSponsor = memberNum.includes('SPN') || memberNum.includes('spn');
  const userTier = isSponsor ? 'OFFICIAL SPONSOR' : (profile?.role === 'super_admin' ? 'PLATINUM' : 'GOLD');
  const sewaCalc = MarketplaceService.calculateSewaFee(formMonths, userTier, memberNum);
  const memberRenewCalc = MarketplaceService.calculateRenewalFee(renewMonths, userTier, isSponsor);

  // ── Submit Pengajuan Perpanjang Sewa Lapak ───────────────────
  const handleSubmitRenewLapak = async () => {
    if (!myLapak) return;
    if (!renewProof.trim()) {
      Alert.alert(
        'Bukti Transfer Wajib',
        'Penyewa lapak WAJIB mengirim bukti transfer pembayaran ke Bank Mandiri 137-00-1234567-8 a.n. MERCEDES-BENZ CLUB INDONESIA. Tanpa bukti transfer, Admin/Pengurus tidak dapat menyetujui perpanjangan sewa.'
      );
      return;
    }

    setSubmittingRenew(true);
    try {
      const res = await MarketplaceService.requestRenewLapak({
        lapakId: myLapak.id,
        months: renewMonths,
        paymentProofUrl: renewProof.trim(),
        notes: renewNotes.trim(),
        userTier,
      });

      if (res.success) {
        showToast(res.message);
        setRenewModalVisible(false);
        await loadData();
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengajukan perpanjangan sewa lapak.');
    } finally {
      setSubmittingRenew(false);
    }
  };

  // ── 1. Submit Sewa Lapak Baru ─────────────────────────────────
  const handleSubmitSewaLapak = async () => {
    if (!memberNum || !memberNum.startsWith('MBINA-')) {
      Alert.alert(
        'Perhatian',
        '⚠️ Pengajuan sewa lapak hanya diperuntukkan bagi Anggota resmi MB INA yang telah memiliki Nomor KTA aktif. Pastikan status keanggotaan Anda telah disetujui panitia.'
      );
      return;
    }

    if (!formName.trim() || !formWa.trim()) {
      Alert.alert('Perhatian', 'Nama lapak dan nomor WhatsApp wajib diisi.');
      return;
    }

    const isFree = sewaCalc.finalFee === 0;
    if (!isFree && !formProof.trim()) {
      Alert.alert(
        'Bukti Transfer Wajib',
        'Penyewa lapak harus mengirim bukti transfer pembayaran ke Bank Mandiri 137-00-1234567-8 a.n. MERCEDES-BENZ CLUB INDONESIA. Tanpa bukti transfer, Admin/Pengurus tidak dapat menyetujui permohonan sewa lapak.'
      );
      return;
    }

    const res = await MarketplaceService.createLapak({
      userId: user?.id || 'usr_member',
      memberId: memberNum,
      pemilik: profile?.full_name || 'Member MB INA',
      name: formName.trim(),
      description: formDesc.trim() || `Lapak resmi penyedia ${formCategory} dari anggota resmi MB INA.`,
      category: isSponsor ? 'Sponsor & Dealer Resmi' : formCategory,
      contactPhone: formWa.trim(),
      contactWhatsapp: formWa.trim(),
      months: formMonths,
      userTier,
      paymentProofUrl: isFree ? 'SPONSORSHIP_PACKAGE_BENEFIT' : formProof.trim(),
    });

    if (res.success) {
      showToast(res.message);
      await loadData();
      setActiveTab('lapak_saya');
    } else {
      Alert.alert('Peringatan', res.message);
    }
  };

  // ── 2. Submit Tambah Produk Baru ─────────────────────────────
  const handleSubmitProduct = async () => {
    if (!myLapak) {
      Alert.alert('Perhatian', 'Anda belum memiliki Lapak aktif. Silakan ajukan sewa lapak terlebih dahulu.');
      return;
    }

    if (!prodName.trim() || !prodPrice.trim()) {
      Alert.alert('Perhatian', 'Nama produk dan harga wajib diisi.');
      return;
    }

    const priceNum = parseInt(prodPrice.replace(/\D/g, ''), 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Perhatian', 'Harga produk tidak valid.');
      return;
    }

    const res = await MarketplaceService.createProduct({
      lapakId: myLapak.id,
      name: prodName.trim(),
      description: prodDesc.trim() || 'Barang berkualitas original Mercedes-Benz.',
      price: priceNum,
      condition: prodCondition,
      location: prodLocation.trim() || 'Jakarta',
      category: prodCategory,
      contactWhatsapp: prodWa.trim() || myLapak.contact_whatsapp,
      images: [prodImage.trim() || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600'],
      userId: user?.id || 'usr_member',
      sellerName: profile?.full_name || myLapak.pemilik,
      memberId: myLapak.member_id,
      isAdmin: false,
    });

    if (res.success) {
      showToast(res.message);
      setProductModalVisible(false);
      setProdName('');
      setProdDesc('');
      setProdPrice('');
      await loadData();
      setActiveTab('produk_saya');
    }
  };

  // ── 3. Hubungi Penjual via WhatsApp & Record Interaction ──────
  const handleContactSeller = async (product: LapakProduct) => {
    // Record interaksi agar user bisa memberi ulasan di tab Ulasan
    await MarketplaceService.recordInteraction(
      product.lapak_id,
      product.lapak_name || 'Lapak MB INA',
      product.seller_name,
      product.name
    );

    const cleanWa = product.contact_whatsapp.replace(/\D/g, '');
    const waNumber = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
    const msg = encodeURIComponent(
      `Halo om ${product.seller_name}, salam satu bintang dari sesama anggota MB Club Indonesia. Saya melihat iklan Anda "${product.name}" di Marketplace resmi MB INA seharga Rp ${product.price.toLocaleString('id-ID')}. Apakah barang ini masih tersedia?`
    );

    const waUrl = `https://wa.me/${waNumber}?text=${msg}`;
    Linking.openURL(waUrl);
    await loadData();
  };

  // ── 4. Submit Review & Rating ────────────────────────────────
  const handleSubmitReview = async () => {
    if (!targetReviewLapak) return;
    if (!reviewContent.trim()) {
      Alert.alert('Perhatian', 'Mohon tuliskan testimoni ulasan Anda.');
      return;
    }

    const memberNum = member?.member_number || (profile as any)?.member_number || 'MBINA-MEMBER';
    const res = await MarketplaceService.createReview({
      lapakId: targetReviewLapak.id,
      userId: user?.id || 'usr_member',
      userName: profile?.full_name || 'Anggota MB INA',
      memberId: memberNum,
      rating: reviewRating,
      content: reviewContent.trim(),
    });

    if (res.success) {
      showToast(res.message);
      setReviewModalVisible(false);
      setReviewContent('');
      await loadData();
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
            <Text style={styles.headerTitle}>Toko & Marketplace MB INA</Text>
            <Text style={styles.headerSubtitle}>
              Bursa resmi spare parts, merchandise, dan aksesoris terverifikasi antar-anggota
            </Text>
          </View>
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

        {/* ── Segmented Navigation Tabs Bar ─────────────────────── */}
        <View style={styles.segmentedTabBar}>
          {[
            { key: 'katalog' as MemberTab, label: 'Katalog', icon: 'storefront-outline' },
            { key: 'lapak_saya' as MemberTab, label: 'Lapak Saya', icon: 'business-outline' },
            { key: 'produk_saya' as MemberTab, label: 'Produk Saya', icon: 'cube-outline' },
            { key: 'ulasan' as MemberTab, label: 'Ulasan & Rating', icon: 'star-outline' },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.segmentedTabBtn, activeTab === tab.key && styles.segmentedTabBtnActive]}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.key ? '#09090B' : '#A1A1AA'}
              />
              <Text
                style={[
                  styles.segmentedTabBtnText,
                  activeTab === tab.key && styles.segmentedTabBtnTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 1: KATALOG MARKETPLACE                                */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'katalog' && (
          <View>
            {/* Search Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputBox}>
                <Ionicons name="search" size={16} color="#71717A" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari spare part, velg, aksesoris, atau kota..."
                  placeholderTextColor="#71717A"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#71717A" />
                  </Pressable>
                )}
              </View>

              {/* Category Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.filterChip, category === c && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, category === c && styles.filterChipTextActive]}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Condition Filter Chips */}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                {['ALL', 'NEW', 'USED'].map((cnd) => (
                  <Pressable
                    key={cnd}
                    onPress={() => setCondition(cnd)}
                    style={[styles.subChip, condition === cnd && styles.subChipActive]}
                  >
                    <Text style={[styles.subChipText, condition === cnd && styles.subChipTextActive]}>
                      {cnd === 'ALL' ? 'Semua Kondisi' : cnd === 'NEW' ? 'Baru (New)' : 'Bekas (Used)'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Product Grid 2-Kolom */}
            {products.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="storefront-outline" size={40} color="#71717A" />
                <Text style={styles.emptyText}>Tidak ada produk yang sesuai filter.</Text>
              </View>
            ) : (
              <View style={styles.productGrid}>
                {products.map((prod) => (
                  <Pressable
                    key={prod.id}
                    onPress={() => router.push(`/(main)/toko/${prod.id}` as any)}
                    style={styles.gridCard}
                  >
                    <View style={styles.thumbContainer}>
                      <Image source={{ uri: prod.images[0] }} style={styles.gridThumb} />
                      <View style={[styles.conditionBadge, prod.condition === 'NEW' ? styles.pillNew : styles.pillUsed]}>
                        <Text style={styles.conditionBadgeText}>{prod.condition}</Text>
                      </View>
                    </View>

                    <View style={styles.gridBody}>
                      <Text style={styles.gridCategoryText}>{prod.category}</Text>
                      <Text style={styles.gridTitle} numberOfLines={2}>
                        {prod.name}
                      </Text>
                      <Text style={styles.gridPrice}>Rp {prod.price.toLocaleString('id-ID')}</Text>

                      <View style={styles.gridStoreRow}>
                        <Ionicons name="storefront-outline" size={11} color="#A1A1AA" />
                        <Text style={styles.gridStoreName} numberOfLines={1}>
                          {prod.lapak_name}
                        </Text>
                      </View>

                      <View style={styles.gridLocRow}>
                        <Ionicons name="location-outline" size={11} color="#71717A" />
                        <Text style={styles.gridLocText} numberOfLines={1}>
                          {prod.location}
                        </Text>
                      </View>

                      {/* Tombol Kontak Langsung */}
                      <Pressable
                        onPress={() => handleContactSeller(prod)}
                        style={styles.contactSellerBtn}
                      >
                        <Ionicons name="logo-whatsapp" size={13} color="#09090B" />
                        <Text style={styles.contactSellerBtnText}>Hubungi Penjual</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Disclaimer MBCINA */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={16} color="#FBBF24" />
              <Text style={styles.disclaimerText}>
                Transaksi dilakukan secara langsung antara pembeli & penjual sesama anggota via WhatsApp. MB INA memfasilitasi tempat lapak & direktori resmi dan bebas biaya komisi per transaksi.
              </Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 2: LAPAK SAYA / STATUS SEWA / BUKA LAPAK             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'lapak_saya' && (
          <View>
            {myLapak ? (
              /* KASUS A: MEMBER SUDAH MEMILIKI LAPAK AKTIF */
              <View>
                <View style={styles.myLapakCard}>
                  <View style={styles.myLapakHeader}>
                    <Image
                      source={{ uri: myLapak.logo_url || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=300' }}
                      style={styles.myLapakLogo}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.myLapakName}>{myLapak.name}</Text>
                        <Text style={styles.myLapakCode}>{myLapak.id}</Text>
                      </View>
                      <Text style={styles.myLapakCategory}>{myLapak.category}</Text>
                      <Text style={styles.myLapakOwner}>
                        Pemilik: {myLapak.pemilik} ({myLapak.member_id})
                      </Text>
                    </View>
                  </View>

                  <View style={styles.hairline} />

                  <Text style={styles.myLapakDesc}>{myLapak.description}</Text>

                  <View style={styles.myLapakMetaGrid}>
                    <View style={styles.myLapakMetaItem}>
                      <Text style={styles.metaLabel}>Status Lapak</Text>
                      <Text
                        style={[
                          styles.metaValue,
                          { color: myLapak.sewa_status === 'ACTIVE' ? '#34D399' : '#FBBF24' },
                        ]}
                      >
                        {myLapak.sewa_status}
                      </Text>
                    </View>
                    <View style={styles.myLapakMetaItem}>
                      <Text style={styles.metaLabel}>Masa Aktif Sewa</Text>
                      <Text style={styles.metaValue}>{myLapak.sewa_end_date}</Text>
                    </View>
                    <View style={styles.myLapakMetaItem}>
                      <Text style={styles.metaLabel}>WhatsApp Lapak</Text>
                      <Text style={styles.metaValue}>{myLapak.contact_whatsapp}</Text>
                    </View>
                    <View style={styles.myLapakMetaItem}>
                      <Text style={styles.metaLabel}>Total Produk Iklan</Text>
                      <Text style={styles.metaValue}>{myProducts.length} Produk</Text>
                    </View>
                  </View>

                  {/* Status Pengajuan Perpanjangan Sewa (Jika Ada) */}
                  {myLapak.pending_renewal ? (
                    <View
                      style={{
                        backgroundColor: 'rgba(251, 191, 36, 0.08)',
                        borderWidth: 1,
                        borderColor: '#FBBF24',
                        borderRadius: 8,
                        padding: 10,
                        marginHorizontal: 12,
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="time" size={16} color="#FBBF24" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FBBF24', flex: 1 }}>
                          Pengajuan Perpanjangan (+{myLapak.pending_renewal.months} Bulan) Sedang Ditinjau Admin
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#D4D4D8', marginTop: 4 }}>
                        Tagihan Sewa: Rp {myLapak.pending_renewal.final_fee.toLocaleString('id-ID')} • Bukti transfer telah terlampir.
                      </Text>
                    </View>
                  ) : null}

                  {/* Tombol Aksi Lapak */}
                  <View style={styles.myLapakActionRow}>
                    <Pressable
                      onPress={() => setProductModalVisible(true)}
                      style={styles.btnActionGold}
                    >
                      <Ionicons name="add-circle" size={15} color="#09090B" />
                      <Text style={styles.btnActionGoldText}>+ Pasang Iklan</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setRenewMonths(6);
                        setRenewProof('');
                        setRenewNotes('');
                        setRenewModalVisible(true);
                      }}
                      style={[styles.btnActionOutline, { borderColor: '#FBBF24' }]}
                    >
                      <Ionicons name="refresh" size={14} color="#FBBF24" />
                      <Text style={[styles.btnActionOutlineText, { color: '#FBBF24' }]}>Perpanjang Sewa</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setActiveTab('produk_saya')}
                      style={styles.btnActionOutline}
                    >
                      <Ionicons name="cube-outline" size={14} color="#D4D4D8" />
                      <Text style={styles.btnActionOutlineText}>Produk Saya</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              /* KASUS B: MEMBER BELUM MEMILIKI LAPAK (FORM SEWA LAPAK BARU) */
              <View>
                <View style={styles.bukaLapakHero}>
                  <View style={styles.bukaLapakIconBox}>
                    <Ionicons name="storefront" size={26} color="#FBBF24" />
                  </View>
                  <Text style={styles.bukaLapakTitle}>Sewa Lapak Resmi MB INA</Text>
                  <Text style={styles.bukaLapakDesc}>
                    Buka lapak jualan resmi spare part, merchandise, aksesoris, atau jasa bengkel Anda kepada ribuan anggota MB Club Indonesia di seluruh nusantara.
                  </Text>
                </View>

                {/* Ketentuan Sewa MBCINA */}
                <View style={styles.rulesCard}>
                  <Text style={styles.rulesTitle}>Aturan Resmi Sewa Lapak MBCI:</Text>
                  <Text style={styles.rulesItem}>
                    • Pemohon wajib anggota resmi dengan Nomor KTA aktif.
                  </Text>
                  <Text style={styles.rulesItem}>
                    • 1 Nomor Anggota = 1 Lapak Resmi (bisa pasang banyak produk).
                  </Text>
                  <Text style={styles.rulesItem}>
                    • Biaya Sewa Dasar: <Text style={{ color: '#FBBF24', fontWeight: '700' }}>Rp 5.000 / bulan</Text>.
                  </Text>
                  <Text style={styles.rulesItem}>
                    • Diskon Tier KTA: Bronze 5%, Silver 10%, Gold 15%, Platinum 20%.
                  </Text>
                </View>

                {/* Form Input Sewa */}
                <View style={styles.formContainer}>
                  <Text style={styles.formSectionTitle}>Formulir Pengajuan Lapak</Text>

                  <Text style={styles.fieldLabel}>Nama Lapak / Toko *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Contoh: Garasi Bintang Parts"
                    placeholderTextColor="#71717A"
                    value={formName}
                    onChangeText={setFormName}
                  />

                  <Text style={styles.fieldLabel}>Kategori Utama Toko *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {CATEGORIES.filter((c) => c !== 'Semua').map((cat) => (
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

                  <Text style={styles.fieldLabel}>Nomor WhatsApp Lapak (Direct Chat Pembeli) *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Contoh: 081234567890"
                    placeholderTextColor="#71717A"
                    keyboardType="phone-pad"
                    value={formWa}
                    onChangeText={setFormWa}
                  />

                  <Text style={styles.fieldLabel}>Deskripsi Lapak</Text>
                  <TextInput
                    style={[styles.fieldInput, { height: 70, textAlignVertical: 'top' }]}
                    placeholder="Jelaskan spesialisasi dagangan toko Anda..."
                    placeholderTextColor="#71717A"
                    multiline
                    value={formDesc}
                    onChangeText={setFormDesc}
                  />

                  <Text style={styles.fieldLabel}>Pilih Durasi Sewa Lapak</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    {[1, 3, 6, 12].map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => setFormMonths(m)}
                        style={[
                          styles.subChip,
                          formMonths === m && styles.subChipActive,
                          { flex: 1, alignItems: 'center' },
                        ]}
                      >
                        <Text style={[styles.subChipText, formMonths === m && styles.subChipTextActive]}>
                          {m} Bulan
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Banner Benefit Sponsor Resmi */}
                  {sewaCalc.isSponsorFree && (
                    <View
                      style={{
                        backgroundColor: 'rgba(251, 191, 36, 0.12)',
                        borderWidth: 1,
                        borderColor: '#FBBF24',
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 14,
                        flexDirection: 'row',
                        gap: 10,
                      }}
                    >
                      <Ionicons name="gift" size={22} color="#FBBF24" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FBBF24', fontWeight: '800', fontSize: 13 }}>
                          🎁 BENEFIT SPONSOR RESMI: GRATIS SEWA 3 BULAN!
                        </Text>
                        <Text style={{ color: '#D4D4D8', fontSize: 11, marginTop: 3, lineHeight: 16 }}>
                          KTA Sponsor Resmi Anda ({memberNum}) berhak menikmati fasilitas GRATIS sewa lapak selama 3 bulan pertama. Pengajuan langsung disetujui & aktif seketika!
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Kalkulator Biaya Sewa Realtime */}
                  <View style={styles.feeCalculationCard}>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Tarif Dasar (Rp 5.000 × {formMonths} bln):</Text>
                      <Text style={styles.calcVal}>Rp {sewaCalc.originalFee.toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>
                        {sewaCalc.isSponsorFree ? 'Benefit Sponsor Resmi:' : `Diskon Tier KTA (${sewaCalc.tier} ${sewaCalc.discountPercent}%):`}
                      </Text>
                      <Text style={[styles.calcVal, { color: '#34D399' }]}>
                        - Rp {sewaCalc.discountAmount.toLocaleString('id-ID')}
                      </Text>
                    </View>
                    <View style={[styles.hairline, { marginVertical: 8 }]} />
                    <View style={styles.calcRow}>
                      <Text style={[styles.calcLabel, { fontWeight: '700', color: '#F4F4F5' }]}>
                        Total Biaya Sewa ({formMonths} bln):
                      </Text>
                      <Text style={styles.calcTotalFee}>
                        Rp {sewaCalc.finalFee.toLocaleString('id-ID')}
                      </Text>
                    </View>
                    <Text style={styles.calcMonthlySub}>
                      (Setara Rp {sewaCalc.monthlyRate.toLocaleString('id-ID')}/bulan)
                    </Text>
                  </View>

                  {/* Jika Sewa Gratis (Sponsor), Tampilkan Kotak Sukses Bebas Biaya */}
                  {sewaCalc.finalFee === 0 ? (
                    <View
                      style={{
                        backgroundColor: 'rgba(52, 211, 153, 0.12)',
                        borderWidth: 1,
                        borderColor: '#34D399',
                        borderRadius: 10,
                        padding: 14,
                        marginBottom: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#34D399" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#34D399', fontWeight: '800', fontSize: 13 }}>
                          FASILITAS SEWA GRATIS (BEBAS BIAYA)
                        </Text>
                        <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                          Biaya sewa Rp 0 (Termasuk dalam Paket Kerjasama Sponsorship MB Club Indonesia). Tidak memerlukan bukti transfer & lapak akan langsung aktif.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      {/* Rekening Pembayaran Resmi Bank Mandiri */}
                      <View style={styles.bankAccountCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <Ionicons name="card" size={16} color="#FBBF24" />
                          <Text style={styles.bankTitle}>Rekening Resmi Mercedes-Benz Club Indonesia:</Text>
                        </View>
                        <View style={styles.bankHighlightBox}>
                          <Text style={styles.bankMandiriText}>Bank Mandiri</Text>
                          <Text style={styles.bankNumberText}>137-00-1234567-8</Text>
                          <Text style={styles.bankOwnerText}>a.n. MERCEDES-BENZ CLUB INDONESIA</Text>
                        </View>
                      </View>

                      {/* Input & Lampiran Bukti Transfer (Wajib) */}
                      <View style={styles.proofSection}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={styles.fieldLabel}>
                            Bukti Transfer Pembayaran <Text style={{ color: '#EF4444', fontWeight: '800' }}>*</Text>
                          </Text>
                          <View style={styles.proofRequiredPill}>
                            <Text style={styles.proofRequiredPillText}>WAJIB</Text>
                          </View>
                        </View>
                        <Text style={styles.proofSubLabel}>
                          Penyewa lapak harus mengirim bukti transfer. Tanpa bukti transfer, Admin/Pengurus tidak dapat menyetujui pengajuan sewa lapak.
                        </Text>

                        <TextInput
                          style={styles.fieldInput}
                          placeholder="Masukkan URL foto struk / resi transfer..."
                          placeholderTextColor="#71717A"
                          value={formProof}
                          onChangeText={setFormProof}
                        />

                        {!formProof ? (
                          <Pressable
                            onPress={() => setFormProof('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600')}
                            style={styles.btnAttachProof}
                          >
                            <Ionicons name="cloud-upload-outline" size={15} color="#FBBF24" />
                            <Text style={styles.btnAttachProofText}>+ Lampirkan Bukti Transfer Mandiri (Demo)</Text>
                          </Pressable>
                        ) : (
                          <View style={styles.proofAttachedBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.proofAttachedTitle}>Bukti Transfer Terlampir</Text>
                                <Text style={styles.proofAttachedUrl} numberOfLines={1}>{formProof}</Text>
                              </View>
                            </View>
                            <Pressable onPress={() => setFormProof('')} hitSlop={8}>
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* Reward Poin Notice */}
                  <View style={styles.rewardNoticeBox}>
                    <Ionicons name="sparkles" size={16} color="#FBBF24" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewardNoticeTitle}>Reward Poin Loyalitas Pemilik Lapak</Text>
                      <Text style={styles.rewardNoticeText}>
                        Pemilik lapak akan mendapatkan <Text style={{ fontWeight: '800', color: '#FBBF24' }}>{Math.round(sewaCalc.finalFee / 1000)} Poin</Text> (Rp {sewaCalc.finalFee.toLocaleString('id-ID')} = {Math.round(sewaCalc.finalFee / 1000)} Poin) secara otomatis begitu lapak disetujui Admin!
                      </Text>
                    </View>
                  </View>

                  <Pressable onPress={handleSubmitSewaLapak} style={styles.submitSewaBtn}>
                    <Ionicons name={sewaCalc.finalFee === 0 ? 'checkmark-circle' : 'paper-plane'} size={15} color="#09090B" />
                    <Text style={styles.submitSewaBtnText}>
                      {sewaCalc.finalFee === 0 ? 'Aktifkan Lapak Sponsor (Gratis 3 Bulan)' : 'Kirim Pengajuan Sewa Lapak'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 3: PRODUK SAYA                                        */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'produk_saya' && (
          <View>
            {!myLapak ? (
              <View style={styles.emptyCard}>
                <Ionicons name="alert-circle-outline" size={36} color="#FBBF24" />
                <Text style={[styles.emptyText, { color: '#FBBF24', marginTop: 8 }]}>
                  Anda Belum Memiliki Lapak Jualan
                </Text>
                <Text style={{ color: '#71717A', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                  Buka lapak sewa terlebih dahulu untuk mulai memasang iklan dagangan produk Anda.
                </Text>
                <Pressable
                  onPress={() => setActiveTab('lapak_saya')}
                  style={[styles.btnActionGold, { marginTop: 14 }]}
                >
                  <Text style={styles.btnActionGoldText}>Buka Lapak Sekarang</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                {/* KPI Produk Saya */}
                <View style={styles.myProdKpiRow}>
                  <View style={styles.myProdKpiItem}>
                    <Text style={styles.kpiLabel}>Total Produk</Text>
                    <Text style={styles.kpiValue}>{myProducts.length}</Text>
                  </View>
                  <View style={styles.myProdKpiItem}>
                    <Text style={[styles.kpiLabel, { color: '#34D399' }]}>Disetujui</Text>
                    <Text style={[styles.kpiValue, { color: '#34D399' }]}>
                      {myProducts.filter((p) => p.status === 'APPROVED').length}
                    </Text>
                  </View>
                  <View style={styles.myProdKpiItem}>
                    <Text style={[styles.kpiLabel, { color: '#FBBF24' }]}>Pending</Text>
                    <Text style={[styles.kpiValue, { color: '#FBBF24' }]}>
                      {myProducts.filter((p) => p.status === 'PENDING').length}
                    </Text>
                  </View>
                </View>

                {/* Tombol Pasang Iklan */}
                <Pressable onPress={() => setProductModalVisible(true)} style={styles.btnAddProduct}>
                  <Ionicons name="add-circle" size={16} color="#09090B" />
                  <Text style={styles.btnAddProductText}>+ Pasang Iklan Produk Baru</Text>
                </Pressable>

                {/* List Produk Saya */}
                {myProducts.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="cube-outline" size={32} color="#71717A" />
                    <Text style={styles.emptyText}>Belum ada produk yang dipasang di lapak Anda.</Text>
                  </View>
                ) : (
                  myProducts.map((prod) => (
                    <View key={prod.id} style={styles.myProdCard}>
                      <Image source={{ uri: prod.images[0] }} style={styles.myProdThumb} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.myProdTitle} numberOfLines={1}>
                            {prod.name}
                          </Text>
                          <View
                            style={[
                              styles.prodStatusBadge,
                              prod.status === 'APPROVED' ? styles.badgeActive : styles.badgePending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.prodStatusText,
                                { color: prod.status === 'APPROVED' ? '#34D399' : '#FBBF24' },
                              ]}
                            >
                              {prod.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.myProdPrice}>Rp {prod.price.toLocaleString('id-ID')}</Text>
                        <Text style={styles.myProdMeta}>
                          {prod.category} • Kondisi: {prod.condition}
                        </Text>
                        {prod.rejection_reason && (
                          <Text style={styles.rejectionReasonText}>
                            Catatan Admin: {prod.rejection_reason}
                          </Text>
                        )}
                      </View>
                      <Pressable
                        onPress={async () => {
                          await MarketplaceService.deleteProduct(prod.id);
                          showToast('Produk berhasil dihapus.');
                          await loadData();
                        }}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#F87171" />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 4: ULASAN & RATING                                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'ulasan' && (
          <View>
            <View style={{ marginBottom: 12 }}>
              <SectionHeader
                title="Lapak yang Anda Hubungi / Transaksikan"
                subtitle="Beri rating bintang dan ulasan testimoni pada penjual terverifikasi"
                accentColor="#FBBF24"
              />
            </View>

            {interactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={32} color="#71717A" />
                <Text style={styles.emptyText}>
                  Anda belum pernah menghubungi penjual. Saat Anda menekan 'Hubungi Penjual' di katalog, toko tersebut akan otomatis muncul di sini untuk Anda review.
                </Text>
              </View>
            ) : (
              interactions.map((item) => (
                <View key={item.lapak_id} style={styles.interactionCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.interactLapakName}>{item.lapak_name}</Text>
                      <View style={styles.verifiedTag}>
                        <Ionicons name="checkmark-circle" size={10} color="#34D399" />
                        <Text style={styles.verifiedTagText}>Terverifikasi</Text>
                      </View>
                    </View>
                    <Text style={styles.interactProductText}>Produk: {item.product_name}</Text>
                    <Text style={styles.interactDate}>Interaksi: {item.interaction_date}</Text>
                  </View>

                  {item.reviewed ? (
                    <View style={styles.reviewedBadge}>
                      <Ionicons name="star" size={12} color="#FBBF24" />
                      <Text style={styles.reviewedBadgeText}>Sudah Dinilai</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setTargetReviewLapak({ id: item.lapak_id, name: item.lapak_name });
                        setReviewModalVisible(true);
                      }}
                      style={styles.btnReviewNow}
                    >
                      <Ionicons name="star" size={13} color="#09090B" />
                      <Text style={styles.btnReviewNowText}>Nilai Penjual</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}

            {/* Testimoni Ulasan Terbaru Komunitas */}
            <View style={{ marginTop: 22, marginBottom: 12 }}>
              <SectionHeader
                title="Ulasan & Review Terbaru Anggota"
                subtitle="Testimoni nyata antar sesama anggota komunitas MB INA"
                accentColor="#A1A1AA"
              />
            </View>

            {reviews.map((rev) => (
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
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal Pasang Iklan Baru ────────────────────────────── */}
      <Modal visible={productModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pasang Iklan Produk Baru</Text>
              <Pressable onPress={() => setProductModalVisible(false)}>
                <Ionicons name="close" size={20} color="#71717A" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Nama Produk / Sparepart *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Contoh: Velg AMG 18 Monoblock Original"
                placeholderTextColor="#71717A"
                value={prodName}
                onChangeText={setProdName}
              />

              <Text style={styles.fieldLabel}>Kategori Produk *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {CATEGORIES.filter((c) => c !== 'Semua').map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setProdCategory(cat)}
                    style={[styles.filterChip, prodCategory === cat && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, prodCategory === cat && styles.filterChipTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Kondisi</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable
                      onPress={() => setProdCondition('NEW')}
                      style={[styles.subChip, prodCondition === 'NEW' && styles.subChipActive, { flex: 1, alignItems: 'center' }]}
                    >
                      <Text style={[styles.subChipText, prodCondition === 'NEW' && styles.subChipTextActive]}>Baru</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setProdCondition('USED')}
                      style={[styles.subChip, prodCondition === 'USED' && styles.subChipActive, { flex: 1, alignItems: 'center' }]}
                    >
                      <Text style={[styles.subChipText, prodCondition === 'USED' && styles.subChipTextActive]}>Bekas</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Harga (Rp) *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Contoh: 1500000"
                    placeholderTextColor="#71717A"
                    keyboardType="numeric"
                    value={prodPrice}
                    onChangeText={setProdPrice}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Kota / Lokasi Barang</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Contoh: Jakarta Selatan"
                placeholderTextColor="#71717A"
                value={prodLocation}
                onChangeText={setProdLocation}
              />

              <Text style={styles.fieldLabel}>Nomor WhatsApp Penjual</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Contoh: 081234567890"
                placeholderTextColor="#71717A"
                keyboardType="phone-pad"
                value={prodWa}
                onChangeText={setProdWa}
              />

              <Text style={styles.fieldLabel}>Deskripsi Produk</Text>
              <TextInput
                style={[styles.fieldInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Rincian kondisi barang, kecocokan tipe sasis (W124/W210/dll)..."
                placeholderTextColor="#71717A"
                multiline
                value={prodDesc}
                onChangeText={setProdDesc}
              />

              <View style={styles.modalActionRow}>
                <Pressable onPress={() => setProductModalVisible(false)} style={styles.modalBtnCancel}>
                  <Text style={styles.modalBtnCancelText}>Batal</Text>
                </Pressable>
                <Pressable onPress={handleSubmitProduct} style={styles.modalBtnSubmit}>
                  <Text style={styles.modalBtnSubmitText}>Ajukan Iklan</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal Beri Rating & Review ─────────────────────────── */}
      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Beri Rating & Ulasan Toko</Text>
              <Pressable onPress={() => setReviewModalVisible(false)}>
                <Ionicons name="close" size={20} color="#71717A" />
              </Pressable>
            </View>

            {targetReviewLapak && (
              <View>
                <Text style={{ color: '#E4E4E7', fontSize: 13, marginBottom: 12 }}>
                  Toko yang Dinilai: <Text style={{ fontWeight: '700', color: '#FBBF24' }}>{targetReviewLapak.name}</Text>
                </Text>

                <Text style={styles.fieldLabel}>Pilih Bintang Rating *</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setReviewRating(star)}
                      style={[
                        styles.starPickerBtn,
                        reviewRating === star && styles.starPickerBtnActive,
                      ]}
                    >
                      <Ionicons
                        name={star <= reviewRating ? 'star' : 'star-outline'}
                        size={16}
                        color={reviewRating === star ? '#09090B' : '#FBBF24'}
                      />
                      <Text
                        style={[
                          styles.starPickerText,
                          reviewRating === star && styles.starPickerTextActive,
                        ]}
                      >
                        {star}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Ulasan Pengalaman Transaksi *</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Ceritakan kepuasan Anda bertransaksi dengan sesama anggota MB INA..."
                  placeholderTextColor="#71717A"
                  multiline
                  value={reviewContent}
                  onChangeText={setReviewContent}
                />

                <View style={styles.modalActionRow}>
                  <Pressable onPress={() => setReviewModalVisible(false)} style={styles.modalBtnCancel}>
                    <Text style={styles.modalBtnCancelText}>Batal</Text>
                  </Pressable>
                  <Pressable onPress={handleSubmitReview} style={styles.modalBtnSubmit}>
                    <Text style={styles.modalBtnSubmitText}>Kirim Ulasan</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal Perpanjang Sewa Lapak (Member) ───────────────── */}
      <Modal visible={renewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Perpanjang Masa Sewa Lapak</Text>
                <Text style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>
                  Pembayaran Sewa & Moderasi Resmi MB INA
                </Text>
              </View>
              <Pressable onPress={() => setRenewModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#71717A" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {myLapak && (
                <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#F4F4F5' }}>
                    {myLapak.name} ({myLapak.id})
                  </Text>
                  <Text style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>
                    Masa Berlaku Saat Ini: s/d {myLapak.sewa_end_date}
                  </Text>
                </View>
              )}

              {/* Durasi Pilihan */}
              <Text style={styles.fieldLabel}>Pilih Durasi Perpanjangan *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[3, 6, 12].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setRenewMonths(m)}
                    style={[
                      styles.subChip,
                      renewMonths === m && styles.subChipActive,
                      { flex: 1, alignItems: 'center' },
                    ]}
                  >
                    <Text style={[styles.subChipText, renewMonths === m && styles.subChipTextActive]}>
                      +{m} Bulan
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Rincian Tarif & Diskon Tier */}
              <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.06)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.25)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FBBF24', marginBottom: 8 }}>
                  💰 Rincian Biaya Sewa Lapak:
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#D4D4D8' }}>Biaya Dasar:</Text>
                  <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }}>Rp 5.000 / bulan</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#D4D4D8' }}>Durasi:</Text>
                  <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }}>{renewMonths} Bulan</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: '#34D399' }}>Diskon Tier ({userTier}):</Text>
                  <Text style={{ fontSize: 12, color: '#34D399', fontWeight: '700' }}>
                    {memberRenewCalc.discountPercent}% (-Rp {memberRenewCalc.discountAmount.toLocaleString('id-ID')})
                  </Text>
                </View>
                <View style={[styles.hairline, { marginVertical: 6 }]} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#FBBF24', fontWeight: '700' }}>Total Yang Harus Ditransfer:</Text>
                  <Text style={{ fontSize: 16, color: '#FBBF24', fontWeight: '800' }}>
                    Rp {memberRenewCalc.finalFee.toLocaleString('id-ID')}
                  </Text>
                </View>
              </View>

              {/* Info Rekening Mandiri MB INA */}
              <View style={{ backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#60A5FA', fontWeight: '700', marginBottom: 4 }}>
                  🏦 Rekening Resmi Pembayaran MB INA:
                </Text>
                <Text style={{ fontSize: 12, color: '#E4E4E7', fontWeight: '700' }}>Bank Mandiri</Text>
                <Text style={{ fontSize: 14, color: '#FBBF24', fontWeight: '800', fontFamily: 'monospace' }}>
                  137-00-1234567-8
                </Text>
                <Text style={{ fontSize: 11, color: '#A1A1AA' }}>a.n. MERCEDES-BENZ CLUB INDONESIA</Text>
              </View>

              {/* Upload Bukti Transfer (WAJIB) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.fieldLabel}>Bukti Transfer Pembayaran *</Text>
                <Pressable onPress={() => setRenewProof('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600')}>
                  <Text style={{ color: '#FBBF24', fontSize: 11, fontWeight: '600' }}>+ Isi Contoh Bukti</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.fieldInput}
                placeholder="https://images.unsplash.com/bukti-transfer..."
                placeholderTextColor="#71717A"
                value={renewProof}
                onChangeText={setRenewProof}
              />
              <Text style={{ fontSize: 10, color: '#EF4444', marginTop: -6, marginBottom: 10 }}>
                * Wajib melampirkan bukti transfer. Tanpa bukti transfer, Admin tidak dapat menyetujui.
              </Text>

              {/* Catatan Pembayaran */}
              <Text style={styles.fieldLabel}>Catatan Pembayaran (Opsional)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Contoh: Transfer atas nama Budi Santoso"
                placeholderTextColor="#71717A"
                value={renewNotes}
                onChangeText={setRenewNotes}
              />

              <View style={styles.modalActionRow}>
                <Pressable onPress={() => setRenewModalVisible(false)} style={styles.modalBtnCancel}>
                  <Text style={styles.modalBtnCancelText}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitRenewLapak}
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
    alignItems: 'center',
    marginBottom: 14,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#F4F4F5',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
    lineHeight: 15,
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
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentedTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentedTabBtnActive: {
    backgroundColor: '#E4E4E7',
  },
  segmentedTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  segmentedTabBtnTextActive: {
    color: '#09090B',
    fontWeight: '700',
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#F4F4F5',
    fontSize: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#27272A',
    borderColor: '#E4E4E7',
  },
  filterChipText: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  subChipActive: {
    backgroundColor: '#E4E4E7',
    borderColor: '#E4E4E7',
  },
  subChipText: {
    fontSize: 10,
    color: '#A1A1AA',
  },
  subChipTextActive: {
    color: '#09090B',
    fontWeight: '700',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  emptyText: {
    color: '#A1A1AA',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridCard: {
    width: PRODUCT_CARD_W,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  thumbContainer: {
    position: 'relative',
    height: 120,
    backgroundColor: '#18181B',
  },
  gridThumb: {
    width: '100%',
    height: '100%',
  },
  conditionBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillNew: {
    backgroundColor: 'rgba(52, 211, 153, 0.85)',
  },
  pillUsed: {
    backgroundColor: 'rgba(39, 39, 42, 0.85)',
  },
  conditionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  gridBody: {
    padding: 10,
  },
  gridCategoryText: {
    fontSize: 9,
    color: '#A1A1AA',
    textTransform: 'uppercase',
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F4F4F5',
    marginTop: 2,
    lineHeight: 16,
  },
  gridPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C5A059',
    marginTop: 4,
  },
  gridStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  gridStoreName: {
    fontSize: 10,
    color: '#A1A1AA',
  },
  gridLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  gridLocText: {
    fontSize: 9,
    color: '#71717A',
  },
  contactSellerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
    backgroundColor: '#E4E4E7',
    paddingVertical: 6,
    borderRadius: 8,
  },
  contactSellerBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#09090B',
  },
  disclaimerBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    marginBottom: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10.5,
    color: '#A1A1AA',
    lineHeight: 15,
  },
  myLapakCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    marginBottom: 16,
  },
  myLapakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myLapakLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  myLapakName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F4F4F5',
  },
  myLapakCode: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#D4D4D8',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  myLapakCategory: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  myLapakOwner: {
    fontSize: 10,
    color: '#71717A',
    marginTop: 1,
  },
  hairline: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  myLapakDesc: {
    fontSize: 12,
    color: '#D4D4D8',
    lineHeight: 17,
  },
  myLapakMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  myLapakMetaItem: {
    flex: 1,
    minWidth: 130,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metaLabel: {
    fontSize: 9,
    color: '#71717A',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F4F4F5',
    marginTop: 2,
  },
  myLapakActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  btnActionGold: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E4E4E7',
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnActionGoldText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
  },
  btnActionOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnActionOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  bukaLapakHero: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    marginBottom: 14,
  },
  bukaLapakIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bukaLapakTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F4F4F5',
  },
  bukaLapakDesc: {
    fontSize: 11.5,
    color: '#A1A1AA',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  rulesCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E7',
    marginBottom: 6,
  },
  rulesItem: {
    fontSize: 11,
    color: '#A1A1AA',
    lineHeight: 16,
  },
  formContainer: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F4F4F5',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#A1A1AA',
    marginBottom: 4,
    marginTop: 6,
  },
  fieldInput: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F4F4F5',
    fontSize: 12,
    marginBottom: 6,
  },
  feeCalculationCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    marginVertical: 12,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  calcLabel: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  calcVal: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#E4E4E7',
  },
  calcTotalFee: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  calcMonthlySub: {
    fontSize: 9.5,
    color: '#71717A',
    textAlign: 'right',
    marginTop: 2,
  },
  bankAccountCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  bankTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  bankHighlightBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bankMandiriText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bankNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  bankOwnerText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#D4D4D8',
    marginTop: 2,
  },
  proofSection: {
    marginBottom: 14,
  },
  proofRequiredPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  proofRequiredPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F87171',
  },
  proofSubLabel: {
    fontSize: 10.5,
    color: '#A1A1AA',
    lineHeight: 15,
    marginBottom: 8,
  },
  btnAttachProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 6,
  },
  btnAttachProofText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  proofAttachedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginTop: 6,
  },
  proofAttachedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
  },
  proofAttachedUrl: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 1,
  },
  rewardNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#18191D',
    borderWidth: 1,
    borderColor: '#2D3139',
    marginBottom: 16,
  },
  rewardNoticeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  rewardNoticeText: {
    fontSize: 10.5,
    color: '#D4D4D8',
    lineHeight: 15,
  },
  submitSewaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E4E4E7',
  },
  submitSewaBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#09090B',
  },
  myProdKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  myProdKpiItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#A1A1AA',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F4F4F5',
    marginTop: 2,
  },
  btnAddProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E4E4E7',
    marginBottom: 14,
  },
  btnAddProductText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090B',
  },
  myProdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  myProdThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  myProdTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  prodStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
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
  prodStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  myProdPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C5A059',
    marginTop: 2,
  },
  myProdMeta: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 1,
  },
  rejectionReasonText: {
    fontSize: 10,
    color: '#F87171',
    marginTop: 3,
  },
  interactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  interactLapakName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  verifiedTagText: {
    fontSize: 8.5,
    color: '#34D399',
    fontWeight: '700',
  },
  interactProductText: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  interactDate: {
    fontSize: 9,
    color: '#71717A',
    marginTop: 1,
  },
  btnReviewNow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E4E4E7',
  },
  btnReviewNowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E2024',
    borderWidth: 1,
    borderColor: '#2E3138',
  },
  reviewedBadgeText: {
    fontSize: 10,
    color: '#D4D4D8',
    fontWeight: '600',
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
    lineHeight: 16,
    fontStyle: 'italic',
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
  modalActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  modalBtnSubmit: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
  },
  modalBtnSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090B',
  },
  starPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  starPickerBtnActive: {
    backgroundColor: '#C5A059',
    borderColor: '#C5A059',
  },
  starPickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C5A059',
  },
  starPickerTextActive: {
    color: '#09090B',
  },
});
