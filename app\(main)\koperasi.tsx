// ============================================================
// Koperasi Screen — Koperasi Bersama Satu Bintang
// Mercedes-Benz Club Indonesia (MB Club INA)
// Fokus Utama: Unit Usaha Simpan Pinjam Komunitas
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
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/services/supabase';
import { LuxuryCard } from '../../src/components/ui/LuxuryCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { MetallicButton } from '../../src/components/ui/MetallicButton';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../src/constants/theme';
import { formatRupiah, formatDateTime } from '../../src/utils/helpers';
import { useAuth, KOP_USER_ID } from '../../src/context/AuthContext';
import type { KoperasiBalance, KoperasiTransaction } from '../../src/types/database.types';

const KOPERASI_LOGO = require('../../assets/images/logo-koperasi.jpg');

// Storage keys baru murni dari Nol (No dummy data)
const KOP_STORAGE_TX = '@mbclub_koperasi_real_txs_v4_zero';
const KOP_STORAGE_BAL = '@mbclub_koperasi_real_bal_v4_zero';

// Data Awal Murni Nol
const ZERO_KOP_BALANCE: KoperasiBalance = {
  id: 'bal_kop_central',
  member_id: KOP_USER_ID,
  simpanan_pokok: 0,
  simpanan_wajib: 0,
  simpanan_sukarela: 0,
  total_balance: 0,
  active_loan: 0,
  loan_remaining: 0,
  updated_at: new Date().toISOString(),
};

// 11 Dewan Pendiri Koperasi Bersama Satu Bintang Resmi
const DEWAN_PENDIRI = [
  'Doddy Moedjito',
  'Raditya Girindra W',
  'Rochady Hendra Setyawan',
  'Cecep Fajar',
  'Dharma Adsas Muda',
  'Herry Priyono',
  'Muhammad Zamzami',
  'James Ibrahim',
  'Mukhwan Hariri',
  'Ady Bhakti Ginandjar',
  'Wendi Kuswandi',
];

export default function KoperasiScreen() {
  const { user, profile } = useAuth();
  const isKopManager = user?.id === KOP_USER_ID;

  const isSponsor = !!(
    user?.id?.startsWith('spn_') ||
    user?.email?.startsWith('sponsor_') ||
    (profile?.email?.includes('mbandro.org') && user?.id !== KOP_USER_ID && profile?.role !== 'admin')
  );

  // Active Tab: 'simpan_pinjam' | 'profil' (Sponsor default ke 'profil')
  const [activeTab, setActiveTab] = useState<'simpan_pinjam' | 'profil'>(
    isSponsor ? 'profil' : 'simpan_pinjam'
  );

  useEffect(() => {
    if (isSponsor) {
      setActiveTab('profil');
    }
  }, [isSponsor]);

  // Balance & Transactions (Default Murni 0)
  const [balance, setBalance] = useState<KoperasiBalance | null>(ZERO_KOP_BALANCE);
  const [transactions, setTransactions] = useState<KoperasiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [showShuModal, setShowShuModal] = useState(false);
  const [showMidModal, setShowMidModal] = useState(false);

  // Form State for Recording Simpan Pinjam
  const [txSubtype, setTxSubtype] = useState<'pokok' | 'wajib' | 'sukarela' | 'talangan' | 'pinjaman' | 'cicilan'>('wajib');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txMemberMid, setTxMemberMid] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);

  const loadData = async () => {
    if (!user) return;

    if (isKopManager) {
      try {
        const rawBal = await AsyncStorage.getItem(KOP_STORAGE_BAL);
        if (rawBal) {
          setBalance(JSON.parse(rawBal));
        } else {
          setBalance(ZERO_KOP_BALANCE);
          await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(ZERO_KOP_BALANCE));
        }

        const rawTx = await AsyncStorage.getItem(KOP_STORAGE_TX);
        if (rawTx) {
          setTransactions(JSON.parse(rawTx));
        } else {
          setTransactions([]);
          await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify([]));
        }
      } catch {
        setBalance(ZERO_KOP_BALANCE);
        setTransactions([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    // Regular member from Supabase
    try {
      const [{ data: b }, { data: t }] = await Promise.all([
        supabase.from('koperasi_balances').select('*').eq('member_id', user.id).maybeSingle(),
        supabase.from('koperasi_transactions').select('*').eq('member_id', user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      setBalance(b ?? ZERO_KOP_BALANCE);
      setTransactions(t ?? []);
    } catch {
      setBalance(ZERO_KOP_BALANCE);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isKopManager]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Reset Semua Data ke Nol (Sesuai Permintaan User)
  const handleResetToZero = () => {
    Alert.alert(
      'Konfirmasi Reset Nol',
      'Apakah Anda yakin ingin mengosongkan seluruh saldo kas dan riwayat transaksi koperasi kembali ke Rp 0?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset ke Nol',
          style: 'destructive',
          onPress: async () => {
            setBalance(ZERO_KOP_BALANCE);
            setTransactions([]);
            await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(ZERO_KOP_BALANCE));
            await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify([]));
            Alert.alert('Berhasil', 'Seluruh data kas dan mutasi simpan pinjam koperasi telah di-reset ke Nol.');
          },
        },
      ]
    );
  };

  // Simpan Transaksi Baru Simpan Pinjam
  const handleSaveTransaction = async () => {
    const numAmount = parseInt(txAmount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Perhatian', 'Masukkan nominal transaksi yang valid.');
      return;
    }
    if (!txDesc.trim()) {
      Alert.alert('Perhatian', 'Keterangan transaksi harus diisi.');
      return;
    }

    setTxSubmitting(true);
    try {
      let mappedType: 'simpanan' | 'pinjaman' | 'cicilan' = 'simpanan';
      if (txSubtype === 'pinjaman' || txSubtype === 'talangan') mappedType = 'pinjaman';
      else if (txSubtype === 'cicilan') mappedType = 'cicilan';

      const labelMap: Record<string, string> = {
        pokok: 'Simpanan Pokok',
        wajib: 'Simpanan Wajib',
        sukarela: 'Simpanan Sukarela',
        talangan: 'Dana Talangan Darurat Servis/Touring',
        pinjaman: 'Pinjaman Lunak Anggota',
        cicilan: 'Angsuran / Cicilan Pinjaman',
      };

      const descriptionFull = txMemberMid.trim()
        ? `[${labelMap[txSubtype]}] MID: ${txMemberMid.trim()} — ${txDesc.trim()}`
        : `[${labelMap[txSubtype]}] ${txDesc.trim()}`;

      const newTx: KoperasiTransaction = {
        id: `tx_kop_${Date.now()}`,
        member_id: KOP_USER_ID,
        type: mappedType,
        amount: numAmount,
        status: 'completed',
        description: descriptionFull,
        reference_number: `TX-KOP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        due_date: null,
        processed_by: KOP_USER_ID,
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify(updatedTxs));

      // Update Saldo Kas
      const current = balance ?? ZERO_KOP_BALANCE;
      let newTotal = current.total_balance;
      let newPokok = current.simpanan_pokok;
      let newWajib = current.simpanan_wajib;
      let newSukarela = current.simpanan_sukarela;
      let newLoan = current.active_loan || 0;

      if (txSubtype === 'pokok') {
        newPokok += numAmount;
        newTotal += numAmount;
      } else if (txSubtype === 'wajib') {
        newWajib += numAmount;
        newTotal += numAmount;
      } else if (txSubtype === 'sukarela') {
        newSukarela += numAmount;
        newTotal += numAmount;
      } else if (txSubtype === 'pinjaman' || txSubtype === 'talangan') {
        newTotal -= numAmount;
        newLoan += numAmount;
      } else if (txSubtype === 'cicilan') {
        newTotal += numAmount;
        newLoan = Math.max(0, newLoan - numAmount);
      }

      const updatedBal: KoperasiBalance = {
        ...current,
        total_balance: newTotal,
        simpanan_pokok: newPokok,
        simpanan_wajib: newWajib,
        simpanan_sukarela: newSukarela,
        active_loan: newLoan,
        loan_remaining: newLoan,
        updated_at: new Date().toISOString(),
      };

      setBalance(updatedBal);
      await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(updatedBal));

      setShowTxModal(false);
      setTxAmount('');
      setTxDesc('');
      setTxMemberMid('');
      Alert.alert('Sukses', `Transaksi ${labelMap[txSubtype]} senilai ${formatRupiah(numAmount)} berhasil dicatat.`);
    } catch (err) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan transaksi.');
    } finally {
      setTxSubmitting(false);
    }
  };

  const TX_ICONS: Record<string, string> = {
    simpanan: 'wallet-outline',
    pinjaman: 'cash-outline',
    cicilan: 'return-up-back-outline',
    dagang: 'storefront-outline',
  };

  const TX_COLORS: Record<string, string> = {
    simpanan: Colors.status.active,
    pinjaman: Colors.status.info,
    cicilan: Colors.status.pending,
    dagang: Colors.brand.gold,
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C5A059" colors={['#C5A059']} />
        }
      >
        {/* Header Bersama Satu Bintang */}
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <Image source={KOPERASI_LOGO} style={styles.koperasiLogo} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Koperasi Bersama Satu Bintang</Text>
              <Text style={styles.subTitle}>Mercedes-Benz Club Indonesia (MB Club INA)</Text>
              <View style={styles.addressTag}>
                <Ionicons name="location-sharp" size={11} color="#C5A059" />
                <Text style={styles.addressTagText} numberOfLines={1}>
                  Office 88 Kota Kasablanka Unit 16B, Jakarta Selatan
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabButton, activeTab === 'simpan_pinjam' && styles.tabButtonActive, isSponsor && { opacity: 0.65 }]}
            onPress={() => {
              if (isSponsor) {
                Alert.alert(
                  'Akses Terkunci 🔒',
                  'Fasilitas Unit Simpan Pinjam Koperasi khusus untuk Member Resmi MB Club Indonesia. Sebagai Mitra Sponsor, Anda hanya diperbolehkan melihat Profil & Informasi Koperasi.'
                );
                return;
              }
              setActiveTab('simpan_pinjam');
            }}
          >
            <Ionicons
              name={isSponsor ? "lock-closed-outline" : "cash-outline"}
              size={15}
              color={activeTab === 'simpan_pinjam' ? (isSponsor ? '#F87171' : '#C5A059') : '#A1A1AA'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'simpan_pinjam' && styles.tabButtonTextActive, isSponsor && { color: '#F87171' }]}>
              Simpan Pinjam {isSponsor ? '(Terkunci)' : ''}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'profil' && styles.tabButtonActive]}
            onPress={() => setActiveTab('profil')}
          >
            <Ionicons
              name="business-outline"
              size={15}
              color={activeTab === 'profil' ? '#C5A059' : '#A1A1AA'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'profil' && styles.tabButtonTextActive]}>
              Profil & Pendiri
            </Text>
          </Pressable>
        </View>

        {/* ============================================================ */}
        {/* TAB 1: UNIT USAHA SIMPAN PINJAM                               */}
        {/* ============================================================ */}
        {activeTab === 'simpan_pinjam' && (
          isSponsor ? (
            <View style={{ paddingVertical: 36, alignItems: 'center', paddingHorizontal: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                <Ionicons name="lock-closed" size={32} color="#F87171" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FAFAFA', textAlign: 'center', marginBottom: 8 }}>
                Akses Simpan Pinjam Terkunci
              </Text>
              <Text style={{ fontSize: 13, color: '#A1A1AA', textAlign: 'center', lineHeight: 22, maxWidth: 340, marginBottom: 20 }}>
                Unit Usaha Simpan Pinjam Koperasi Bersama Satu Bintang khusus diperuntukkan bagi <Text style={{ color: '#FBBF24', fontWeight: '700' }}>Member Resmi MB Club Indonesia</Text>.{'\n\n'}
                Mitra Sponsor hanya dapat melihat informasi struktur & latar belakang Koperasi pada tab <Text style={{ color: '#60A5FA', fontWeight: '700' }}>Profil & Pendiri</Text>.
              </Text>
              <Pressable
                onPress={() => setActiveTab('profil')}
                style={{ backgroundColor: 'rgba(96,165,250,0.15)', borderWidth: 1, borderColor: '#60A5FA', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="business-outline" size={16} color="#60A5FA" />
                <Text style={{ color: '#60A5FA', fontSize: 13, fontWeight: '700' }}>Buka Profil Koperasi</Text>
              </Pressable>
            </View>
          ) : (
            <>
            {/* Manager Alert Banner */}
            {isKopManager && (
              <View style={styles.managerBanner}>
                <Ionicons name="shield-checkmark" size={20} color="#C5A059" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.managerBannerTitle}>PENGELOLA & BENDAHARA SIMPAN PINJAM</Text>
                  <Text style={styles.managerBannerDesc}>
                    Mengelola tabungan sukarela, simpanan pokok & wajib, dana talangan darurat servis/touring, dan pinjaman lunak ber-MID.
                  </Text>
                </View>
                <Pressable onPress={handleResetToZero} style={styles.resetZeroBtn} hitSlop={6}>
                  <Ionicons name="refresh" size={13} color="#EF4444" />
                  <Text style={styles.resetZeroBtnText}>Nol-kan</Text>
                </Pressable>
              </View>
            )}

            {/* Saldo Simpan Pinjam Card */}
            <LuxuryCard variant="gold" style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Ionicons name="wallet-outline" size={22} color={Colors.brand.gold} />
                <Text style={styles.balanceTitle}>
                  {isKopManager ? 'Total Likuiditas Kas Simpan Pinjam' : 'Saldo Simpan Pinjam Anda'}
                </Text>
              </View>

              <Text style={styles.totalBalance}>{formatRupiah(balance?.total_balance ?? 0)}</Text>
              
              <View style={styles.balanceBreakdown}>
                {[
                  { label: isKopManager ? 'Total Simpanan Pokok Anggota' : 'Simpanan Pokok', value: balance?.simpanan_pokok ?? 0 },
                  { label: isKopManager ? 'Total Simpanan Wajib Anggota' : 'Simpanan Wajib', value: balance?.simpanan_wajib ?? 0 },
                  { label: isKopManager ? 'Total Tabungan Sukarela' : 'Tabungan Sukarela', value: balance?.simpanan_sukarela ?? 0 },
                ].map((item) => (
                  <View key={item.label} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                    <Text style={styles.breakdownValue}>{formatRupiah(item.value)}</Text>
                  </View>
                ))}
              </View>

              {/* Pinjaman / Dana Talangan Berjalan */}
              <View style={styles.loanRowBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.loanBoxTitle}>Pinjaman Lunak / Dana Talangan Aktif</Text>
                  <Text style={styles.loanBoxValue}>{formatRupiah(balance?.active_loan ?? 0)}</Text>
                </View>
                <View style={styles.loanStatusBadge}>
                  <Text style={styles.loanStatusBadgeText}>
                    {(balance?.active_loan ?? 0) > 0 ? 'BERJALAN' : 'NIHIL (RP 0)'}
                  </Text>
                </View>
              </View>
            </LuxuryCard>

            {/* 3 Pilar Layanan Simpan Pinjam Utama */}
            <SectionHeader
              title="Pilar Layanan Simpan Pinjam"
              subtitle="Fokus utama pemberdayaan ekonomi anggota MB Club INA"
            />
            <View style={styles.pilarContainer}>
              <View style={styles.pilarCard}>
                <View style={[styles.pilarIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="people-circle-outline" size={24} color="#10B981" />
                </View>
                <Text style={styles.pilarTitle}>Simpan Pinjam Anggota</Text>
                <Text style={styles.pilarDesc}>
                  Tabungan sukarela, simpanan pokok & wajib, dana talangan darurat servis/touring, dan pinjaman lunak khusus member resmi ber-MID.
                </Text>
              </View>

              <View style={styles.pilarCard}>
                <View style={[styles.pilarIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="receipt-outline" size={24} color="#60A5FA" />
                </View>
                <Text style={styles.pilarTitle}>Iuran Pokok & Wajib</Text>
                <Text style={styles.pilarDesc}>
                  Pencatatan otomatis mutasi iuran berkala anggota komunitas, riwayat setoran, e-statement, dan bukti potong elektronik terintegrasi MID.
                </Text>
              </View>

              <View style={styles.pilarCard}>
                <View style={[styles.pilarIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="pie-chart-outline" size={24} color="#FBBF24" />
                </View>
                <Text style={styles.pilarTitle}>Sisa Hasil Usaha (SHU)</Text>
                <Text style={styles.pilarDesc}>
                  Kalkulasi dan distribusi SHU tahunan transparan berbasis persentase modal simpanan seluruh anggota.
                </Text>
              </View>
            </View>

            {/* Aksi Khusus Manager / Anggota */}
            <SectionHeader
              title={isKopManager ? 'Aksi Bendahara Simpan Pinjam' : 'Layanan Anggota'}
            />
            <View style={styles.actionsGrid}>
              {isKopManager ? (
                <>
                  <LuxuryCard
                    onPress={() => {
                      setTxSubtype('wajib');
                      setShowTxModal(true);
                    }}
                    style={styles.actionCard}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="add-circle-outline" size={22} color="#10B981" />
                    </View>
                    <Text style={styles.actionLabel}>Catat Simpanan Kas (+)</Text>
                  </LuxuryCard>

                  <LuxuryCard
                    onPress={() => {
                      setTxSubtype('talangan');
                      setShowTxModal(true);
                    }}
                    style={styles.actionCard}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Ionicons name="arrow-down-circle-outline" size={22} color="#60A5FA" />
                    </View>
                    <Text style={styles.actionLabel}>Pencairan Pinjaman / Talangan (-)</Text>
                  </LuxuryCard>

                  <LuxuryCard
                    onPress={() => {
                      setTxSubtype('cicilan');
                      setShowTxModal(true);
                    }}
                    style={styles.actionCard}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                      <Ionicons name="return-up-back-outline" size={22} color="#FBBF24" />
                    </View>
                    <Text style={styles.actionLabel}>Catat Angsuran Cicilan (+)</Text>
                  </LuxuryCard>

                  <LuxuryCard
                    onPress={() => setShowShuModal(true)}
                    style={styles.actionCard}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                      <Ionicons name="bar-chart-outline" size={22} color="#C084FC" />
                    </View>
                    <Text style={styles.actionLabel}>Kalkulasi & Rekap SHU</Text>
                  </LuxuryCard>
                </>
              ) : (
                <>
                  <LuxuryCard
                    onPress={() => Alert.alert('Setoran Simpanan', 'Transfer setoran simpanan wajib/sukarela ke Bank Mandiri 137-00-1234567-8 a.n. MERCEDES-BENZ CLUB INDONESIA.')}
                    style={styles.actionCard}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="wallet-outline" size={22} color="#10B981" />
                    </View>
                    <Text style={styles.actionLabel}>Setor Simpanan Wajib</Text>
                  </LuxuryCard>

                  <LuxuryCard
                    onPress={() => Alert.alert('Dana Talangan', 'Pengajuan dana talangan darurat servis/touring dapat diajukan oleh member ber-MID aktif kepada Pengurus Koperasi.')}
                    style={styles.actionCard}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Ionicons name="speedometer-outline" size={22} color="#60A5FA" />
                    </View>
                    <Text style={styles.actionLabel}>Dana Talangan Darurat</Text>
                  </LuxuryCard>

                  <LuxuryCard
                    onPress={() => Alert.alert('Pinjaman Lunak', 'Layanan pinjaman lunak anggota berbasis plafon simpanan. Hubungi sekretariat Koperasi MBCI.')}
                    style={styles.actionCard}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                      <Ionicons name="cash-outline" size={22} color="#FBBF24" />
                    </View>
                    <Text style={styles.actionLabel}>Pinjaman Lunak MID</Text>
                  </LuxuryCard>

                  <LuxuryCard
                    onPress={() => setShowMidModal(true)}
                    style={styles.actionCard}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                      <Ionicons name="card-outline" size={22} color="#C084FC" />
                    </View>
                    <Text style={styles.actionLabel}>E-Statement MID</Text>
                  </LuxuryCard>
                </>
              )}
            </View>

            {/* Riwayat Mutasi Simpan Pinjam */}
            <SectionHeader
              title="Jurnal Mutasi Kas Simpan Pinjam"
              subtitle={transactions.length === 0 ? 'Mulai dari Rp 0 (Semua data dummy telah dibersihkan)' : `${transactions.length} mutasi tercatat`}
            />

            {transactions.length === 0 ? (
              <LuxuryCard style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={38} color={Colors.text.tertiary} />
                <Text style={styles.emptyTitle}>Belum Ada Transaksi Kas</Text>
                <Text style={styles.emptyText}>
                  {isKopManager
                    ? 'Seluruh data dummy telah dihapus. Saldo dan pembukuan saat ini murni dari Nol (Rp 0). Gunakan tombol di atas untuk mencatat mutasi kas riil.'
                    : 'Belum ada mutasi simpan pinjam tercatat untuk akun Anda.'}
                </Text>
              </LuxuryCard>
            ) : (
              transactions.map((tx: KoperasiTransaction) => (
                <LuxuryCard key={tx.id} style={styles.txCard} padding={12}>
                  <View style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: `${TX_COLORS[tx.type] ?? Colors.brand.gold}18` }]}>
                      <Ionicons name={(TX_ICONS[tx.type] ?? 'ellipse-outline') as any} size={20} color={TX_COLORS[tx.type] ?? Colors.brand.gold} />
                    </View>
                    <View style={styles.txInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.txType}>{tx.type.toUpperCase()}</Text>
                        {tx.reference_number && (
                          <Text style={styles.txRef}>{tx.reference_number}</Text>
                        )}
                      </View>
                      <Text style={styles.txDate}>{formatDateTime(tx.created_at)}</Text>
                      {tx.description && <Text style={styles.txDesc} numberOfLines={2}>{tx.description}</Text>}
                    </View>
                    <View style={styles.txRight}>
                      <Text style={[styles.txAmount, { color: TX_COLORS[tx.type] ?? Colors.brand.gold }]}>
                        {tx.type === 'simpanan' || tx.type === 'cicilan' ? '+' : '-'}{formatRupiah(tx.amount)}
                      </Text>
                      <View style={[
                        styles.txStatus,
                        { backgroundColor: tx.status === 'completed' ? `${Colors.status.active}18` : `${Colors.status.pending}18` }
                      ]}>
                        <Text style={[styles.txStatusText, { color: tx.status === 'completed' ? Colors.status.active : Colors.status.pending }]}>
                          {tx.status === 'completed' ? 'Selesai' : 'Proses'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </LuxuryCard>
              ))
            )}
          </>
          )
        )}

        {/* ============================================================ */}
        {/* TAB 2: PROFIL, VISI MISI & 11 DEWAN PENDIRI KOPERASI         */}
        {/* ============================================================ */}
        {activeTab === 'profil' && (
          <View style={{ gap: Spacing.base }}>
            {/* Banner Pengantar */}
            <View style={styles.profilIntroBox}>
              <Ionicons name="sparkles" size={18} color="#C5A059" />
              <Text style={styles.profilIntroText}>
                Wadah ekonomi gotong royong resmi komunitas Mercedes-Benz Club Indonesia untuk mewadahi potensi ekonomi lebih dari 5.000 anggota dari 110 klub di seluruh penjuru nusantara.
              </Text>
            </View>

            {/* Visi Utama */}
            <LuxuryCard variant="outlined" style={styles.infoCardBlock} padding={16}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="compass-outline" size={20} color="#C5A059" />
                <Text style={styles.cardBlockTitle}>Visi Utama</Text>
              </View>
              <Text style={styles.cardBlockSubtitle}>Arah & Komitmen Jangka Panjang</Text>
              <Text style={styles.cardBlockContent}>
                "Menjadi koperasi komunitas otomotif yang profesional, terpercaya, mandiri, dan mampu memberikan manfaat ekonomi maksimal berkelanjutan bagi seluruh anggota Mercedes-Benz Club Indonesia."
              </Text>
            </LuxuryCard>

            {/* Misi Strategis */}
            <LuxuryCard variant="outlined" style={styles.infoCardBlock} padding={16}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="rocket-outline" size={20} color="#60A5FA" />
                <Text style={styles.cardBlockTitle}>Misi Strategis</Text>
              </View>
              <Text style={styles.cardBlockSubtitle}>Langkah Nyata Pemberdayaan</Text>
              <Text style={styles.cardBlockContent}>
                "Meningkatkan kesejahteraan anggota melalui tata kelola modern, layanan simpan pinjam terpercaya, unit usaha pengadaan suku cadang resmi, bengkel rekanan, dan pembagian Sisa Hasil Usaha (SHU) yang transparan."
              </Text>
            </LuxuryCard>

            {/* Dewan Pendiri Koperasi (11 Member Resmi) */}
            <LuxuryCard variant="gold" style={styles.infoCardBlock} padding={16}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="shield-outline" size={20} color={Colors.brand.gold} />
                <Text style={styles.cardBlockTitle}>Dewan Pendiri Koperasi</Text>
              </View>
              <Text style={styles.cardBlockSubtitle}>Perwakilan Member Resmi MB Club INA</Text>

              <View style={styles.founderGrid}>
                {DEWAN_PENDIRI.map((nama, idx) => (
                  <View key={idx} style={styles.founderItem}>
                    <View style={styles.founderBadgeNum}>
                      <Text style={styles.founderNumText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.founderName}>{nama}</Text>
                  </View>
                ))}
              </View>
            </LuxuryCard>

            {/* Gagasan & Latar Belakang Pendirian */}
            <LuxuryCard variant="outlined" style={styles.infoCardBlock} padding={16}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="bulb-outline" size={20} color="#FBBF24" />
                <Text style={styles.cardBlockTitle}>Gagasan & Latar Belakang Pendirian</Text>
              </View>
              <Text style={styles.historyParagraph}>
                Koperasi Bersama Satu Bintang diinisiasi dan diluncurkan pada awal Desember 2025 berkat dorongan langsung Menteri Koperasi Republik Indonesia Ferry Juliantono (sekaligus Ketua Dewan Kehormatan Mercedes-Benz Club Indonesia). Keberadaan koperasi ini bertujuan untuk mengkonsolidasikan kekuatan perputaran ekonomi dan daya beli dari lebih dari 5.000 anggota di bawah naungan MB Club INA.
              </Text>

              <View style={styles.dividerSub} />

              <Text style={styles.subSectionTitle}>Momen Bersejarah Peluncuran:</Text>
              <Text style={styles.historyParagraph}>
                Ide pendirian koperasi ini diumumkan secara resmi menjelang perhelatan akbar Jambore Nasional (Jamnas) ke-20 Mercedes-Benz Club Indonesia di Bandung, Jawa Barat, pada awal Desember 2025 dengan dukungan penuh Kementerian Koperasi sebagai role model koperasi komunitas otomotif nasional berbadan hukum legal.
              </Text>

              <View style={styles.dividerSub} />

              <Text style={styles.subSectionTitle}>Rencana & Fokus Pengembangan Usaha:</Text>
              <Text style={styles.historyParagraph}>
                Fokus pengembangan usaha diarahkan pada kebutuhan riil anggota komunitas, meliputi pengadaan bengkel khusus, penyediaan suku cadang (spare part) resmi atau pendukung Mercedes-Benz berdiskon, oli perawatan, serta dana talangan perbaikan mendesak.
              </Text>
            </LuxuryCard>

            {/* Sekretariat Resmi */}
            <LuxuryCard variant="outlined" style={styles.infoCardBlock} padding={16}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="location-outline" size={20} color="#10B981" />
                <Text style={styles.cardBlockTitle}>Sekretariat Resmi Koperasi</Text>
              </View>
              <Text style={styles.addressOffice}>
                Office 88, Tower A, 16th Floor, Unit 16B{'\n'}
                Kota Kasablanka, Jl. Casablanca Raya Kav. 88{'\n'}
                Jakarta Selatan 12870, DKI Jakarta
              </Text>
              <View style={styles.bankInfoBox}>
                <Ionicons name="card" size={16} color="#C5A059" />
                <Text style={styles.bankInfoText}>
                  Rekening Kas Simpan Pinjam:{'\n'}
                  Bank Mandiri 137-00-1234567-8{'\n'}
                  a.n. MERCEDES-BENZ CLUB INDONESIA
                </Text>
              </View>
            </LuxuryCard>
          </View>
        )}

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* ── MODAL 1: CATAT TRANSAKSI KAS SIMPAN PINJAM (BENDAHARA) ──── */}
      <Modal visible={showTxModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Catat Kas Simpan Pinjam</Text>
                <Text style={styles.modalSubtitle}>Koperasi Bersama Satu Bintang</Text>
              </View>
              <Pressable onPress={() => setShowTxModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#E4E4E7" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Subtype Selector */}
              <Text style={styles.inputLabel}>Klasifikasi Simpan Pinjam</Text>
              <View style={styles.typeSelectorRow}>
                {[
                  { key: 'pokok', label: 'Simpanan Pokok (+)' },
                  { key: 'wajib', label: 'Simpanan Wajib (+)' },
                  { key: 'sukarela', label: 'Tabungan Sukarela (+)' },
                  { key: 'talangan', label: 'Dana Talangan Servis (-)' },
                  { key: 'pinjaman', label: 'Pinjaman Lunak (-)' },
                  { key: 'cicilan', label: 'Angsuran Cicilan (+)' },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.typeSelectorPill,
                      txSubtype === item.key && styles.typeSelectorPillActive,
                    ]}
                    onPress={() => setTxSubtype(item.key as any)}
                  >
                    <Text
                      style={[
                        styles.typeSelectorText,
                        txSubtype === item.key && styles.typeSelectorTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* MID Member Input (Optional) */}
              <Text style={styles.inputLabel}>Nomor MID / KTA Anggota (Opsional)</Text>
              <TextInput
                style={styles.modalInput}
                value={txMemberMid}
                onChangeText={setTxMemberMid}
                placeholder="Contoh: MBINA-JKT-2026-000001"
                placeholderTextColor="#71717A"
                autoCapitalize="characters"
              />

              {/* Amount Input */}
              <Text style={styles.inputLabel}>Nominal (Rp)</Text>
              <TextInput
                style={styles.modalInput}
                value={txAmount}
                onChangeText={setTxAmount}
                placeholder="Contoh: 500000"
                placeholderTextColor="#71717A"
                keyboardType="numeric"
              />

              {/* Description Input */}
              <Text style={styles.inputLabel}>Keterangan / Nama Anggota</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMulti]}
                value={txDesc}
                onChangeText={setTxDesc}
                placeholder="Contoh: Iuran Simpanan Wajib Bulan September (Budi)"
                placeholderTextColor="#71717A"
                multiline
                numberOfLines={3}
              />

              <View style={{ height: 16 }} />

              <MetallicButton
                label={txSubmitting ? 'Menyimpan...' : 'Simpan Transaksi Kas'}
                onPress={handleSaveTransaction}
                variant="gold"
                size="lg"
              />
              <View style={{ height: 10 }} />
              <Pressable onPress={() => setShowTxModal(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: KALKULASI & REKAPITULASI SHU ────────────────────── */}
      <Modal visible={showShuModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Sisa Hasil Usaha (SHU)</Text>
                <Text style={styles.modalSubtitle}>Koperasi Bersama Satu Bintang</Text>
              </View>
              <Pressable onPress={() => setShowShuModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#E4E4E7" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.reportSummaryBox}>
                <Text style={styles.reportSummaryTitle}>ESTIMASI SHU TAHUNAN</Text>
                <Text style={styles.reportSummaryAmount}>Rp 0</Text>
                <Text style={styles.reportSummarySubtitle}>Dimulai murni dari Nol (Buku 2026)</Text>
              </View>

              <View style={styles.reportDetailSection}>
                <Text style={styles.reportSectionHeader}>SKEMA DISTRIBUSI SHU RESMI:</Text>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>• Jasa Modal Simpanan Anggota</Text>
                  <Text style={styles.reportRowVal}>40%</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>• Jasa Partisipasi Transaksi/Pinjaman</Text>
                  <Text style={styles.reportRowVal}>30%</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>• Cadangan Modal Koperasi</Text>
                  <Text style={styles.reportRowVal}>20%</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>• Dana Pendidikan & Sosial Komunitas</Text>
                  <Text style={styles.reportRowVal}>10%</Text>
                </View>
              </View>

              <View style={{ height: 16 }} />
              <MetallicButton
                label="Tutup Rincian SHU"
                onPress={() => setShowShuModal(false)}
                variant="silver"
                size="md"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: E-STATEMENT MID ANGGOTA ────────────────────────── */}
      <Modal visible={showMidModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>E-Statement MID Anggota</Text>
                <Text style={styles.modalSubtitle}>Integrasi Nomor Keanggotaan MB Club INA</Text>
              </View>
              <Pressable onPress={() => setShowMidModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#E4E4E7" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.midInfoBox}>
                <Ionicons name="information-circle" size={22} color="#60A5FA" />
                <Text style={styles.midInfoText}>
                  Setiap setoran simpanan pokok, simpanan wajib, dan angsuran pinjaman tercatat secara otomatis pada buku besar terintegrasi nomor MID resmi Anda.
                </Text>
              </View>

              <View style={styles.reportDetailSection}>
                <Text style={styles.reportSectionHeader}>STATUS IURAN & SIMPANAN:</Text>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Simpanan Pokok (Awal Masuk)</Text>
                  <Text style={styles.reportRowVal}>Rp 0</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Simpanan Wajib (Bulanan)</Text>
                  <Text style={styles.reportRowVal}>Rp 0</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Tabungan Sukarela</Text>
                  <Text style={styles.reportRowVal}>Rp 0</Text>
                </View>
              </View>

              <View style={{ height: 16 }} />
              <MetallicButton
                label="Tutup E-Statement"
                onPress={() => setShowMidModal(false)}
                variant="silver"
                size="md"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.base },
  header: { paddingVertical: Spacing.base },
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  koperasiLogo: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: Colors.brand.gold },
  title: { fontSize: 18, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  subTitle: { fontSize: 11, color: Colors.brand.gold, fontWeight: Typography.weight.semibold, marginTop: 1 },
  addressTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  addressTagText: { fontSize: 10, color: '#A1A1AA', flex: 1 },

  // Tab Switcher
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.sm,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  tabButtonTextActive: {
    color: '#C5A059',
    fontWeight: '700',
  },

  managerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  managerBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C5A059',
    letterSpacing: 0.5,
  },
  managerBannerDesc: {
    fontSize: 11,
    color: '#D4D4D8',
    marginTop: 2,
    lineHeight: 15,
  },
  resetZeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resetZeroBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },

  balanceCard: { marginBottom: Spacing.base },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  balanceTitle: { fontSize: Typography.base, color: Colors.brand.gold, fontWeight: Typography.weight.semibold },
  totalBalance: { fontSize: 32, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.base },
  balanceBreakdown: { gap: Spacing.xs },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.2)' },
  breakdownLabel: { fontSize: Typography.sm, color: Colors.text.tertiary },
  breakdownValue: { fontSize: Typography.sm, color: Colors.text.secondary, fontWeight: Typography.weight.medium },

  loanRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 10,
    borderRadius: Radius.sm,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  loanBoxTitle: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  loanBoxValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E4E4E7',
    marginTop: 1,
  },
  loanStatusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  loanStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A1A1AA',
  },

  // 3 Pilar Container
  pilarContainer: {
    gap: 10,
    marginBottom: Spacing.base,
  },
  pilarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pilarIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pilarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pilarDesc: {
    fontSize: 11,
    color: '#A1A1AA',
    lineHeight: 16,
  },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  actionCard: { width: '47%', alignItems: 'center', gap: Spacing.sm },
  actionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, color: Colors.text.secondary, fontWeight: Typography.weight.semibold, textAlign: 'center' },

  emptyCard: { alignItems: 'center', paddingVertical: Spacing['2xl'], paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: 4 },
  emptyText: { fontSize: 12, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 18 },

  txCard: { marginBottom: Spacing.sm },
  txRow: { flexDirection: 'row', alignItems: 'center' },
  txIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  txInfo: { flex: 1 },
  txType: { fontSize: 12, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  txRef: { fontSize: 9, color: '#A1A1AA', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  txDate: { fontSize: 10, color: Colors.text.tertiary, marginTop: 1 },
  txDesc: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 12.5, fontWeight: Typography.weight.bold },
  txStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  txStatusText: { fontSize: 9.5, fontWeight: Typography.weight.semibold },

  // Profil Tab Styles
  profilIntroBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
    borderRadius: Radius.md,
    padding: 14,
  },
  profilIntroText: {
    fontSize: 12,
    color: '#E4E4E7',
    flex: 1,
    lineHeight: 18,
  },
  infoCardBlock: {
    marginBottom: Spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardBlockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cardBlockSubtitle: {
    fontSize: 11,
    color: '#C5A059',
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBlockContent: {
    fontSize: 12,
    color: '#D4D4D8',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // 11 Dewan Pendiri
  founderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  founderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  founderBadgeNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(197, 160, 89, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C5A059',
  },
  founderNumText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C5A059',
  },
  founderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },

  historyParagraph: {
    fontSize: 11.5,
    color: '#D4D4D8',
    lineHeight: 17,
  },
  dividerSub: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 10,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C5A059',
    marginBottom: 4,
  },

  addressOffice: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 18,
    fontWeight: '500',
  },
  bankInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bankInfoText: {
    fontSize: 11,
    color: '#D4D4D8',
    lineHeight: 16,
    flex: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#C5A059',
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4D4D8',
    marginBottom: 5,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalInputMulti: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  typeSelectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeSelectorPillActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.2)',
    borderColor: '#C5A059',
  },
  typeSelectorText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  typeSelectorTextActive: {
    color: '#C5A059',
    fontWeight: '700',
  },
  modalCancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    color: '#A1A1AA',
  },

  reportSummaryBox: {
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    alignItems: 'center',
    marginBottom: 14,
  },
  reportSummaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C5A059',
    letterSpacing: 0.5,
  },
  reportSummaryAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  reportSummarySubtitle: {
    fontSize: 10.5,
    color: '#A1A1AA',
  },
  reportDetailSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reportSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C5A059',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  reportRowLabel: {
    fontSize: 11.5,
    color: '#D4D4D8',
  },
  reportRowVal: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  midInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    marginBottom: 12,
  },
  midInfoText: {
    fontSize: 11,
    color: '#D4D4D8',
    flex: 1,
    lineHeight: 16,
  },
});
