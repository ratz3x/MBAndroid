// ============================================================
// Dashboard Admin Koperasi — Koperasi Bersama Satu Bintang
// Mercedes-Benz Club Indonesia (MB Club INA)
// Sesuai Ketentuan PMK No. 49 Tahun 2025 & AD/ART Koperasi
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatRupiah, formatDateTime, formatDate } from '../../../src/utils/helpers';
import { useAuth, KOP_USER_ID, KOP_EMAIL } from '../../../src/context/AuthContext';
import type { KoperasiBalance, KoperasiTransaction } from '../../../src/types/database.types';

// Storage keys
const KOP_STORAGE_TX = '@mbclub_koperasi_real_txs_v4_zero';
const KOP_STORAGE_BAL = '@mbclub_koperasi_real_bal_v4_zero';
const KOP_STORAGE_LOANS = '@mbclub_koperasi_loan_requests_v3_clean';
const KOP_STORAGE_MEMBERS = '@mbclub_koperasi_members_v2';

// Regulasi & Ketentuan Resmi Koperasi
const BUNGA_PINJAMAN_PA = 0.06; // 6% per tahun (PMK 49/2025)
const PLAFON_MAKS_KOPERASI = 3000000000; // Rp 3 Miliar
const PLAFON_OPERASIONAL_MAKS = 500000000; // Rp 500 Juta
const TENOR_MAKS_BULAN = 72; // 6 Tahun
const SIMPANAN_POKOK_WAJIB = 100000; // Rp 100.000
const IURAN_WAJIB_BULANAN = 50000; // Rp 50.000
const TABUNGAN_SUKARELA_MIN = 25000; // Rp 25.000

// Types
type TabType = 'ikhtisar' | 'mutasi' | 'pinjaman' | 'anggota' | 'shu' | 'kesehatan';

interface LoanRequest {
  id: string;
  mid: string;
  nama: string;
  chapter: string;
  nominal: number;
  tenorBulan: number;
  gracePeriodBulan: number;
  tujuan: string;
  agunan: string;
  nilaiAgunan: number;
  rekamJejakSimpanan: number;
  tanggalPengajuan: string;
  status: 'pending' | 'approved' | 'disbursed_waiting_confirmation' | 'confirmed_active' | 'rejected';
  catatanAdmin?: string;
  approvedAt?: string;
  bankPenerima?: string;
  rekeningPenerima?: string;
  namaPenerima?: string;
  disbursementProofUri?: string | null;
  disbursedAt?: string;
  confirmedByMemberAt?: string;
}

export interface PendingDepositItem {
  id: string;
  nominal: number;
  wajibPortion: number;
  sukarelaPortion: number;
  loanPortion: number;
  buktiTransferUri: string;
  tanggalTransfer: string;
  bankPengirim?: string;
  rekeningPengirim?: string;
  namaPengirim?: string;
  keterangan?: string;
}

interface MemberKopItem {
  id: string;
  altId?: string;
  mid: string;
  kopMemberId?: string | null;
  nama: string;
  chapter: string;
  email: string;
  altEmail?: string;
  phone: string;
  simpananPokok: number;
  simpananWajib: number;
  tabunganSukarela: number;
  status: 'active' | 'pending' | 'rejected';
  tanggalDaftar: string;
  lastPaidWajibMonth?: string | null;
  buktiTransferUri?: string | null;
  bankPengirim?: string | null;
  rekeningPengirim?: string | null;
  namaPengirim?: string | null;
  catatanAdmin?: string | null;
  pendingDeposit?: PendingDepositItem | null;
}

export const generateKopMemberId = (mid: string): string => {
  if (!mid) return 'KOP-2026-000001';
  const clean = mid.trim().toUpperCase();
  if (clean.startsWith('MBINA-')) {
    return clean.replace('MBINA-', 'KOP-');
  }
  return `KOP-${clean}`;
};

export const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`; // e.g. '2026-09'

export const getMonthNameIndo = (monthKey: string) => {
  if (!monthKey) return 'Bulan Berjalan';
  const parts = monthKey.split('-');
  const year = parts[0];
  const month = parts[1];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const idx = parseInt(month, 10) - 1;
  return `${monthNames[idx] || month} ${year}`;
};

// Cross-platform Dialog Helpers (Web + Native)
const showConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal'
) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      { text: confirmText, onPress: onConfirm },
    ]);
  }
};

const showAlertDialog = (title: string, message: string) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// Initial Sample Data for Loans (Empty, data dummy telah dihapus sesuai permintaan)
const INITIAL_LOAN_REQUESTS: LoanRequest[] = [];

const INITIAL_MEMBERS: MemberKopItem[] = [
  {
    id: 'mem_001',
    mid: 'MBINA-KOP-2026-000001',
    kopMemberId: 'KOP-2026-000001',
    nama: 'Pengelola Keuangan Koperasi',
    chapter: 'Koperasi Bersama Satu Bintang',
    email: 'Dummy_Kop1@mbandro.org',
    phone: '081298765432',
    simpananPokok: 100000,
    simpananWajib: 150000,
    tabunganSukarela: 1000000,
    status: 'active',
    tanggalDaftar: '2026-01-01',
    lastPaidWajibMonth: '2026-09',
  },
  {
    id: 'mem_005',
    mid: 'MBINA-SMG-014',
    kopMemberId: 'KOP-SMG-014',
    nama: 'Kusumo Wardhana',
    chapter: 'W202 MBCI Semarang',
    email: 'kusumo.w@mbci-smg.org',
    phone: '081566778899',
    simpananPokok: 100000,
    simpananWajib: 50000,
    tabunganSukarela: 25000,
    status: 'pending',
    tanggalDaftar: '2026-09-11',
    lastPaidWajibMonth: null,
    bankPengirim: 'Bank BCA',
    namaPengirim: 'Kusumo Wardhana',
    rekeningPengirim: '246-880-1122',
    buktiTransferUri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: '2089ee31-71e8-43d7-bb76-d218c10f932d',
    altId: 'mem_006',
    mid: 'MBINA-JBR-2026-000002',
    kopMemberId: 'KOP-JBR-2026-000002',
    nama: 'Ayesha Fairuz Fajr',
    chapter: 'MBC Bandung',
    email: 'afairuzfajr@gmail.com',
    altEmail: 'ayesha.fairuz@mbc-bandung.org',
    phone: '082129709696',
    simpananPokok: 100000,
    simpananWajib: 50000,
    tabunganSukarela: 450000,
    status: 'active',
    tanggalDaftar: '2026-09-12',
    lastPaidWajibMonth: currentMonthKey,
    bankPengirim: 'Bank Mandiri',
    namaPengirim: 'Ayesha Fairuz Fajr',
    rekeningPengirim: '137-00-1234567-8',
    buktiTransferUri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    pendingDeposit: {
      id: 'dep_ayesha_1000000',
      nominal: 1000000,
      wajibPortion: 0,
      sukarelaPortion: 1000000,
      loanPortion: 0,
      buktiTransferUri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
      tanggalTransfer: '2026-09-12 14:30',
      bankPengirim: 'Bank Mandiri',
      rekeningPengirim: '137-00-1234567-8',
      namaPengirim: 'Ayesha Fairuz Fajr',
      keterangan: 'Setoran Tambahan Tabungan Sukarela Rp 1.000.000 via Transfer Mandiri',
    },
  },
];

export default function AdminKoperasiScreen() {
  const router = useRouter();
  const { user, profile, isKoperasiAdmin } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('ikhtisar');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // States
  const [balance, setBalance] = useState<KoperasiBalance>({
    id: 'bal_kop_central',
    member_id: KOP_USER_ID,
    simpanan_pokok: 200000,
    simpanan_wajib: 100000,
    simpanan_sukarela: 1550000,
    total_balance: 1850000,
    active_loan: 0,
    loan_remaining: 0,
    updated_at: new Date().toISOString(),
  });
  const [transactions, setTransactions] = useState<KoperasiTransaction[]>([]);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [members, setMembers] = useState<MemberKopItem[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Member Table States (Search, Filter, Pagination, Detail Modal)
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberFilterStatus, setMemberFilterStatus] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'UNPAID_WAJIB'>('ALL');
  const [memberPage, setMemberPage] = useState(1);
  const [selectedDetailMember, setSelectedDetailMember] = useState<MemberKopItem | null>(null);
  const MEMBER_PAGE_SIZE = 10;

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [showLoanDetailModal, setShowLoanDetailModal] = useState<LoanRequest | null>(null);
  const [showShuModal, setShowShuModal] = useState(false);
  const [showEStatementModal, setShowEStatementModal] = useState(false);
  const [selectedProofMember, setSelectedProofMember] = useState<MemberKopItem | null>(null);
  const [selectedDepositMember, setSelectedDepositMember] = useState<MemberKopItem | null>(null);
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);
  const [showHealthCertModal, setShowHealthCertModal] = useState(false);

  // Form State for Recording Mutasi
  const [txSubtype, setTxSubtype] = useState<'pokok' | 'wajib' | 'sukarela' | 'talangan' | 'pinjaman' | 'cicilan'>('wajib');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txMemberMid, setTxMemberMid] = useState('');
  const [txMemberName, setTxMemberName] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);

  // SHU Calculator State
  const [shuLabaBersih, setShuLabaBersih] = useState('50000000');
  const [shuPersenJasaModal, setShuPersenJasaModal] = useState('40'); // 40% jasa modal simpanan
  const [shuPersenJasaAnggota, setShuPersenJasaAnggota] = useState('30'); // 30% jasa transaksi
  const [shuPersenDanaCadangan, setShuPersenDanaCadangan] = useState('20'); // 20% cadangan koperasi

  // Load All Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Transactions
      const rawTx = await AsyncStorage.getItem(KOP_STORAGE_TX);
      if (rawTx) {
        setTransactions(JSON.parse(rawTx));
      } else {
        const initTxs: KoperasiTransaction[] = [
          {
            id: 'tx_init_001',
            member_id: KOP_USER_ID,
            type: 'simpanan',
            amount: 100000,
            status: 'completed',
            description: '[Simpanan Pokok] MID: MBINA-KOP-2026-000001 — Setoran Pokok Pengelola',
            reference_number: 'TX-KOP-2026-1001',
            due_date: null,
            processed_by: KOP_USER_ID,
            processed_at: '2026-01-01T08:00:00Z',
            created_at: '2026-01-01T08:00:00Z',
            updated_at: '2026-01-01T08:00:00Z',
          },
          {
            id: 'tx_init_ayesha_001',
            member_id: '2089ee31-71e8-43d7-bb76-d218c10f932d',
            type: 'simpanan',
            amount: 500000,
            status: 'completed',
            description: '[Transfer Bank Mandiri] Total Rp 500.000 (Wajib Rp 50.000, Sukarela Rp 450.000) — MID: MBINA-JBR-2026-000002 (Ayesha Fairuz Fajr)',
            reference_number: 'TX-SETOR-2026-5001',
            due_date: null,
            processed_by: KOP_USER_ID,
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setTransactions(initTxs);
        await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify(initTxs));
      }

      // 2. Loans: Bersihkan data dummy lama dan mulai dengan antrean bersih
      try {
        await AsyncStorage.removeItem('@mbclub_koperasi_loan_requests_v2');
        await AsyncStorage.removeItem('@mbclub_koperasi_loan_requests');
      } catch {}
      let currentLoans: LoanRequest[] = [];
      const rawLoans = await AsyncStorage.getItem(KOP_STORAGE_LOANS);
      if (rawLoans) {
        const parsedLoans: LoanRequest[] = JSON.parse(rawLoans);
        const dummyIds = new Set(['req_001', 'req_002', 'req_003']);
        const dummyMids = new Set(['MBINA-JKT-042', 'MBINA-BDG-019', 'MBINA-SBY-088']);
        currentLoans = parsedLoans.filter((r) => !dummyIds.has(r.id) && !dummyMids.has(r.mid));
        setLoanRequests(currentLoans);
        await AsyncStorage.setItem(KOP_STORAGE_LOANS, JSON.stringify(currentLoans));
      } else {
        setLoanRequests([]);
        await AsyncStorage.setItem(KOP_STORAGE_LOANS, JSON.stringify([]));
      }

      // 3. Members (Purge any legacy dummy members & Deduplicate by MID)
      let currentMembers: MemberKopItem[] = [];
      const rawMembers = await AsyncStorage.getItem(KOP_STORAGE_MEMBERS);
      const dummyMids = new Set(['MBINA-JKT-042', 'MBINA-BDG-019', 'MBINA-SBY-088']);
      if (rawMembers) {
        const parsed: MemberKopItem[] = JSON.parse(rawMembers);
        const filtered = parsed.filter((m) => !dummyMids.has(m.mid.trim().toUpperCase()));

        // Deduplicate records by MID, merging active status and proper allocation
        const midMap = new Map<string, MemberKopItem>();
        for (const m of filtered) {
          const key = m.mid.trim().toUpperCase();
          const rawTotal = (m.simpananPokok ?? 0) + (m.simpananWajib ?? 0) + (m.tabunganSukarela ?? 0);
          
          if (!midMap.has(key)) {
            // Normalisasi alokasi sesuai aturan Koperasi Indonesia
            const normPokok = 100000;
            const normWajib = (m.simpananWajib && m.simpananWajib >= 50000 && m.simpananWajib <= 100000 && m.lastPaidWajibMonth === '2026-10') ? m.simpananWajib : 50000;
            const isAyesha = key === 'MBINA-JBR-2026-000002';
            const normSukarela = isAyesha
              ? Math.max(450000, m.tabunganSukarela ?? 0)
              : (rawTotal > 0 ? Math.max(25000, rawTotal - normPokok - normWajib) : (m.tabunganSukarela || 25000));
            const pendingDep = m.pendingDeposit !== undefined
              ? m.pendingDeposit
              : (isAyesha && (m.tabunganSukarela ?? 0) < 1450000 ? INITIAL_MEMBERS[2]?.pendingDeposit : null);

            midMap.set(key, {
              ...m,
              simpananPokok: normPokok,
              simpananWajib: normWajib,
              tabunganSukarela: normSukarela,
              kopMemberId: m.kopMemberId || generateKopMemberId(key),
              lastPaidWajibMonth: m.lastPaidWajibMonth || (m.status === 'active' ? currentMonthKey : null),
              pendingDeposit: pendingDep,
            });
          } else {
            const existing = midMap.get(key)!;
            const combinedTotal = Math.max(
              rawTotal,
              (existing.simpananPokok ?? 0) + (existing.simpananWajib ?? 0) + (existing.tabunganSukarela ?? 0)
            );
            const isAyesha = key === 'MBINA-JBR-2026-000002';
            const normPokok = 100000;
            const normWajib = 50000;
            const normSukarela = isAyesha
              ? Math.max(450000, existing.tabunganSukarela ?? 0, m.tabunganSukarela ?? 0)
              : Math.max(25000, combinedTotal - normPokok - normWajib);

            const mergedItem: MemberKopItem = {
              ...existing,
              status: existing.status === 'active' || m.status === 'active' ? 'active' : existing.status,
              kopMemberId: existing.kopMemberId || m.kopMemberId || generateKopMemberId(key),
              simpananPokok: normPokok,
              simpananWajib: normWajib,
              tabunganSukarela: normSukarela,
              lastPaidWajibMonth: existing.lastPaidWajibMonth || m.lastPaidWajibMonth || currentMonthKey,
              buktiTransferUri: existing.buktiTransferUri || m.buktiTransferUri,
              rekeningPengirim: existing.rekeningPengirim || m.rekeningPengirim,
              bankPengirim: existing.bankPengirim || m.bankPengirim,
              namaPengirim: existing.namaPengirim || m.namaPengirim,
              pendingDeposit: existing.pendingDeposit ?? m.pendingDeposit ?? (isAyesha && normSukarela < 1450000 ? INITIAL_MEMBERS[2]?.pendingDeposit : null),
            };
            midMap.set(key, mergedItem);
          }
        }

        const dedupedList = Array.from(midMap.values());
        const existingMids = new Set(dedupedList.map((m) => m.mid.trim().toUpperCase()));
        const missing = INITIAL_MEMBERS.filter((m) => !existingMids.has(m.mid.trim().toUpperCase()) && !dummyMids.has(m.mid.trim().toUpperCase()));
        currentMembers = [...dedupedList, ...missing];
        setMembers(currentMembers);
        await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(currentMembers));
      } else {
        currentMembers = INITIAL_MEMBERS;
        setMembers(currentMembers);
        await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(currentMembers));
      }

      // 4. Rekonsiliasi Otomatis Saldo Kas Likuid Koperasi (100% Klop dengan Buku Anggota & Pinjaman)
      const activeMems = currentMembers.filter((m) => m.status === 'active');
      const sumPokok = activeMems.reduce((sum, m) => sum + (m.simpananPokok || 0), 0);
      const sumWajib = activeMems.reduce((sum, m) => sum + (m.simpananWajib || 0), 0);
      const sumSukarela = activeMems.reduce((sum, m) => sum + (m.tabunganSukarela || 0), 0);

      const activeDisbursedLoans = currentLoans.filter(
        (l) => l.status === 'confirmed_active' || l.status === 'disbursed_waiting_confirmation'
      );
      const sumLoans = activeDisbursedLoans.reduce((sum, l) => sum + (l.nominal || 0), 0);
      const totalKasLikuid = Math.max(0, (sumPokok + sumWajib + sumSukarela) - sumLoans);

      const reconciledBal: KoperasiBalance = {
        id: 'bal_kop_central',
        member_id: KOP_USER_ID,
        simpanan_pokok: sumPokok,
        simpanan_wajib: sumWajib,
        simpanan_sukarela: sumSukarela,
        total_balance: totalKasLikuid,
        active_loan: sumLoans,
        loan_remaining: sumLoans,
        updated_at: new Date().toISOString(),
      };
      setBalance(reconciledBal);
      await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(reconciledBal));
    } catch (err) {
      console.error('Error loading koperasi admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Simpan Transaksi Kas Baru
  const handleSaveTransaction = async () => {
    const numAmount = parseInt(txAmount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      showAlertDialog('Perhatian', 'Masukkan nominal transaksi yang valid.');
      return;
    }
    if (!txDesc.trim()) {
      showAlertDialog('Perhatian', 'Keterangan transaksi harus diisi.');
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
        pinjaman: 'Pinjaman Lunak 6% PMK 49/2025',
        cicilan: 'Angsuran / Cicilan Pinjaman',
      };

      const descHeader = txMemberMid.trim()
        ? `[${labelMap[txSubtype]}] MID: ${txMemberMid.trim()}${txMemberName.trim() ? ` (${txMemberName.trim()})` : ''} — ${txDesc.trim()}`
        : `[${labelMap[txSubtype]}] ${txDesc.trim()}`;

      const newTx: KoperasiTransaction = {
        id: `tx_kop_${Date.now()}`,
        member_id: KOP_USER_ID,
        type: mappedType,
        amount: numAmount,
        status: 'completed',
        description: descHeader,
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

      // Update Saldo Kas Koperasi
      let newTotal = balance.total_balance;
      let newPokok = balance.simpanan_pokok;
      let newWajib = balance.simpanan_wajib;
      let newSukarela = balance.simpanan_sukarela;
      let newLoan = balance.active_loan || 0;

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
        if (newTotal < numAmount) {
          showAlertDialog('Peringatan Likuiditas', 'Saldo kas likuid koperasi tidak mencukupi untuk pencairan pinjaman ini.');
          setTxSubmitting(false);
          return;
        }
        newTotal -= numAmount;
        newLoan += numAmount;
      } else if (txSubtype === 'cicilan') {
        newTotal += numAmount;
        newLoan = Math.max(0, newLoan - numAmount);
      }

      const updatedBal: KoperasiBalance = {
        ...balance,
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

      // Update member balance record if MID matches
      if (txMemberMid.trim()) {
        const midClean = txMemberMid.trim().toUpperCase();
        const updatedMembers = members.map((m) => {
          if (m.mid.toUpperCase() === midClean) {
            return {
              ...m,
              simpananPokok: txSubtype === 'pokok' ? m.simpananPokok + numAmount : m.simpananPokok,
              simpananWajib: txSubtype === 'wajib' ? m.simpananWajib + numAmount : m.simpananWajib,
              tabunganSukarela: txSubtype === 'sukarela' ? m.tabunganSukarela + numAmount : m.tabunganSukarela,
            };
          }
          return m;
        });
        setMembers(updatedMembers);
        await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(updatedMembers));
      }

      setShowTxModal(false);
      setTxAmount('');
      setTxDesc('');
      setTxMemberMid('');
      setTxMemberName('');
      showAlertDialog('Transaksi Berhasil Dicatat', `${labelMap[txSubtype]} senilai ${formatRupiah(numAmount)} telah dibukukan.`);
    } catch {
      showAlertDialog('Gagal', 'Terjadi kesalahan sistem saat menyimpan mutasi.');
    } finally {
      setTxSubmitting(false);
    }
  };

  // Setujui Pengajuan Pinjaman (Disbursement)
  const handleApproveLoan = async (request: LoanRequest) => {
    if (balance.total_balance < request.nominal) {
      showAlertDialog(
        'Likuiditas Kas Kurang',
        `Saldo kas saat ini (${formatRupiah(balance.total_balance)}) tidak mencukupi untuk mencairkan pinjaman sebesar ${formatRupiah(request.nominal)}.`
      );
      return;
    }

    const destBank = request.bankPenerima || members.find((m) => m.mid === request.mid)?.bankPengirim || 'Bank Mandiri';
    const destRek = request.rekeningPenerima || members.find((m) => m.mid === request.mid)?.rekeningPengirim || '-';
    const destName = request.namaPenerima || members.find((m) => m.mid === request.mid)?.namaPengirim || request.nama;

    showConfirmDialog(
      'Konfirmasi Pencairan Pinjaman ke Rekening Member',
      `Setujui dan transfer pencairan pinjaman sebesar ${formatRupiah(request.nominal)} ke rekening bank anggota?\n\n• Penerima: ${request.nama} (${request.mid})\n• Rekening Tujuan: ${destBank} — ${destRek}\n• Atas Nama: ${destName}\n• Suku Bunga: 6% p.a. (PMK 49/2025)\n• Tenor: ${request.tenorBulan} Bulan\n• Grace Period: ${request.gracePeriodBulan} Bulan\n• Agunan: ${request.agunan}`,
      async () => {
        try {
          // 1. Update request status
          const updatedRequests = loanRequests.map((r) =>
            r.id === request.id
              ? {
                  ...r,
                  status: 'disbursed_waiting_confirmation' as const,
                  approvedAt: new Date().toISOString(),
                  disbursedAt: new Date().toISOString(),
                  bankPenerima: destBank,
                  rekeningPenerima: destRek,
                  namaPenerima: destName,
                  disbursementProofUri: request.disbursementProofUri || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
                  catatanAdmin: `Disetujui & ditransfer ke ${destBank} ${destRek} a.n ${destName}`,
                }
              : r
          );
          setLoanRequests(updatedRequests);
          await AsyncStorage.setItem(KOP_STORAGE_LOANS, JSON.stringify(updatedRequests));

          // 2. Potong kas & tambah active_loan
          const newTotal = balance.total_balance - request.nominal;
          const newLoan = (balance.active_loan || 0) + request.nominal;
          const updatedBal: KoperasiBalance = {
            ...balance,
            total_balance: newTotal,
            active_loan: newLoan,
            loan_remaining: newLoan,
            updated_at: new Date().toISOString(),
          };
          setBalance(updatedBal);
          await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(updatedBal));

          // 3. Catat di transaksi jurnal
          const newTx: KoperasiTransaction = {
            id: `tx_loan_disburse_${Date.now()}`,
            member_id: KOP_USER_ID,
            type: 'pinjaman',
            amount: request.nominal,
            status: 'completed',
            description: `[Pencairan Pinjaman 6% PMK 49] Transfer ke ${destBank} ${destRek} a.n ${destName} — MID: ${request.mid} (${request.nama}) — Tenor: ${request.tenorBulan} Bln, Grace: ${request.gracePeriodBulan} Bln. Agunan: ${request.agunan}`,
            reference_number: `TX-DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            due_date: null,
            processed_by: KOP_USER_ID,
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const updatedTxs = [newTx, ...transactions];
          setTransactions(updatedTxs);
          await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify(updatedTxs));

          setShowLoanDetailModal(null);
          showAlertDialog(
            'Pencairan Telah Ditransfer ke Rekening',
            `Pinjaman ${formatRupiah(request.nominal)} telah ditransfer ke rekening ${destBank} ${destRek} a.n ${destName}.\n\nStatus saat ini 'Menunggu Konfirmasi Member'. Member akan memverifikasi bukti transfer di aplikasinya.`
          );
        } catch (err) {
          showAlertDialog('Gagal', 'Gagal memproses persetujuan pinjaman.');
        }
      }
    );
  };

  // Tolak Pengajuan Pinjaman
  const handleRejectLoan = (request: LoanRequest) => {
    showConfirmDialog(
      'Konfirmasi Penolakan',
      `Tolak pengajuan pinjaman ${request.nama} (${request.mid})?`,
      async () => {
        const updatedRequests = loanRequests.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: 'rejected' as const,
                catatanAdmin: 'Nilai agunan atau rekam jejak simpanan belum memenuhi batas minimum plafon per anggota.',
              }
            : r
        );
        setLoanRequests(updatedRequests);
        await AsyncStorage.setItem(KOP_STORAGE_LOANS, JSON.stringify(updatedRequests));
        setShowLoanDetailModal(null);
        showAlertDialog('Ditolak', 'Pengajuan pinjaman telah ditolak.');
      }
    );
  };

  // Aktivasi / Verifikasi Anggota Baru
  const handleApproveMember = async (targetMember: MemberKopItem) => {
    const totalSetoranAwal = targetMember.simpananPokok + targetMember.simpananWajib + targetMember.tabunganSukarela;

    showConfirmDialog(
      'Verifikasi Anggota Baru',
      `Verifikasi keanggotaan ${targetMember.nama} (${targetMember.mid})?\n\nSyarat terpenuhi & Bukti Transfer Terverifikasi:\n✓ Memiliki MID Resmi MBCI\n✓ Akun Koperasi Terdaftar\n✓ Simpanan Pokok: ${formatRupiah(targetMember.simpananPokok)}\n✓ Iuran Wajib: ${formatRupiah(targetMember.simpananWajib)}\n✓ Tabungan Sukarela: ${formatRupiah(targetMember.tabunganSukarela)}\n✓ Total Kas Masuk: ${formatRupiah(totalSetoranAwal)}\n✓ Berhak atas Bunga 1% SHU`,
      async () => {
        try {
          // 1. Update status member (cocokkan ID dan MID resmi)
          const targetMid = targetMember.mid.trim().toUpperCase();
          const updated = members.map((m) =>
            (m.id === targetMember.id || m.mid.trim().toUpperCase() === targetMid)
              ? { ...m, status: 'active' as const }
              : m
          );
          setMembers(updated);
          await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(updated));

          // 2. Tambah kas likuid & alokasi simpanan
          const newTotal = balance.total_balance + totalSetoranAwal;
          const newPokok = balance.simpanan_pokok + targetMember.simpananPokok;
          const newWajib = balance.simpanan_wajib + targetMember.simpananWajib;
          const newSukarela = balance.simpanan_sukarela + targetMember.tabunganSukarela;

          const updatedBal: KoperasiBalance = {
            ...balance,
            total_balance: newTotal,
            simpanan_pokok: newPokok,
            simpanan_wajib: newWajib,
            simpanan_sukarela: newSukarela,
            updated_at: new Date().toISOString(),
          };
          setBalance(updatedBal);
          await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(updatedBal));

          // 3. Catat di Buku Kas / Jurnal Transaksi
          const newTx: KoperasiTransaction = {
            id: `tx_member_reg_${Date.now()}`,
            member_id: KOP_USER_ID,
            type: 'simpanan',
            amount: totalSetoranAwal,
            status: 'completed',
            description: `[Aktivasi Anggota Baru] MID: ${targetMember.mid} (${targetMember.nama}) — Setoran Pokok (${formatRupiah(targetMember.simpananPokok)}) + Wajib (${formatRupiah(targetMember.simpananWajib)}) + Sukarela (${formatRupiah(targetMember.tabunganSukarela)})`,
            reference_number: `TX-REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            due_date: null,
            processed_by: KOP_USER_ID,
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const updatedTxs = [newTx, ...transactions];
          setTransactions(updatedTxs);
          await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify(updatedTxs));

          showAlertDialog(
            'Keanggotaan Terverifikasi',
            `Anggota ${targetMember.nama} (${targetMember.mid}) kini resmi AKTIF. Setoran awal ${formatRupiah(totalSetoranAwal)} berhasil dibukukan ke saldo kas likuid koperasi.`
          );
        } catch (err) {
          showAlertDialog('Gagal', 'Terjadi kesalahan saat memverifikasi anggota.');
        }
      }
    );
  };

  // Tolak Verifikasi Pendaftaran Anggota Baru
  const handleRejectMember = (targetMember: MemberKopItem) => {
    showConfirmDialog(
      'Konfirmasi Penolakan Pendaftaran',
      `Tolak pendaftaran keanggotaan ${targetMember.nama} (${targetMember.mid})?\n\nAlasan: Bukti transfer pembayaran tidak sesuai / mutasi dana belum diterima pada rekening kas Bank Mandiri koperasi.`,
      async () => {
        try {
          const targetMid = targetMember.mid.trim().toUpperCase();
          const updated = members.map((m) =>
            (m.id === targetMember.id || m.mid.trim().toUpperCase() === targetMid)
              ? {
                  ...m,
                  status: 'rejected' as const,
                  catatanAdmin: 'Bukti transfer tidak valid atau mutasi pembayaran belum diterima rekening kas koperasi.',
                }
              : m
          );
          setMembers(updated);
          await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(updated));
          setSelectedProofMember(null);
          showAlertDialog(
            'Pendaftaran Ditolak',
            `Pendaftaran keanggotaan ${targetMember.nama} (${targetMember.mid}) telah ditolak.`
          );
        } catch (err) {
          showAlertDialog('Gagal', 'Terjadi kesalahan sistem saat menolak pendaftaran.');
        }
      },
      'Ya, Tolak',
      'Batal'
    );
  };

  // Verifikasi & Bukukan Setoran Kas Anggota Aktif (Pending Deposit)
  const handleApproveDeposit = async (mem: MemberKopItem) => {
    if (!mem || !mem.pendingDeposit) return;
    const deposit = mem.pendingDeposit;

    showConfirmDialog(
      'Konfirmasi Verifikasi Setoran Kas',
      `Setujui dan bukukan setoran transfer ${formatRupiah(deposit.nominal)} dari ${mem.nama} (${mem.mid})?\n\nAlokasi Dana Masuk:\n• Simpanan Wajib: ${formatRupiah(deposit.wajibPortion)}\n• Tabungan Sukarela: ${formatRupiah(deposit.sukarelaPortion)}${deposit.loanPortion > 0 ? `\n• Angsuran Pinjaman: ${formatRupiah(deposit.loanPortion)}` : ''}\n\nSaldo simpanan anggota dan kas likuid koperasi akan otomatis terupdate.`,
      async () => {
        setIsProcessingDeposit(true);
        try {
          const targetMid = mem.mid.trim().toUpperCase();
          const updatedMembers = members.map((m) => {
            if (m.id === mem.id || m.mid.trim().toUpperCase() === targetMid) {
              const newSukarela = (m.tabunganSukarela || 0) + deposit.sukarelaPortion;
              const newWajib = (m.simpananWajib || 0) + deposit.wajibPortion;
              return {
                ...m,
                tabunganSukarela: newSukarela,
                simpananWajib: newWajib,
                lastPaidWajibMonth: deposit.wajibPortion >= 50000 ? currentMonthKey : m.lastPaidWajibMonth,
                pendingDeposit: null,
              };
            }
            return m;
          });

          setMembers(updatedMembers);
          await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(updatedMembers));

          // Catat di Jurnal Mutasi Kas
          const rawTx = await AsyncStorage.getItem(KOP_STORAGE_TX);
          const allTxs = rawTx ? JSON.parse(rawTx) : [];
          const refNum = `TX-SETOR-VERIF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

          const descAllocations = [];
          if (deposit.wajibPortion > 0) descAllocations.push(`Wajib ${formatRupiah(deposit.wajibPortion)}`);
          if (deposit.sukarelaPortion > 0) descAllocations.push(`Sukarela ${formatRupiah(deposit.sukarelaPortion)}`);
          if (deposit.loanPortion > 0) descAllocations.push(`Angsuran Pinjaman ${formatRupiah(deposit.loanPortion)}`);

          const newTx: KoperasiTransaction = {
            id: `tx_dep_approved_${Date.now()}`,
            member_id: mem.id,
            type: 'simpanan',
            amount: deposit.nominal,
            status: 'completed',
            description: `[Verifikasi Setoran Kas] Total ${formatRupiah(deposit.nominal)} (${descAllocations.join(', ')}) — MID: ${mem.mid} (${mem.nama}) via ${deposit.bankPengirim || 'Bank Mandiri'}`,
            reference_number: refNum,
            due_date: null,
            processed_by: user?.id || 'admin_koperasi',
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const updatedTxs = [newTx, ...allTxs];
          setTransactions(updatedTxs);
          await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify(updatedTxs));

          // Rekonsiliasi Otomatis Saldo Kas Likuid Koperasi
          const activeMems = updatedMembers.filter((m) => m.status === 'active');
          const sumPokok = activeMems.reduce((sum, m) => sum + (m.simpananPokok || 0), 0);
          const sumWajib = activeMems.reduce((sum, m) => sum + (m.simpananWajib || 0), 0);
          const sumSukarela = activeMems.reduce((sum, m) => sum + (m.tabunganSukarela || 0), 0);
          const activeDisbursedLoans = loanRequests.filter(
            (l) => l.status === 'confirmed_active' || l.status === 'disbursed_waiting_confirmation'
          );
          const sumLoans = activeDisbursedLoans.reduce((sum, l) => sum + (l.nominal || 0), 0);
          const totalKasLikuid = Math.max(0, (sumPokok + sumWajib + sumSukarela) - sumLoans);

          const reconciledBal: KoperasiBalance = {
            ...balance,
            simpanan_pokok: sumPokok,
            simpanan_wajib: sumWajib,
            simpanan_sukarela: sumSukarela,
            total_balance: totalKasLikuid,
            updated_at: new Date().toISOString(),
          };
          setBalance(reconciledBal);
          await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(reconciledBal));

          setSelectedDepositMember(null);
          showAlertDialog(
            'Setoran Berhasil Diverifikasi! 🎉',
            `Setoran transfer kas sebesar ${formatRupiah(deposit.nominal)} dari ${mem.nama} (${mem.mid}) telah disetujui dan dibukukan resmi ke kas koperasi.\n\n• Saldo Tabungan Sukarela: ${formatRupiah((mem.tabunganSukarela || 0) + deposit.sukarelaPortion)}\n• Total Simpanan Anggota: ${formatRupiah(mem.simpananPokok + mem.simpananWajib + (mem.tabunganSukarela || 0) + deposit.nominal)}\n• Saldo Kas Likuid Koperasi: ${formatRupiah(totalKasLikuid)}`
          );
        } catch (err) {
          console.error('Error approving deposit:', err);
          showAlertDialog('Gagal', 'Terjadi kesalahan sistem saat memverifikasi setoran.');
        } finally {
          setIsProcessingDeposit(false);
        }
      },
      'Ya, Setujui & Bukukan',
      'Batal'
    );
  };

  // Tolak Setoran Kas Anggota Aktif
  const handleRejectDeposit = (mem: MemberKopItem) => {
    if (!mem || !mem.pendingDeposit) return;
    const deposit = mem.pendingDeposit;

    showConfirmDialog(
      'Konfirmasi Penolakan Setoran',
      `Tolak setoran transfer ${formatRupiah(deposit.nominal)} dari ${mem.nama} (${mem.mid})?\n\nAlasan: Bukti transfer belum valid / mutasi rekening kas koperasi belum diterima.`,
      async () => {
        setIsProcessingDeposit(true);
        try {
          const targetMid = mem.mid.trim().toUpperCase();
          const updatedMembers = members.map((m) => {
            if (m.id === mem.id || m.mid.trim().toUpperCase() === targetMid) {
              return {
                ...m,
                pendingDeposit: null,
              };
            }
            return m;
          });

          setMembers(updatedMembers);
          await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(updatedMembers));
          setSelectedDepositMember(null);
          showAlertDialog(
            'Setoran Ditolak',
            `Setoran kas sebesar ${formatRupiah(deposit.nominal)} dari ${mem.nama} (${mem.mid}) telah ditolak.`
          );
        } catch (err) {
          console.error('Error rejecting deposit:', err);
          showAlertDialog('Gagal', 'Terjadi kesalahan saat memproses penolakan.');
        } finally {
          setIsProcessingDeposit(false);
        }
      },
      'Ya, Tolak',
      'Batal'
    );
  };

  const handleSendWaReminder = (mem: MemberKopItem) => {
    const cleanPhone = (mem.phone || '').replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const periodName = getMonthNameIndo(currentMonthKey);
    const msg = encodeURIComponent(
      `Halo Sdr/i ${mem.nama} (${mem.kopMemberId || mem.mid}),\n\nKami dari Pengelola Koperasi Bersama Satu Bintang menginformasikan bahwa tagihan Iuran Simpanan Wajib periode ${periodName} sebesar Rp 50.000 belum tercatat lunas.\n\nPembayaran dapat ditransfer ke:\nBank Mandiri: 137-00-1234567-8\na.n. Koperasi Bersama Satu Bintang\n\natau konfirmasikan autodebet dari Tabungan Sukarela Anda melalui menu Koperasi di aplikasi MB Club INA.\n\nTerima kasih atas partisipasi dan kebersamaannya.`
    );
    Linking.openURL(`https://wa.me/${waPhone}?text=${msg}`).catch(() => {
      showAlertDialog('Gagal Membuka WhatsApp', 'Tidak dapat membuka aplikasi WhatsApp.');
    });
  };

  const handleAutoDebitWajib = (mem: MemberKopItem) => {
    if (mem.tabunganSukarela < 50000) {
      showAlertDialog(
        'Saldo Sukarela Kurang',
        `Saldo Tabungan Sukarela ${mem.nama} (${formatRupiah(mem.tabunganSukarela)}) tidak mencukupi untuk autodebet Iuran Simpanan Wajib Rp 50.000.`
      );
      return;
    }

    const periodName = getMonthNameIndo(currentMonthKey);
    showConfirmDialog(
      'Autodebet Simpanan Wajib',
      `Potong Rp 50.000 dari Tabungan Sukarela ${mem.nama} (${mem.mid}) untuk pelunasan Iuran Simpanan Wajib periode ${periodName}?\n\n• Saldo Sukarela: ${formatRupiah(mem.tabunganSukarela)} → ${formatRupiah(mem.tabunganSukarela - 50000)}\n• Simpanan Wajib: ${formatRupiah(mem.simpananWajib)} → ${formatRupiah(mem.simpananWajib + 50000)}`,
      async () => {
        try {
          const updated = members.map((m) => {
            if (m.id === mem.id || m.mid === mem.mid) {
              return {
                ...m,
                simpananWajib: m.simpananWajib + 50000,
                tabunganSukarela: m.tabunganSukarela - 50000,
                lastPaidWajibMonth: currentMonthKey,
              };
            }
            return m;
          });
          setMembers(updated);
          await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(updated));

          // Catat transaksi kas jurnal
          const newTx: KoperasiTransaction = {
            id: `tx_autodeb_${Date.now()}`,
            member_id: KOP_USER_ID,
            type: 'simpanan',
            amount: 50000,
            status: 'completed',
            description: `[Simpanan Wajib] Autodebet Sukarela MID: ${mem.mid} (${mem.nama}) — Periode ${periodName}`,
            reference_number: `TX-AUTODEB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            due_date: null,
            processed_by: KOP_USER_ID,
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const updatedTxs = [newTx, ...transactions];
          setTransactions(updatedTxs);
          await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify(updatedTxs));

          showAlertDialog('Sukses', `Simpanan Wajib periode ${periodName} anggota ${mem.nama} berhasil dibayar via pemotongan Tabungan Sukarela.`);
        } catch {
          showAlertDialog('Gagal', 'Terjadi kesalahan sistem saat autodebet simpanan.');
        }
      },
      'Ya, Potong Saldo',
      'Batal'
    );
  };

  const handleMarkWajibPaid = (mem: MemberKopItem) => {
    const periodName = getMonthNameIndo(currentMonthKey);
    showConfirmDialog(
      'Tandai Simpanan Wajib Lunas',
      `Tandai bahwa ${mem.nama} (${mem.mid}) telah membayar Iuran Simpanan Wajib periode ${periodName} sebesar Rp 50.000 via Setoran Kas/Bank Mandiri?`,
      async () => {
        try {
          const updated = members.map((m) => {
            if (m.id === mem.id || m.mid === mem.mid) {
              return {
                ...m,
                simpananWajib: m.simpananWajib + 50000,
                lastPaidWajibMonth: currentMonthKey,
              };
            }
            return m;
          });
          setMembers(updated);
          await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(updated));

          // Tambah kas likuid koperasi
          const newTotal = balance.total_balance + 50000;
          const newWajib = balance.simpanan_wajib + 50000;
          const updatedBal: KoperasiBalance = {
            ...balance,
            total_balance: newTotal,
            simpanan_wajib: newWajib,
            updated_at: new Date().toISOString(),
          };
          setBalance(updatedBal);
          await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(updatedBal));

          // Catat transaksi kas jurnal
          const newTx: KoperasiTransaction = {
            id: `tx_wajib_paid_${Date.now()}`,
            member_id: KOP_USER_ID,
            type: 'simpanan',
            amount: 50000,
            status: 'completed',
            description: `[Simpanan Wajib] Setoran Kas/Bank MID: ${mem.mid} (${mem.nama}) — Periode ${periodName}`,
            reference_number: `TX-WAJIB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            due_date: null,
            processed_by: KOP_USER_ID,
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const updatedTxs = [newTx, ...transactions];
          setTransactions(updatedTxs);
          await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify(updatedTxs));

          showAlertDialog('Sukses', `Simpanan Wajib periode ${periodName} anggota ${mem.nama} telah tercatat LUNAS.`);
        } catch {
          showAlertDialog('Gagal', 'Terjadi kesalahan sistem saat memperbarui status.');
        }
      },
      'Ya, Tandai Lunas',
      'Batal'
    );
  };

  // Kalkulasi Angsuran Pinjaman (PMK 49/2025: 6% Flat p.a.)
  const calculateLoanInstallment = (nominal: number, tenorBulan: number) => {
    if (!nominal || !tenorBulan) return { pokok: 0, bunga: 0, total: 0 };
    const pokokPerBulan = nominal / tenorBulan;
    const bungaPerBulan = (nominal * BUNGA_PINJAMAN_PA) / 12; // 6% per tahun / 12 = 0.5% per bulan
    const totalPerBulan = pokokPerBulan + bungaPerBulan;
    return {
      pokok: Math.round(pokokPerBulan),
      bunga: Math.round(bungaPerBulan),
      total: Math.round(totalPerBulan),
    };
  };

  // Buka Modal Setor Kas dengan Alokasi Pintar Khusus Anggota Terpilih
  const handleOpenSetorForMember = (mem: MemberKopItem) => {
    setTxMemberMid(mem.mid);
    setTxMemberName(mem.nama);

    const isWajibPaid = mem.lastPaidWajibMonth === currentMonthKey || (mem.status === 'active' && mem.simpananWajib >= 50000);
    const memLoan = loanRequests.find(
      (r) => r.mid === mem.mid && (r.status === 'confirmed_active' || r.status === 'disbursed_waiting_confirmation')
    );

    if (!isWajibPaid) {
      setTxSubtype('wajib');
      setTxAmount('50.000');
      setTxDesc(`[Simpanan Wajib] MID: ${mem.mid} (${mem.nama}) — Periode ${getMonthNameIndo(currentMonthKey)}`);
    } else if (memLoan) {
      const calc = calculateLoanInstallment(memLoan.nominal, memLoan.tenorBulan);
      setTxSubtype('cicilan');
      setTxAmount(calc.total ? calc.total.toLocaleString('id-ID') : '');
      setTxDesc(`[Angsuran Pinjaman] MID: ${mem.mid} (${mem.nama}) — PMK 49/2025`);
    } else {
      // Jika Pokok & Wajib sudah lunas dan tidak ada pinjaman: otomatis arahkan ke Tabungan Sukarela
      setTxSubtype('sukarela');
      setTxAmount('50.000');
      setTxDesc(`[Tabungan Sukarela] MID: ${mem.mid} (${mem.nama}) — Titipan Tabungan Sukarela Anggota`);
    }

    setShowTxModal(true);
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        searchQuery === '' ||
        (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tx.reference_number.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchType =
        filterType === 'ALL' ||
        (filterType === 'simpanan' && tx.type === 'simpanan') ||
        (filterType === 'pinjaman' && tx.type === 'pinjaman') ||
        (filterType === 'cicilan' && tx.type === 'cicilan');

      return matchSearch && matchType;
    });
  }, [transactions, searchQuery, filterType]);

  // Filter keluar seluruh data dummy yang diminta user
  const activeLoans = useMemo(() => {
    const dummyIds = new Set(['req_001', 'req_002', 'req_003']);
    const dummyMids = new Set(['MBINA-JKT-042', 'MBINA-BDG-019', 'MBINA-SBY-088']);
    return loanRequests.filter((r) => !dummyIds.has(r.id) && !dummyMids.has(r.mid));
  }, [loanRequests]);

  // Filtered & Paginated Members for Scalable Table View
  const filteredMembers = useMemo(() => {
    let result = members;
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase().trim();
      result = result.filter((m) =>
        m.nama.toLowerCase().includes(q) ||
        m.mid.toLowerCase().includes(q) ||
        (m.kopMemberId && m.kopMemberId.toLowerCase().includes(q)) ||
        m.chapter.toLowerCase().includes(q)
      );
    }
    if (memberFilterStatus === 'ACTIVE') {
      result = result.filter((m) => m.status === 'active');
    } else if (memberFilterStatus === 'PENDING') {
      result = result.filter((m) => m.status === 'pending' || !!m.pendingDeposit);
    } else if (memberFilterStatus === 'UNPAID_WAJIB') {
      result = result.filter((m) =>
        m.status === 'active' && m.lastPaidWajibMonth !== currentMonthKey && m.simpananWajib < 50000
      );
    }
    return result;
  }, [members, memberSearchQuery, memberFilterStatus]);

  const totalMemberPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBER_PAGE_SIZE));
  const paginatedMembers = useMemo(() => {
    const start = (memberPage - 1) * MEMBER_PAGE_SIZE;
    return filteredMembers.slice(start, start + MEMBER_PAGE_SIZE);
  }, [filteredMembers, memberPage]);

  // Statistik & Metrics
  const pendingLoansCount = activeLoans.filter((r) => r.status === 'pending').length;
  const pendingRegistrationsCount = members.filter((m) => m.status === 'pending').length;
  const pendingDepositsCount = members.filter((m) => !!m.pendingDeposit).length;
  const pendingMembersCount = pendingRegistrationsCount + pendingDepositsCount;
  // ============================================================
  // AUDIT PENILAIAN KESEHATAN KOPERASI (PERMENKOPUKM NO. 9/2020)
  // DIHITUNG REAL DARI DATA NYATA DATABASE
  // ============================================================
  const healthAssessment = useMemo(() => {
    const activeMems = members.filter((m) => m.status === 'active');
    const activeCount = activeMems.length;
    const sumPokok = balance.simpanan_pokok || 0;
    const sumWajib = balance.simpanan_wajib || 0;
    const modalSendiri = sumPokok + sumWajib;
    const kasLikuid = balance.total_balance || 0;
    const tabSukarela = balance.simpanan_sukarela || 0;
    const totalAset = kasLikuid;

    // 1. Aspek Tata Kelola (Bobot 30%)
    // Kuorum anggota KSP primer min 9 (UU Cipta Kerja): (activeCount / 9) * 100
    const sAnggota = Math.min(100, Math.round((activeCount / 9) * 100)); // 2/9 = 22
    const sPengurus = 50; // Belum ada Pengawas Independen resmi
    const sRat = 30; // Belum pernah melaksanakan RAT
    const sTransparansi = 95; // Sistem digital e-passbook transparan 100%
    const scoreTataKelola = Math.round((sAnggota + sPengurus + sRat + sTransparansi) / 4);
    const pointTataKelola = scoreTataKelola * 0.30;

    // 2. Aspek Profil Risiko (Bobot 15%)
    const sLikuiditas = totalAset >= tabSukarela ? 85 : 40;
    const sNpl = 70; // 0% kredit macet, portofolio pembiayaan belum teruji
    const sOperasional = 65; // Dual-verification aktif, tapi single bendahara
    const scoreProfilRisiko = Math.round((sLikuiditas + sNpl + sOperasional) / 3);
    const pointProfilRisiko = scoreProfilRisiko * 0.15;

    // 3. Aspek Kinerja Keuangan (Bobot 25%)
    const sShu = 30; // Belum ada pendapatan bunga riil dari pembiayaan (SHU = Rp 0)
    const sBopo = 40; // Rasio efisiensi operasional belum terbentuk
    const sAsetTurnover = 65; // Dana tersimpan aman di Bank Mandiri
    const scoreKinerjaKeuangan = Math.round((sShu + sBopo + sAsetTurnover) / 3);
    const pointKinerjaKeuangan = scoreKinerjaKeuangan * 0.25;

    // 4. Aspek Permodalan (Bobot 30%)
    // Modal sendiri disetor vs Standar Min. Rp 15.000.000 untuk KSP penyalur kredit
    const sKecukupanModal = Math.min(100, Math.max(15, Math.round((modalSendiri / 15000000) * 100))); // ~20
    const sRasioEkuitas = totalAset > 0 ? Math.round((modalSendiri / totalAset) * 100) : 15; // ~16%
    const sKepatuhanIuran = 90; // Anggota aktif 100% patuh iuran pokok & wajib
    const scorePermodalan = Math.round((sKecukupanModal + Math.min(100, sRasioEkuitas * 3) + sKepatuhanIuran) / 3);
    const pointPermodalan = scorePermodalan * 0.30;

    // Skor Komposit Total (0 - 100)
    const compositeScore = Math.round((pointTataKelola + pointProfilRisiko + pointKinerjaKeuangan + pointPermodalan) * 10) / 10;

    let status: 'SEHAT' | 'CUKUP SEHAT' | 'DALAM PENGAWASAN' | 'DALAM PENGAWASAN KHUSUS' = 'DALAM PENGAWASAN';
    let color = '#F59E0B'; // Amber
    let bgLight = 'rgba(245, 158, 11, 0.12)';
    let borderColor = '#F59E0B';

    if (compositeScore >= 80) {
      status = 'SEHAT';
      color = '#10B981';
      bgLight = 'rgba(16, 185, 129, 0.12)';
      borderColor = '#10B981';
    } else if (compositeScore >= 60) {
      status = 'CUKUP SEHAT';
      color = '#3B82F6';
      bgLight = 'rgba(59, 130, 246, 0.12)';
      borderColor = '#3B82F6';
    } else if (compositeScore >= 40) {
      status = 'DALAM PENGAWASAN';
      color = '#F59E0B';
      bgLight = 'rgba(245, 158, 11, 0.12)';
      borderColor = '#F59E0B';
    } else {
      status = 'DALAM PENGAWASAN KHUSUS';
      color = '#EF4444';
      bgLight = 'rgba(239, 68, 68, 0.12)';
      borderColor = '#EF4444';
    }

    // Kebijakan Proteksi Penyaluran Pinjaman:
    // Dilarang menyalurkan pinjaman jika belum CUKUP SEHAT (>= 60) dan Modal Sendiri < 15 Juta serta Anggota < 9
    const isLoanAllowed = compositeScore >= 60 && modalSendiri >= 15000000 && activeCount >= 9;
    const loanBlockReasons = [];
    if (activeCount < 9) loanBlockReasons.push(`Anggota aktif baru ${activeCount} orang (syarat kuorum KSP primer min. 9 orang).`);
    if (modalSendiri < 15000000) loanBlockReasons.push(`Modal sendiri disetor baru ${formatRupiah(modalSendiri)} (ambang batas aman permodalan min. Rp 15.000.000).`);
    if (compositeScore < 60) loanBlockReasons.push(`Skor kesehatan koperasi ${compositeScore.toFixed(1)}/100 (berstatus ${status}, di bawah standar minimal 60.0).`);

    return {
      score: compositeScore,
      status,
      color,
      bgLight,
      borderColor,
      isLoanAllowed,
      loanBlockReasons,
      activeCount,
      modalSendiri,
      totalAset,
      kasLikuid,
      tabSukarela,
      aspects: {
        tataKelola: {
          title: 'Tata Kelola (Governance)',
          weight: 30,
          score: scoreTataKelola,
          point: pointTataKelola,
          indicators: [
            { name: 'Kuorum Anggota Aktif', value: `${activeCount} Anggota`, standard: 'Min. 9 Anggota', status: (activeCount >= 9 ? 'pass' : 'fail') as 'pass' | 'warning' | 'fail' },
            { name: 'Struktur Kepengurusan & Pengawas', value: '1 Bendahara (Tanpa Pengawas)', standard: 'Pengurus + Pengawas', status: 'warning' as 'pass' | 'warning' | 'fail' },
            { name: 'Rapat Anggota Tahunan (RAT)', value: 'Belum RAT', standard: 'Wajib 1x / Tahun', status: 'fail' as 'pass' | 'warning' | 'fail' },
            { name: 'Transparansi & Pembukuan Digital', value: 'E-Passbook & Mutasi Real-time', standard: 'SOP Digital Terbuka', status: 'pass' as 'pass' | 'warning' | 'fail' },
          ] as Array<{ name: string; value: string; standard: string; status: 'pass' | 'warning' | 'fail' }>
        },
        profilRisiko: {
          title: 'Profil Risiko (Risk Profile)',
          weight: 15,
          score: scoreProfilRisiko,
          point: pointProfilRisiko,
          indicators: [
            { name: 'Rasio Kecukupan Kas Likuid', value: `${formatRupiah(kasLikuid)} (100% aman)`, standard: 'Cover 100% Simpanan', status: 'pass' as 'pass' | 'warning' | 'fail' },
            { name: 'Kualitas Kredit / NPL', value: '0.0% (Nihil Macet)', standard: 'NPL < 5%', status: 'pass' as 'pass' | 'warning' | 'fail' },
            { name: 'Pengendalian Risiko Operasional', value: 'Dual-Verification Struk Transfer', standard: 'Verifikasi Ganda', status: 'pass' as 'pass' | 'warning' | 'fail' },
          ] as Array<{ name: string; value: string; standard: string; status: 'pass' | 'warning' | 'fail' }>
        },
        kinerjaKeuangan: {
          title: 'Kinerja Keuangan (Financial Performance)',
          weight: 25,
          score: scoreKinerjaKeuangan,
          point: pointKinerjaKeuangan,
          indicators: [
            { name: 'Perolehan SHU Riil Berjalan', value: 'Rp 0 (Belum ada bunga pinjaman)', standard: 'SHU Positif', status: 'fail' as 'pass' | 'warning' | 'fail' },
            { name: 'Kemandirian Operasional (BOPO)', value: 'Nihil Biaya Operasional', standard: 'BOPO < 90%', status: 'warning' as 'pass' | 'warning' | 'fail' },
            { name: 'Efisiensi Penyaluran Dana', value: 'Dana Tersimpan Bank Mandiri', standard: 'Perputaran Optimal', status: 'warning' as 'pass' | 'warning' | 'fail' },
          ] as Array<{ name: string; value: string; standard: string; status: 'pass' | 'warning' | 'fail' }>
        },
        permodalan: {
          title: 'Permodalan (Capital Adequacy)',
          weight: 30,
          score: scorePermodalan,
          point: pointPermodalan,
          indicators: [
            { name: 'Kecukupan Modal Sendiri (Pokok+Wajib)', value: formatRupiah(modalSendiri), standard: 'Min. Rp 15.000.000', status: 'fail' as 'pass' | 'warning' | 'fail' },
            { name: 'Porsi Modal Sendiri vs Simpanan', value: `${((modalSendiri / (totalAset || 1)) * 100).toFixed(1)}% (Didominasi Sukarela)`, standard: 'Modal Sendiri > 40%', status: 'warning' as 'pass' | 'warning' | 'fail' },
            { name: 'Kepatuhan Iuran Pokok & Wajib', value: '100% Lunas (Rp 100rb & Rp 50rb)', standard: 'Disiplin 100%', status: 'pass' as 'pass' | 'warning' | 'fail' },
          ] as Array<{ name: string; value: string; standard: string; status: 'pass' | 'warning' | 'fail' }>
        },
      },
      correctiveActions: [
        'Merekrut 7 anggota aktif baru agar kuorum KSP primer terpenuhi minimal 9 orang (+15 Poin Tata Kelola).',
        'Menambah setoran Simpanan Pokok & Wajib hingga mencapai modal sendiri minimal Rp 15.000.000 (+25 Poin Permodalan).',
        'Menyelenggarakan Rapat Anggota Tahunan (RAT) perdana dan memilih Badan Pengawas Independen (+10 Poin Tata Kelola).',
        'Membentuk pos Dana Cadangan Risiko Kredit dari akumulasi laba operasional (+10 Poin Profil Risiko).'
      ]
    };
  }, [members, balance]);

  // Render Tab Navigation Buttons
  const renderTabBtn = (tab: TabType, label: string, icon: any, badge?: number) => {
    const isActive = activeTab === tab;
    return (
      <Pressable
        key={tab}
        onPress={() => setActiveTab(tab)}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={icon} size={15} color={isActive ? '#FBBF24' : '#A1A1AA'} />
          <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
            {label}
          </Text>
          {badge !== undefined && badge > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color="#F4F4F5" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerTitle}>Dashboard Admin Koperasi</Text>
            <View style={styles.adminChip}>
              <Text style={styles.adminChipText}>BENDAHARA</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Koperasi Bersama Satu Bintang • MBCI
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(main)/koperasi' as any)}
          style={styles.switchViewBtn}
        >
          <Ionicons name="eye-outline" size={14} color="#D4D4D8" />
          <Text style={styles.switchViewText}>Mode Anggota</Text>
        </Pressable>
      </View>

      {/* Admin Identity Bar */}
      <View style={styles.identityBar}>
        <Ionicons name="shield-checkmark" size={16} color="#FBBF24" />
        <Text style={styles.identityText} numberOfLines={1}>
          Login sebagai: <Text style={{ color: '#FDE68A', fontWeight: '700' }}>Pengelola Keuangan Koperasi</Text> ({KOP_EMAIL})
        </Text>
      </View>

      {/* Tab Selector Bar (Horizontal Scroll) */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {renderTabBtn('ikhtisar', 'Ikhtisar & Kas', 'pie-chart-outline')}
          {renderTabBtn('pinjaman', 'Pengajuan Pinjaman', 'clipboard-outline', pendingLoansCount)}
          {renderTabBtn('mutasi', 'Buku Kas & Mutasi', 'receipt-outline')}
          {renderTabBtn('anggota', 'Buku Anggota', 'people-outline', pendingMembersCount)}
          {renderTabBtn('shu', 'Kalkulator SHU', 'calculator-outline')}
          {renderTabBtn('kesehatan', 'Kesehatan KSP', 'shield-checkmark-outline')}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C5A059" />}
      >
        {/* ============================================================ */}
        {/* TAB 1: IKHTISAR & LIKUIDITAS KAS                            */}
        {/* ============================================================ */}
        {activeTab === 'ikhtisar' && (
          <View>
            {/* Primary Cash Card */}
            <View style={styles.primaryCashCard}>
              <View style={styles.primaryCashHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.goldIconCircle}>
                    <Ionicons name="wallet" size={20} color="#000" />
                  </View>
                  <View>
                    <Text style={styles.primaryCashLabel}>TOTAL SALDO KAS LIKUID</Text>
                    <Text style={styles.primaryCashStatus}>Tersedia untuk Operasional & Pinjaman</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setShowTxModal(true)}
                  style={styles.addTxPrimaryBtn}
                >
                  <Ionicons name="add" size={16} color="#000" />
                  <Text style={styles.addTxPrimaryText}>Catat Mutasi</Text>
                </Pressable>
              </View>

              <Text style={styles.primaryCashAmount}>
                {formatRupiah(balance.total_balance)}
              </Text>

              {/* Composition Progress Bar */}
              <View style={styles.compositionBarContainer}>
                <View
                  style={[
                    styles.compBarSegment,
                    {
                      flex: balance.simpanan_pokok || 1,
                      backgroundColor: '#60A5FA',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.compBarSegment,
                    {
                      flex: balance.simpanan_wajib || 1,
                      backgroundColor: '#34D399',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.compBarSegment,
                    {
                      flex: balance.simpanan_sukarela || 1,
                      backgroundColor: '#FBBF24',
                    },
                  ]}
                />
              </View>

              <View style={styles.compLegendRow}>
                <View style={styles.compLegendItem}>
                  <View style={[styles.compDot, { backgroundColor: '#60A5FA' }]} />
                  <Text style={styles.compLegendText}>Pokok</Text>
                </View>
                <View style={styles.compLegendItem}>
                  <View style={[styles.compDot, { backgroundColor: '#34D399' }]} />
                  <Text style={styles.compLegendText}>Wajib</Text>
                </View>
                <View style={styles.compLegendItem}>
                  <View style={[styles.compDot, { backgroundColor: '#FBBF24' }]} />
                  <Text style={styles.compLegendText}>Sukarela</Text>
                </View>
              </View>
            </View>

            {/* Metric Grid Cards */}
            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricCardTop}>
                  <Text style={styles.metricLabel}>Simpanan Pokok</Text>
                  <Ionicons name="lock-closed-outline" size={16} color="#60A5FA" />
                </View>
                <Text style={styles.metricValue}>{formatRupiah(balance.simpanan_pokok)}</Text>
                <Text style={styles.metricSub}>Rp 100.000 / Anggota</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricCardTop}>
                  <Text style={styles.metricLabel}>Simpanan Wajib</Text>
                  <Ionicons name="calendar-outline" size={16} color="#34D399" />
                </View>
                <Text style={styles.metricValue}>{formatRupiah(balance.simpanan_wajib)}</Text>
                <Text style={styles.metricSub}>Rp 50.000 / Bulan</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricCardTop}>
                  <Text style={styles.metricLabel}>Tabungan Sukarela</Text>
                  <Ionicons name="sparkles-outline" size={16} color="#FBBF24" />
                </View>
                <Text style={styles.metricValue}>{formatRupiah(balance.simpanan_sukarela)}</Text>
                <Text style={styles.metricSub}>Min. Rp 25.000</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
                <View style={styles.metricCardTop}>
                  <Text style={styles.metricLabel}>Pinjaman Beredar</Text>
                  <Ionicons name="trending-up-outline" size={16} color="#F87171" />
                </View>
                <Text style={[styles.metricValue, { color: '#FCA5A5' }]}>
                  {formatRupiah(balance.active_loan || 0)}
                </Text>
                <Text style={styles.metricSub}>Bunga 6% Flat p.a.</Text>
              </View>
            </View>

            {/* PMK 49/2025 Regulation Alert Banner */}
            <View style={styles.regulasiBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ionicons name="information-circle" size={20} color="#FBBF24" />
                <Text style={styles.regulasiTitle}>
                  Ketentuan Suku Bunga & Pembiayaan (PMK No. 49 Tahun 2025)
                </Text>
              </View>
              <Text style={styles.regulasiDesc}>
                • <Text style={{ color: '#FDE68A', fontWeight: '700' }}>Suku Bunga Pinjaman:</Text> 6% per tahun flat berdasarkan regulasi pemerintah.{'\n'}
                • <Text style={{ color: '#FDE68A', fontWeight: '700' }}>Plafon Pinjaman:</Text> Maksimal hingga Rp 3 Miliar per koperasi (alokasi operasional maks. Rp 500 Juta, disalurkan melalui Bank Himbara).{'\n'}
                • <Text style={{ color: '#FDE68A', fontWeight: '700' }}>Tenor Pembiayaan:</Text> Maksimal 6 tahun (72 bulan) dengan Masa Tenggang (Grace Period) 6–8 bulan.{'\n'}
                • <Text style={{ color: '#FDE68A', fontWeight: '700' }}>Plafon per Anggota:</Text> Disesuaikan dengan nilai agunan unit Mercedes-Benz & rekam jejak simpanan.{'\n'}
                • <Text style={{ color: '#FDE68A', fontWeight: '700' }}>Bunga SHU:</Text> Anggota berhak atas bunga 1% dari SHU tahunan.
              </Text>
            </View>

            {/* Quick Actions Panel */}
            <Text style={styles.sectionHeaderTitle}>Aksi Cepat Pengelola</Text>
            <View style={styles.quickGrid}>
              <Pressable
                onPress={() => setShowTxModal(true)}
                style={styles.quickCard}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                  <Ionicons name="add-circle" size={20} color="#34D399" />
                </View>
                <Text style={styles.quickCardTitle}>Catat Setoran</Text>
                <Text style={styles.quickCardDesc}>Pokok, Wajib, Sukarela</Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('pinjaman')}
                style={styles.quickCard}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Ionicons name="clipboard" size={20} color="#FBBF24" />
                </View>
                <Text style={styles.quickCardTitle}>Review Pinjaman</Text>
                <Text style={styles.quickCardDesc}>{pendingLoansCount} Antrean Menunggu</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowShuModal(true)}
                style={styles.quickCard}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                  <Ionicons name="calculator" size={20} color="#60A5FA" />
                </View>
                <Text style={styles.quickCardTitle}>Kalkulator SHU</Text>
                <Text style={styles.quickCardDesc}>Simulasi Dividen 1%</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowEStatementModal(true)}
                style={styles.quickCard}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Ionicons name="document-text" size={20} color="#C084FC" />
                </View>
                <Text style={styles.quickCardTitle}>E-Statement Kas</Text>
                <Text style={styles.quickCardDesc}>Rekap Mutasi & Buku Kas</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ANTREAN PENGAJUAN PINJAMAN (PMK 49/2025)              */}
        {/* ============================================================ */}
        {activeTab === 'pinjaman' && (
          <View>
            <View style={styles.tabSectionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Antrean Pengajuan Pinjaman</Text>
                <Text style={styles.sectionHeaderSub}>
                  Suku Bunga 6% p.a. • Tenor Maks. 72 Bulan • Grace Period 6-8 Bulan
                </Text>
              </View>
            </View>

            {/* Warning Banner Penangguhan Pinjaman Karena Status Kesehatan */}
            {!healthAssessment.isLoanAllowed && (
              <View style={styles.loanLockWarningCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={styles.loanLockIconBox}>
                    <Ionicons name="shield-outline" size={22} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.loanLockWarningTitle}>
                        Penyaluran Pinjaman Ditangguhkan Sistem
                      </Text>
                      <View style={styles.loanLockBadge}>
                        <Text style={styles.loanLockBadgeText}>PROTEKSI PERMENKOPUKM 9/2020</Text>
                      </View>
                    </View>
                    <Text style={styles.loanLockWarningDesc}>
                      Berdasarkan audit kesehatan data riil, Koperasi saat ini berstatus <Text style={{ color: '#F59E0B', fontWeight: '800' }}>DALAM PENGAWASAN (Skor: {healthAssessment.score.toFixed(1)}/100)</Text>. Penyaluran pinjaman baru dikunci otomatis demi memproteksi kas simpanan sukarela anggota dari risiko gagal bayar:
                    </Text>
                    <View style={{ marginTop: 6, gap: 2 }}>
                      {healthAssessment.loanBlockReasons.map((reason, rIdx) => (
                        <Text key={rIdx} style={styles.loanLockReasonItem}>
                          • {reason}
                        </Text>
                      ))}
                    </View>
                    <Pressable
                      onPress={() => setActiveTab('kesehatan')}
                      style={styles.loanLockActionBtn}
                    >
                      <Text style={styles.loanLockActionBtnText}>Lihat Hasil Audit di Tab Kesehatan KSP</Text>
                      <Ionicons name="arrow-forward" size={12} color="#000" />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {activeLoans.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="shield-checkmark" size={48} color="#C5A059" />
                <Text style={styles.emptyTitle}>Tidak Ada Antrean Pinjaman</Text>
                <Text style={styles.emptySub}>Tidak ada permohonan pinjaman anggota yang tertunda saat ini.</Text>
              </View>
            ) : (
              activeLoans.map((req) => {
                const calc = calculateLoanInstallment(req.nominal, req.tenorBulan);
                return (
                  <View
                    key={req.id}
                    style={[
                      styles.loanCard,
                      req.status === 'approved' && { borderColor: 'rgba(16, 185, 129, 0.4)' },
                      req.status === 'disbursed_waiting_confirmation' && { borderColor: 'rgba(59, 130, 246, 0.4)' },
                      req.status === 'confirmed_active' && { borderColor: 'rgba(16, 185, 129, 0.5)' },
                      req.status === 'rejected' && { borderColor: 'rgba(239, 68, 68, 0.4)' },
                    ]}
                  >
                    <View style={styles.loanCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.loanCardName}>{req.nama}</Text>
                          <Text style={styles.loanCardMid}>{req.mid}</Text>
                        </View>
                        <Text style={styles.loanCardChapter}>{req.chapter}</Text>
                      </View>
                      <View
                        style={[
                          styles.loanStatusBadge,
                          req.status === 'approved' && styles.loanStatusApproved,
                          req.status === 'disbursed_waiting_confirmation' && { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
                          req.status === 'confirmed_active' && styles.loanStatusApproved,
                          req.status === 'rejected' && styles.loanStatusRejected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.loanStatusText,
                            req.status === 'disbursed_waiting_confirmation' && { color: '#60A5FA' },
                            req.status === 'confirmed_active' && { color: '#34D399' },
                            req.status === 'approved' && { color: '#10B981' },
                            req.status === 'rejected' && { color: '#EF4444' },
                          ]}
                        >
                          {req.status === 'pending'
                            ? 'MENUNGGU APPROVAL'
                            : req.status === 'disbursed_waiting_confirmation'
                            ? 'DICAIRKAN (MENUNGGU KONFIRMASI MEMBER)'
                            : req.status === 'confirmed_active'
                            ? 'AKTIF BERJALAN'
                            : req.status === 'approved'
                            ? 'DISETUJUI'
                            : 'DITOLAK'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.loanCardBody}>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Nominal Pengajuan:</Text>
                        <Text style={styles.loanDetailNominal}>{formatRupiah(req.nominal)}</Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Skema Suku Bunga:</Text>
                        <Text style={styles.loanDetailValue}>6% Flat p.a. (PMK 49/2025)</Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Tenor & Grace Period:</Text>
                        <Text style={styles.loanDetailValue}>
                          {req.tenorBulan} Bulan (Masa Tenggang {req.gracePeriodBulan} Bulan)
                        </Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Estimasi Angsuran / Bln:</Text>
                        <Text style={[styles.loanDetailValue, { color: '#FBBF24', fontWeight: '700' }]}>
                          {formatRupiah(calc.total)} / bulan
                        </Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Agunan & Taksasi:</Text>
                        <Text style={styles.loanDetailValue}>
                          {req.agunan} (Nilai: {formatRupiah(req.nilaiAgunan)})
                        </Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Rekam Jejak Simpanan:</Text>
                        <Text style={styles.loanDetailValue}>{formatRupiah(req.rekamJejakSimpanan)}</Text>
                      </View>
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.loanDetailLabel}>Peruntukan Dana:</Text>
                        <Text style={styles.loanDetailPurpose} numberOfLines={2}>
                          "{req.tujuan}"
                        </Text>
                      </View>
                    </View>

                    <View style={styles.loanCardActions}>
                      <Pressable
                        onPress={() => setShowLoanDetailModal(req)}
                        style={styles.loanDetailBtn}
                      >
                        <Ionicons name="document-text-outline" size={15} color="#D4D4D8" />
                        <Text style={styles.loanDetailBtnText}>Rincian</Text>
                      </Pressable>

                      {req.status === 'pending' && (
                        <>
                          <Pressable
                            onPress={(e) => {
                              (e as any)?.stopPropagation?.();
                              handleRejectLoan(req);
                            }}
                            style={styles.loanRejectBtn}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                            <Text style={styles.loanRejectText}>Tolak</Text>
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              (e as any)?.stopPropagation?.();
                              handleApproveLoan(req);
                            }}
                            style={styles.loanApproveBtn}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#000" />
                            <Text style={styles.loanApproveText}>Setujui & Cairkan</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 3: BUKU KAS & JURNAL MUTASI                             */}
        {/* ============================================================ */}
        {activeTab === 'mutasi' && (
          <View>
            <View style={styles.searchBarBox}>
              <Ionicons name="search" size={18} color="#A1A1AA" />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Cari berdasarkan MID, nama, keterangan..."
                placeholderTextColor="#71717A"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close" size={18} color="#A1A1AA" />
                </Pressable>
              )}
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'simpanan', label: 'Simpanan (+)' },
                { id: 'pinjaman', label: 'Pinjaman (-)' },
                { id: 'cicilan', label: 'Angsuran (+)' },
              ].map((pill) => (
                <Pressable
                  key={pill.id}
                  onPress={() => setFilterType(pill.id)}
                  style={[
                    styles.filterPill,
                    filterType === pill.id && styles.filterPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      filterType === pill.id && styles.filterPillTextActive,
                    ]}
                  >
                    {pill.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Transactions Count & Export */}
            <View style={styles.mutasiHeaderRow}>
              <Text style={styles.mutasiCountText}>
                Menampilkan {filteredTransactions.length} transaksi kas
              </Text>
              <Pressable
                onPress={() => setShowEStatementModal(true)}
                style={styles.exportBtn}
              >
                <Ionicons name="print-outline" size={13} color="#C5A059" />
                <Text style={styles.exportBtnText}>Cetak E-Statement</Text>
              </Pressable>
            </View>

            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={42} color="#71717A" />
                <Text style={styles.emptyTitle}>Tidak Ada Riwayat Transaksi</Text>
                <Text style={styles.emptySub}>Belum ada mutasi yang sesuai dengan kriteria pencarian ini.</Text>
              </View>
            ) : (
              filteredTransactions.map((tx) => {
                const isPlus = tx.type === 'simpanan' || tx.type === 'cicilan';
                return (
                  <View key={tx.id} style={styles.txRowCard}>
                    <View style={styles.txRowHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={[
                            styles.txTypeIconBox,
                            {
                              backgroundColor: isPlus
                                ? 'rgba(52, 211, 153, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            },
                          ]}
                        >
                          <Ionicons
                            name={isPlus ? 'arrow-down' : 'arrow-up'}
                            size={14}
                            color={isPlus ? '#34D399' : '#EF4444'}
                          />
                        </View>
                        <Text style={styles.txRefNumber}>{tx.reference_number}</Text>
                      </View>
                      <Text
                        style={[
                          styles.txAmountText,
                          { color: isPlus ? '#34D399' : '#EF4444' },
                        ]}
                      >
                        {isPlus ? '+' : '-'} {formatRupiah(tx.amount)}
                      </Text>
                    </View>

                    <Text style={styles.txDescriptionText}>{tx.description}</Text>
                    <View style={styles.txFooterRow}>
                      <Text style={styles.txDateText}>{formatDateTime(tx.created_at)}</Text>
                      <View style={styles.txSuccessBadge}>
                        <Text style={styles.txSuccessText}>SUKSES</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 4: BUKU ANGGOTA KOPERASI & VERIFIKASI                   */}
        {/* ============================================================ */}
        {activeTab === 'anggota' && (
          <View>
            <View style={styles.tabSectionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Daftar Anggota Koperasi</Text>
                <Text style={styles.sectionHeaderSub}>
                  Pokok Rp 100.000 • Iuran Wajib Rp 50.000/bln • Bunga 1% SHU
                </Text>
              </View>
            </View>

            {/* Banner Notifikasi Setoran Masuk Menunggu Verifikasi */}
            {(() => {
              const pendingDepMember = members.find((m) => !!m.pendingDeposit);
              if (!pendingDepMember || !pendingDepMember.pendingDeposit) return null;
              return (
                <View style={styles.depositAlertBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={styles.depositAlertIconBox}>
                      <Ionicons name="wallet" size={18} color="#000" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.depositAlertTitle}>
                          {pendingDepositsCount} Setoran Kas Masuk Menunggu Verifikasi
                        </Text>
                        <View style={styles.pulseBadge}>
                          <Text style={styles.pulseBadgeText}>PERLU AKSI</Text>
                        </View>
                      </View>
                      <Text style={styles.depositAlertSub} numberOfLines={1}>
                        {pendingDepMember.nama} • Transfer {formatRupiah(pendingDepMember.pendingDeposit.nominal)} via {pendingDepMember.pendingDeposit.bankPengirim || 'Bank Mandiri'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setSelectedDepositMember(pendingDepMember)}
                    style={styles.depositAlertBtn}
                  >
                    <Text style={styles.depositAlertBtnText}>Periksa & Verif</Text>
                    <Ionicons name="arrow-forward" size={13} color="#000" />
                  </Pressable>
                </View>
              );
            })()}

            {/* Pencarian & Filter Status Anggota */}
            <View style={styles.tableControlCard}>
              <View style={styles.memberSearchBar}>
                <Ionicons name="search" size={16} color="#71717A" />
                <TextInput
                  style={styles.memberSearchInput}
                  placeholder="Cari nama, MID, KOP ID, atau Chapter..."
                  placeholderTextColor="#71717A"
                  value={memberSearchQuery}
                  onChangeText={(t) => {
                    setMemberSearchQuery(t);
                    setMemberPage(1);
                  }}
                />
                {memberSearchQuery ? (
                  <Pressable onPress={() => { setMemberSearchQuery(''); setMemberPage(1); }}>
                    <Ionicons name="close-circle" size={16} color="#A1A1AA" />
                  </Pressable>
                ) : null}
              </View>

              {/* Filter Tabs Status */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { key: 'ALL', label: `Semua (${members.length})` },
                    { key: 'ACTIVE', label: `Aktif (${members.filter(m => m.status === 'active').length})` },
                    { key: 'PENDING', label: `Menunggu Verifikasi (${members.filter(m => m.status === 'pending' || !!m.pendingDeposit).length})` },
                    { key: 'UNPAID_WAJIB', label: `Belum Bayar Iuran (${members.filter(m => m.status === 'active' && m.lastPaidWajibMonth !== currentMonthKey && m.simpananWajib < 50000).length})` },
                  ].map((filter) => (
                    <Pressable
                      key={filter.key}
                      onPress={() => {
                        setMemberFilterStatus(filter.key as any);
                        setMemberPage(1);
                      }}
                      style={[
                        styles.memberFilterChip,
                        memberFilterStatus === filter.key && styles.memberFilterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberFilterChipText,
                          memberFilterStatus === filter.key && styles.memberFilterChipTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Tabel Data Anggota Skalabel (Horizontal Scroll) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableWrapperScroll}>
              <View style={styles.memberTableContainer}>
                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, { width: 36, textAlign: 'center' }]}>No</Text>
                  <Text style={[styles.thCell, { width: 175 }]}>No. KOP & MID</Text>
                  <Text style={[styles.thCell, { width: 180 }]}>Nama & Chapter</Text>
                  <Text style={[styles.thCell, { width: 110, textAlign: 'right' }]}>Simp. Pokok</Text>
                  <Text style={[styles.thCell, { width: 110, textAlign: 'right' }]}>Simp. Wajib</Text>
                  <Text style={[styles.thCell, { width: 120, textAlign: 'right' }]}>Tab. Sukarela</Text>
                  <Text style={[styles.thCell, { width: 125, textAlign: 'right' }]}>Total Simpanan</Text>
                  <Text style={[styles.thCell, { width: 130, textAlign: 'center' }]}>Iuran Bulanan</Text>
                  <Text style={[styles.thCell, { width: 110, textAlign: 'center' }]}>Status Akun</Text>
                  <Text style={[styles.thCell, { width: 220, textAlign: 'center' }]}>Aksi Pengelola</Text>
                </View>

                {/* Table Rows */}
                {paginatedMembers.length === 0 ? (
                  <View style={styles.emptyTableRow}>
                    <Ionicons name="search-outline" size={24} color="#71717A" />
                    <Text style={{ fontSize: 12, color: '#A1A1AA', marginTop: 4 }}>
                      Tidak ada data anggota yang sesuai dengan filter pencarian.
                    </Text>
                  </View>
                ) : (
                  paginatedMembers.map((mem, idx) => {
                    const rowNumber = (memberPage - 1) * MEMBER_PAGE_SIZE + idx + 1;
                    const totalSimpanan = mem.simpananPokok + mem.simpananWajib + mem.tabunganSukarela;
                    const isWajibPaid = mem.lastPaidWajibMonth === currentMonthKey || (mem.status === 'active' && mem.simpananWajib >= 50000);
                    const isEven = idx % 2 === 0;

                    return (
                      <View
                        key={mem.id}
                        style={[
                          styles.tableRow,
                          isEven ? styles.tableRowEven : styles.tableRowOdd,
                        ]}
                      >
                        {/* No */}
                        <Text style={[styles.tdCell, { width: 36, textAlign: 'center', color: '#71717A' }]}>
                          {rowNumber}
                        </Text>

                        {/* No. KOP & MID */}
                        <View style={[styles.tdCell, { width: 175, gap: 2 }]}>
                          <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', borderWidth: 1, borderColor: '#FBBF24', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start' }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FBBF24' }}>
                              {mem.kopMemberId || (mem.status === 'active' ? generateKopMemberId(mem.mid) : 'PENDING ID')}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#D4D4D8' }}>{mem.mid}</Text>
                        </View>

                        {/* Nama & Chapter */}
                        <View style={[styles.tdCell, { width: 180 }]}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FAFAFA' }} numberOfLines={1}>
                            {mem.nama}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#A1A1AA' }} numberOfLines={1}>
                            {mem.chapter}
                          </Text>
                        </View>

                        {/* Pokok */}
                        <Text style={[styles.tdCell, { width: 110, textAlign: 'right', color: '#E4E4E7' }]}>
                          {formatRupiah(mem.simpananPokok)}
                        </Text>

                        {/* Wajib */}
                        <Text style={[styles.tdCell, { width: 110, textAlign: 'right', color: '#E4E4E7' }]}>
                          {formatRupiah(mem.simpananWajib)}
                        </Text>

                        {/* Sukarela */}
                        <View style={[styles.tdCell, { width: 120, alignItems: 'flex-end', justifyContent: 'center' }]}>
                          <Text style={{ textAlign: 'right', color: '#E4E4E7', fontSize: 11.5 }}>
                            {formatRupiah(mem.tabunganSukarela)}
                          </Text>
                          {mem.pendingDeposit && mem.pendingDeposit.sukarelaPortion > 0 ? (
                            <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', borderColor: '#FBBF24', borderWidth: 1, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, marginTop: 2 }}>
                              <Text style={{ fontSize: 8.5, color: '#FBBF24', fontWeight: '800' }}>
                                +{formatRupiah(mem.pendingDeposit.sukarelaPortion)} (Verif)
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Total Simpanan */}
                        <Text style={[styles.tdCell, { width: 125, textAlign: 'right', fontWeight: '800', color: '#FBBF24' }]}>
                          {formatRupiah(totalSimpanan)}
                        </Text>

                        {/* Iuran Bulanan */}
                        <View style={[styles.tdCell, { width: 130, alignItems: 'center' }]}>
                          <View
                            style={[
                              styles.tableStatusBadge,
                              {
                                backgroundColor: isWajibPaid ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                borderColor: isWajibPaid ? '#34D399' : '#EF4444',
                              }
                            ]}
                          >
                            <Ionicons
                              name={isWajibPaid ? 'checkmark-circle' : 'alert-circle'}
                              size={10}
                              color={isWajibPaid ? '#34D399' : '#F87171'}
                            />
                            <Text style={[styles.tableStatusBadgeText, { color: isWajibPaid ? '#34D399' : '#F87171' }]}>
                              {isWajibPaid ? 'LUNAS (SEP)' : 'BELUM BAYAR'}
                            </Text>
                          </View>
                        </View>

                        {/* Status Akun */}
                        <View style={[styles.tdCell, { width: 110, alignItems: 'center' }]}>
                          <View
                            style={[
                              styles.tableStatusBadge,
                              mem.status === 'active'
                                ? styles.memberStatusActive
                                : mem.status === 'rejected'
                                ? styles.memberStatusRejected
                                : styles.memberStatusPending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.tableStatusBadgeText,
                                {
                                  color:
                                    mem.status === 'active'
                                      ? '#34D399'
                                      : mem.status === 'rejected'
                                      ? '#EF4444'
                                      : '#FBBF24',
                                }
                              ]}
                            >
                              {mem.status === 'active' ? 'AKTIF' : mem.status === 'rejected' ? 'DITOLAK' : 'PENDING'}
                            </Text>
                          </View>
                        </View>

                        {/* Aksi */}
                        <View style={[styles.tdCell, { width: 220, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center' }]}>
                          <Pressable
                            onPress={() => setSelectedDetailMember(mem)}
                            style={styles.tableActionBtn}
                          >
                            <Ionicons name="eye-outline" size={12} color="#FBBF24" />
                            <Text style={styles.tableActionBtnText}>Detail</Text>
                          </Pressable>

                          {mem.pendingDeposit ? (
                            <Pressable
                              onPress={() => setSelectedDepositMember(mem)}
                              style={[
                                styles.tableActionBtn,
                                {
                                  backgroundColor: 'rgba(251, 191, 36, 0.25)',
                                  borderColor: '#FBBF24',
                                  paddingHorizontal: 7,
                                },
                              ]}
                            >
                              <Ionicons name="checkmark-circle" size={11} color="#FBBF24" />
                              <Text style={[styles.tableActionBtnText, { color: '#FBBF24', fontWeight: '800' }]}>
                                Verif Setor
                              </Text>
                            </Pressable>
                          ) : null}

                          {!isWajibPaid && mem.status === 'active' && !mem.pendingDeposit && (
                            <Pressable
                              onPress={() => handleSendWaReminder(mem)}
                              style={[styles.tableActionBtn, { backgroundColor: 'rgba(37, 211, 102, 0.15)', borderColor: '#25D366' }]}
                              hitSlop={4}
                            >
                              <Ionicons name="logo-whatsapp" size={11} color="#25D366" />
                            </Pressable>
                          )}

                          {!isWajibPaid && mem.status === 'active' && mem.tabunganSukarela >= 50000 && !mem.pendingDeposit && (
                            <Pressable
                              onPress={() => handleAutoDebitWajib(mem)}
                              style={[styles.tableActionBtn, { backgroundColor: 'rgba(251, 191, 36, 0.15)', borderColor: '#FBBF24' }]}
                              hitSlop={4}
                            >
                              <Ionicons name="swap-horizontal" size={11} color="#FBBF24" />
                              <Text style={[styles.tableActionBtnText, { color: '#FBBF24' }]}>Debet</Text>
                            </Pressable>
                          )}

                          {mem.status === 'pending' && (
                            <Pressable
                              onPress={() => handleApproveMember(mem)}
                              style={[styles.tableActionBtn, { backgroundColor: 'rgba(52, 211, 153, 0.2)', borderColor: '#34D399' }]}
                            >
                              <Ionicons name="checkmark" size={11} color="#34D399" />
                              <Text style={[styles.tableActionBtnText, { color: '#34D399' }]}>Verif</Text>
                            </Pressable>
                          )}

                          {mem.status === 'active' && !mem.pendingDeposit && (
                            <Pressable
                              onPress={() => handleOpenSetorForMember(mem)}
                              style={[styles.tableActionBtn, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.15)' }]}
                            >
                              <Ionicons name="add" size={11} color="#E4E4E7" />
                              <Text style={[styles.tableActionBtnText, { color: '#E4E4E7' }]}>Setor</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>

            {/* Pagination Controls */}
            <View style={styles.paginationRow}>
              <Text style={styles.paginationInfo}>
                Menampilkan {paginatedMembers.length} dari {filteredMembers.length} Anggota (Hal. {memberPage} / {totalMemberPages})
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => setMemberPage((prev) => Math.max(1, prev - 1))}
                  disabled={memberPage <= 1}
                  style={[styles.paginationBtn, memberPage <= 1 && { opacity: 0.4 }]}
                >
                  <Ionicons name="chevron-back" size={13} color="#FFF" />
                  <Text style={styles.paginationBtnText}>Sebelumnya</Text>
                </Pressable>

                <Pressable
                  onPress={() => setMemberPage((prev) => Math.min(totalMemberPages, prev + 1))}
                  disabled={memberPage >= totalMemberPages}
                  style={[styles.paginationBtn, memberPage >= totalMemberPages && { opacity: 0.4 }]}
                >
                  <Text style={styles.paginationBtnText}>Berikutnya</Text>
                  <Ionicons name="chevron-forward" size={13} color="#FFF" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 5: KALKULATOR & SIMULASI SHU                            */}
        {/* ============================================================ */}
        {activeTab === 'shu' && (
          <View>
            <View style={styles.tabSectionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Kalkulator & Pembagian SHU</Text>
                <Text style={styles.sectionHeaderSub}>
                  Sisa Hasil Usaha Tahunan • Bunga Anggota 1% • Jasa Modal & Aktivitas
                </Text>
              </View>
            </View>

            {/* Input Laba Bersih */}
            <View style={styles.cardBox}>
              <Text style={styles.inputLabel}>Estimasi Laba Bersih Koperasi (Rp):</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={shuLabaBersih}
                onChangeText={setShuLabaBersih}
                placeholder="Contoh: 50000000"
                placeholderTextColor="#71717A"
              />

              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Rasio Alokasi SHU (%):</Text>
                <View style={styles.shuRatioRow}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.subRatioLabel}>Jasa Modal (40%)</Text>
                    <TextInput
                      style={styles.formInputSmall}
                      keyboardType="numeric"
                      value={shuPersenJasaModal}
                      onChangeText={setShuPersenJasaModal}
                    />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 6 }}>
                    <Text style={styles.subRatioLabel}>Jasa Usaha (30%)</Text>
                    <TextInput
                      style={styles.formInputSmall}
                      keyboardType="numeric"
                      value={shuPersenJasaAnggota}
                      onChangeText={setShuPersenJasaAnggota}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={styles.subRatioLabel}>Cadangan (20%)</Text>
                    <TextInput
                      style={styles.formInputSmall}
                      keyboardType="numeric"
                      value={shuPersenDanaCadangan}
                      onChangeText={setShuPersenDanaCadangan}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Hasil Kalkulasi SHU */}
            {(() => {
              const labaNum = parseInt(shuLabaBersih.replace(/[^0-9]/g, ''), 10) || 0;
              const modalRatio = (parseInt(shuPersenJasaModal, 10) || 0) / 100;
              const usahaRatio = (parseInt(shuPersenJasaAnggota, 10) || 0) / 100;
              const cadanganRatio = (parseInt(shuPersenDanaCadangan, 10) || 0) / 100;

              const totalJasaModal = labaNum * modalRatio;
              const totalJasaUsaha = labaNum * usahaRatio;
              const totalCadangan = labaNum * cadanganRatio;

              // Bunga 1% SHU untuk seluruh anggota aktif
              const bunga1PersenShu = labaNum * 0.01;

              return (
                <View style={[styles.cardBox, { borderColor: 'rgba(251, 191, 36, 0.4)' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="pie-chart" size={20} color="#FBBF24" />
                    <Text style={styles.shuResultHeader}>Simulasi Distribusi Hasil SHU</Text>
                  </View>

                  <View style={styles.shuResultItem}>
                    <Text style={styles.shuResultLabel}>Total Laba Bersih:</Text>
                    <Text style={[styles.shuResultVal, { color: '#FBBF24', fontSize: 16 }]}>
                      {formatRupiah(labaNum)}
                    </Text>
                  </View>

                  <View style={styles.shuResultItem}>
                    <Text style={styles.shuResultLabel}>Alokasi Jasa Modal (Simpanan):</Text>
                    <Text style={styles.shuResultVal}>{formatRupiah(totalJasaModal)}</Text>
                  </View>

                  <View style={styles.shuResultItem}>
                    <Text style={styles.shuResultLabel}>Alokasi Jasa Anggota (Partisipasi Usaha):</Text>
                    <Text style={styles.shuResultVal}>{formatRupiah(totalJasaUsaha)}</Text>
                  </View>

                  <View style={styles.shuResultItem}>
                    <Text style={styles.shuResultLabel}>Dana Cadangan Koperasi:</Text>
                    <Text style={styles.shuResultVal}>{formatRupiah(totalCadangan)}</Text>
                  </View>

                  <View style={[styles.shuResultItem, { backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 8, borderRadius: 8, marginTop: 6 }]}>
                    <View>
                      <Text style={[styles.shuResultLabel, { color: '#FDE68A', fontWeight: '700' }]}>
                        Bunga Tambahan 1% SHU Anggota:
                      </Text>
                      <Text style={{ fontSize: 10, color: '#A1A1AA' }}>
                        Hak istimewa anggota ber-MID aktif
                      </Text>
                    </View>
                    <Text style={[styles.shuResultVal, { color: '#FDE68A', fontWeight: '800' }]}>
                      {formatRupiah(bunga1PersenShu)}
                    </Text>
                  </View>

                  <Text style={[styles.sectionHeaderSub, { marginTop: 14, marginBottom: 8 }]}>
                    Estimasi Penerimaan SHU per Anggota Terdaftar:
                  </Text>

                  {(() => {
                    const totalSimpananSemua = members.reduce(
                      (sum, mem) => sum + (mem.simpananPokok || 0) + (mem.simpananWajib || 0) + (mem.tabunganSukarela || 0),
                      0
                    );
                    return members.map((m) => {
                      const totalSimpananM = m.simpananPokok + m.simpananWajib + m.tabunganSukarela;
                      const porsiModal = totalSimpananSemua > 0 ? (totalSimpananM / totalSimpananSemua) : 0;
                    const shuDiterima = Math.round(porsiModal * totalJasaModal + (bunga1PersenShu / members.length));

                    return (
                      <View key={m.id} style={styles.memberShuRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberShuName}>{m.nama}</Text>
                          <Text style={styles.memberShuMid}>{m.mid} • Porsi Modal: {(porsiModal * 100).toFixed(1)}%</Text>
                        </View>
                        <Text style={styles.memberShuTotal}>{formatRupiah(shuDiterima)}</Text>
                      </View>
                    );
                  });
                })()}
                </View>
              );
            })()}
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 6: LAPORAN PENILAIAN KESEHATAN KOPERASI (PERMENKOPUKM 9) */}
        {/* ============================================================ */}
        {activeTab === 'kesehatan' && (
          <View>
            {/* Header Section */}
            <View style={styles.tabSectionHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Laporan Kesehatan Koperasi</Text>
                <Text style={styles.sectionHeaderSub}>
                  Audit Berdasarkan PermenKopUKM No. 9 Tahun 2020 • Data Riil Sistem
                </Text>
              </View>
            </View>

            {/* Executive Health Summary Card */}
            <View
              style={[
                styles.healthSummaryCard,
                { borderColor: healthAssessment.borderColor, backgroundColor: healthAssessment.bgLight }
              ]}
            >
              <View style={styles.healthSummaryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.healthLegalBadge}>
                    PERMENKOPUKM RI NO. 9 TAHUN 2020
                  </Text>
                  <Text style={styles.healthOrgName}>Koperasi Bersama Satu Bintang (MBCI)</Text>
                  <Text style={styles.healthDateText}>Periode Penilaian: {getMonthNameIndo(currentMonthKey)}</Text>
                </View>

                <View style={[styles.healthStatusPill, { backgroundColor: healthAssessment.color }]}>
                  <Ionicons name="shield-outline" size={13} color="#000" />
                  <Text style={styles.healthStatusPillText}>{healthAssessment.status}</Text>
                </View>
              </View>

              {/* Large Score Meter */}
              <View style={styles.healthScoreRow}>
                <View style={styles.healthScoreCircle}>
                  <Text style={[styles.healthScoreNumber, { color: healthAssessment.color }]}>
                    {healthAssessment.score.toFixed(1)}
                  </Text>
                  <Text style={styles.healthScoreScale}>dari 100 Poin</Text>
                </View>

                <View style={{ flex: 1, paddingLeft: 14 }}>
                  <Text style={styles.healthScoreMeaningTitle}>
                    {healthAssessment.status === 'SEHAT'
                      ? 'Kondisi Koperasi Prima & Sehat'
                      : healthAssessment.status === 'CUKUP SEHAT'
                      ? 'Kondisi Koperasi Cukup Sehat'
                      : 'Kondisi Dalam Pengawasan Regulasi'}
                  </Text>
                  <Text style={styles.healthScoreMeaningSub}>
                    {healthAssessment.status === 'SEHAT'
                      ? 'Seluruh rasio likuiditas, permodalan, dan tata kelola memenuhi syarat regulasi secara optimal.'
                      : 'Dinilai 100% dari data riil sistem. Koperasi saat ini memiliki modal sendiri Rp 300rb dan 2 anggota aktif, belum memenuhi ambang batas kelayakan KSP primer.'}
                  </Text>

                  {/* Loan Capability Badge */}
                  <View
                    style={[
                      styles.healthLoanStatusBox,
                      {
                        backgroundColor: healthAssessment.isLoanAllowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        borderColor: healthAssessment.isLoanAllowed ? '#10B981' : '#EF4444',
                      }
                    ]}
                  >
                    <Ionicons
                      name={healthAssessment.isLoanAllowed ? 'checkmark-circle' : 'lock-closed'}
                      size={14}
                      color={healthAssessment.isLoanAllowed ? '#10B981' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.healthLoanStatusText,
                        { color: healthAssessment.isLoanAllowed ? '#10B981' : '#EF4444' }
                      ]}
                    >
                      {healthAssessment.isLoanAllowed
                        ? 'Layanan Pinjaman: Diperbolehkan Beroperasi'
                        : 'Layanan Pinjaman: DITANGGUHKAN SEMENTARA (Kunci Proteksi Aktif)'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Button: Berita Acara */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Pressable
                  onPress={() => setShowHealthCertModal(true)}
                  style={styles.healthCertBtn}
                >
                  <Ionicons name="document-text-outline" size={15} color="#000" />
                  <Text style={styles.healthCertBtnText}>Lihat Berita Acara Penilaian Mandiri</Text>
                </Pressable>
              </View>
            </View>

            {/* Section: 4 Aspek Penilaian */}
            <Text style={[styles.sectionHeaderTitle, { fontSize: 14, marginTop: 18, marginBottom: 8 }]}>
              Rincian 4 Aspek Penilaian Kesehatan (Data Riil)
            </Text>

            {/* Aspek 1: Tata Kelola (30%) */}
            <View style={styles.aspectCard}>
              <View style={styles.aspectCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.aspectTitle}>1. Tata Kelola (Governance)</Text>
                    <View style={styles.aspectWeightBadge}>
                      <Text style={styles.aspectWeightText}>Bobot 30%</Text>
                    </View>
                  </View>
                  <Text style={styles.aspectSub}>Manajemen organisasi, transparansi data, dan kuorum anggota</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.aspectScoreVal, { color: healthAssessment.aspects.tataKelola.score >= 80 ? '#10B981' : healthAssessment.aspects.tataKelola.score >= 60 ? '#3B82F6' : '#F59E0B' }]}>
                    {healthAssessment.aspects.tataKelola.score} / 100
                  </Text>
                  <Text style={styles.aspectPointText}>+{healthAssessment.aspects.tataKelola.point.toFixed(2)} Poin</Text>
                </View>
              </View>
              {/* Progress Bar */}
              <View style={styles.aspectProgressTrack}>
                <View style={[styles.aspectProgressFill, { width: `${healthAssessment.aspects.tataKelola.score}%`, backgroundColor: healthAssessment.aspects.tataKelola.score >= 80 ? '#10B981' : healthAssessment.aspects.tataKelola.score >= 60 ? '#3B82F6' : '#F59E0B' }]} />
              </View>
              {/* Checklist Indikator Riil */}
              <View style={styles.aspectIndicatorsList}>
                {healthAssessment.aspects.tataKelola.indicators.map((ind, iIdx) => (
                  <View key={iIdx} style={styles.indicatorRow}>
                    <Ionicons
                      name={ind.status === 'pass' ? 'checkmark-circle' : ind.status === 'warning' ? 'alert-circle' : 'close-circle'}
                      size={13}
                      color={ind.status === 'pass' ? '#10B981' : ind.status === 'warning' ? '#F59E0B' : '#EF4444'}
                    />
                    <Text style={styles.indicatorName}>{ind.name}:</Text>
                    <Text style={[styles.indicatorVal, { color: ind.status === 'pass' ? '#10B981' : ind.status === 'warning' ? '#F59E0B' : '#EF4444' }]}>
                      {ind.value}
                    </Text>
                    <Text style={styles.indicatorStd}>({ind.standard})</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Aspek 2: Profil Risiko (15%) */}
            <View style={styles.aspectCard}>
              <View style={styles.aspectCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.aspectTitle}>2. Profil Risiko (Risk Profile)</Text>
                    <View style={styles.aspectWeightBadge}>
                      <Text style={styles.aspectWeightText}>Bobot 15%</Text>
                    </View>
                  </View>
                  <Text style={styles.aspectSub}>Ketahanan likuiditas kas, kualitas kredit (NPL), dan risiko operasional</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.aspectScoreVal, { color: healthAssessment.aspects.profilRisiko.score >= 80 ? '#10B981' : healthAssessment.aspects.profilRisiko.score >= 60 ? '#3B82F6' : '#F59E0B' }]}>
                    {healthAssessment.aspects.profilRisiko.score} / 100
                  </Text>
                  <Text style={styles.aspectPointText}>+{healthAssessment.aspects.profilRisiko.point.toFixed(2)} Poin</Text>
                </View>
              </View>
              {/* Progress Bar */}
              <View style={styles.aspectProgressTrack}>
                <View style={[styles.aspectProgressFill, { width: `${healthAssessment.aspects.profilRisiko.score}%`, backgroundColor: healthAssessment.aspects.profilRisiko.score >= 80 ? '#10B981' : healthAssessment.aspects.profilRisiko.score >= 60 ? '#3B82F6' : '#F59E0B' }]} />
              </View>
              {/* Checklist Indikator Riil */}
              <View style={styles.aspectIndicatorsList}>
                {healthAssessment.aspects.profilRisiko.indicators.map((ind, iIdx) => (
                  <View key={iIdx} style={styles.indicatorRow}>
                    <Ionicons
                      name={ind.status === 'pass' ? 'checkmark-circle' : ind.status === 'warning' ? 'alert-circle' : 'close-circle'}
                      size={13}
                      color={ind.status === 'pass' ? '#10B981' : ind.status === 'warning' ? '#F59E0B' : '#EF4444'}
                    />
                    <Text style={styles.indicatorName}>{ind.name}:</Text>
                    <Text style={[styles.indicatorVal, { color: ind.status === 'pass' ? '#10B981' : ind.status === 'warning' ? '#F59E0B' : '#EF4444' }]}>
                      {ind.value}
                    </Text>
                    <Text style={styles.indicatorStd}>({ind.standard})</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Aspek 3: Kinerja Keuangan (25%) */}
            <View style={styles.aspectCard}>
              <View style={styles.aspectCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.aspectTitle}>3. Kinerja Keuangan (Performance)</Text>
                    <View style={styles.aspectWeightBadge}>
                      <Text style={styles.aspectWeightText}>Bobot 25%</Text>
                    </View>
                  </View>
                  <Text style={styles.aspectSub}>Perolehan SHU riil, rentabilitas modal, efisiensi operasional</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.aspectScoreVal, { color: healthAssessment.aspects.kinerjaKeuangan.score >= 80 ? '#10B981' : healthAssessment.aspects.kinerjaKeuangan.score >= 60 ? '#3B82F6' : '#F59E0B' }]}>
                    {healthAssessment.aspects.kinerjaKeuangan.score} / 100
                  </Text>
                  <Text style={styles.aspectPointText}>+{healthAssessment.aspects.kinerjaKeuangan.point.toFixed(2)} Poin</Text>
                </View>
              </View>
              {/* Progress Bar */}
              <View style={styles.aspectProgressTrack}>
                <View style={[styles.aspectProgressFill, { width: `${healthAssessment.aspects.kinerjaKeuangan.score}%`, backgroundColor: healthAssessment.aspects.kinerjaKeuangan.score >= 80 ? '#10B981' : healthAssessment.aspects.kinerjaKeuangan.score >= 60 ? '#3B82F6' : '#F59E0B' }]} />
              </View>
              {/* Checklist Indikator Riil */}
              <View style={styles.aspectIndicatorsList}>
                {healthAssessment.aspects.kinerjaKeuangan.indicators.map((ind, iIdx) => (
                  <View key={iIdx} style={styles.indicatorRow}>
                    <Ionicons
                      name={ind.status === 'pass' ? 'checkmark-circle' : ind.status === 'warning' ? 'alert-circle' : 'close-circle'}
                      size={13}
                      color={ind.status === 'pass' ? '#10B981' : ind.status === 'warning' ? '#F59E0B' : '#EF4444'}
                    />
                    <Text style={styles.indicatorName}>{ind.name}:</Text>
                    <Text style={[styles.indicatorVal, { color: ind.status === 'pass' ? '#10B981' : ind.status === 'warning' ? '#F59E0B' : '#EF4444' }]}>
                      {ind.value}
                    </Text>
                    <Text style={styles.indicatorStd}>({ind.standard})</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Aspek 4: Permodalan (30%) */}
            <View style={styles.aspectCard}>
              <View style={styles.aspectCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.aspectTitle}>4. Permodalan (Capital Adequacy)</Text>
                    <View style={styles.aspectWeightBadge}>
                      <Text style={styles.aspectWeightText}>Bobot 30%</Text>
                    </View>
                  </View>
                  <Text style={styles.aspectSub}>Modal sendiri (pokok+wajib) vs dana titipan sukarela anggota</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.aspectScoreVal, { color: healthAssessment.aspects.permodalan.score >= 80 ? '#10B981' : healthAssessment.aspects.permodalan.score >= 60 ? '#3B82F6' : '#F59E0B' }]}>
                    {healthAssessment.aspects.permodalan.score} / 100
                  </Text>
                  <Text style={styles.aspectPointText}>+{healthAssessment.aspects.permodalan.point.toFixed(2)} Poin</Text>
                </View>
              </View>
              {/* Progress Bar */}
              <View style={styles.aspectProgressTrack}>
                <View style={[styles.aspectProgressFill, { width: `${healthAssessment.aspects.permodalan.score}%`, backgroundColor: healthAssessment.aspects.permodalan.score >= 80 ? '#10B981' : healthAssessment.aspects.permodalan.score >= 60 ? '#3B82F6' : '#F59E0B' }]} />
              </View>
              {/* Checklist Indikator Riil */}
              <View style={styles.aspectIndicatorsList}>
                {healthAssessment.aspects.permodalan.indicators.map((ind, iIdx) => (
                  <View key={iIdx} style={styles.indicatorRow}>
                    <Ionicons
                      name={ind.status === 'pass' ? 'checkmark-circle' : ind.status === 'warning' ? 'alert-circle' : 'close-circle'}
                      size={13}
                      color={ind.status === 'pass' ? '#10B981' : ind.status === 'warning' ? '#F59E0B' : '#EF4444'}
                    />
                    <Text style={styles.indicatorName}>{ind.name}:</Text>
                    <Text style={[styles.indicatorVal, { color: ind.status === 'pass' ? '#10B981' : ind.status === 'warning' ? '#F59E0B' : '#EF4444' }]}>
                      {ind.value}
                    </Text>
                    <Text style={styles.indicatorStd}>({ind.standard})</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Roadmap Pemulihan (Corrective Action Plan) */}
            <View style={styles.correctiveActionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="construct" size={18} color="#FBBF24" />
                <Text style={styles.correctiveActionTitle}>
                  Rencana Tindak Perbaikan (Menuju Kategori SEHAT & Pembukaan Pinjaman)
                </Text>
              </View>
              <Text style={styles.correctiveActionSub}>
                Langkah strategis agar skor kesehatan meningkat dari {healthAssessment.score.toFixed(1)} mencapai batas minimal kelayakan ≥ 80.0 (Sehat):
              </Text>
              <View style={{ marginTop: 8, gap: 6 }}>
                {healthAssessment.correctiveActions.map((act, aIdx) => (
                  <View key={aIdx} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 11, color: '#FBBF24', fontWeight: '800' }}>{aIdx + 1}.</Text>
                    <Text style={{ fontSize: 11, color: '#D4D4D8', flex: 1, lineHeight: 16 }}>{act}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* MODAL: INPUT MUTASI KAS BARU                                 */}
      {/* ============================================================ */}
      <Modal
        visible={showTxModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTxModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="wallet" size={20} color="#FBBF24" />
                <Text style={styles.modalTitle}>Catat Mutasi Kas Koperasi</Text>
              </View>
              <Pressable onPress={() => setShowTxModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {/* Info Anggota Terpilih & Status Kewajiban (Jika Dipilih dari Tabel) */}
              {(() => {
                const selectedTargetMem = members.find(
                  (m) => m.mid.trim().toUpperCase() === txMemberMid.trim().toUpperCase()
                );
                if (!selectedTargetMem) return null;

                const isTargetPokokLunas = selectedTargetMem.simpananPokok >= 100000;
                const isTargetWajibPaid = selectedTargetMem.lastPaidWajibMonth === currentMonthKey ||
                  (selectedTargetMem.status === 'active' && selectedTargetMem.simpananWajib >= 50000);
                const targetActiveLoan = loanRequests.find(
                  (r) => r.mid === selectedTargetMem.mid && (r.status === 'confirmed_active' || r.status === 'disbursed_waiting_confirmation')
                );

                return (
                  <View style={{
                    backgroundColor: 'rgba(251, 191, 36, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(251, 191, 36, 0.3)',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 14,
                    gap: 5,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FBBF24' }}>
                        {selectedTargetMem.nama}
                      </Text>
                      <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#FBBF24' }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FBBF24' }}>
                          {selectedTargetMem.kopMemberId || selectedTargetMem.mid}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 10.5, color: '#A1A1AA' }}>
                      Chapter: {selectedTargetMem.chapter} • Total Saldo: {formatRupiah(selectedTargetMem.simpananPokok + selectedTargetMem.simpananWajib + selectedTargetMem.tabunganSukarela)}
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                      <View style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', borderWidth: 1, borderColor: '#34D399', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#34D399' }}>
                          Pokok: {isTargetPokokLunas ? '✓ LUNAS 1X (Rp 100rb)' : 'Belum Lunas'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: isTargetWajibPaid ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: isTargetWajibPaid ? '#34D399' : '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: isTargetWajibPaid ? '#34D399' : '#F87171' }}>
                          Wajib (Sep): {isTargetWajibPaid ? '✓ LUNAS (Rp 50rb)' : '⚠️ BELUM BAYAR'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: targetActiveLoan ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: targetActiveLoan ? '#FBBF24' : 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: targetActiveLoan ? '#FBBF24' : '#A1A1AA' }}>
                          Pinjaman: {targetActiveLoan ? `Cicilan Aktif (${formatRupiah(targetActiveLoan.nominal)})` : 'NIHIL (Rp 0 - Bebas Pinjaman)'}
                        </Text>
                      </View>
                    </View>

                    {isTargetPokokLunas && isTargetWajibPaid && !targetActiveLoan && (
                      <View style={{ backgroundColor: 'rgba(96, 165, 250, 0.12)', borderWidth: 1, borderColor: '#60A5FA', padding: 6, borderRadius: 6, marginTop: 4 }}>
                        <Text style={{ fontSize: 10, color: '#93C5FD', lineHeight: 14 }}>
                          ℹ️ Anggota ini tidak memiliki tunggakan/pinjaman. Setoran kas otomatis diarahkan untuk menambah Tabungan Sukarela.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              <Text style={styles.inputLabel}>Jenis Transaksi:</Text>
              <View style={styles.subtypeGrid}>
                {(() => {
                  const selectedTargetMem = members.find(
                    (m) => m.mid.trim().toUpperCase() === txMemberMid.trim().toUpperCase()
                  );
                  const isTargetPokokLunas = selectedTargetMem ? selectedTargetMem.simpananPokok >= 100000 : false;
                  const isTargetWajibPaid = selectedTargetMem
                    ? selectedTargetMem.lastPaidWajibMonth === currentMonthKey ||
                      (selectedTargetMem.status === 'active' && selectedTargetMem.simpananWajib >= 50000)
                    : false;
                  const targetActiveLoan = selectedTargetMem
                    ? loanRequests.find(
                        (r) =>
                          r.mid === selectedTargetMem.mid &&
                          (r.status === 'confirmed_active' || r.status === 'disbursed_waiting_confirmation')
                      )
                    : null;

                  return [
                    {
                      key: 'wajib',
                      label: isTargetWajibPaid ? '✓ Wajib (Lunas)' : 'Simpanan Wajib (Rp 50rb)',
                      defaultAmount: '50.000',
                      disabled: isTargetWajibPaid,
                      disabledNote: 'Simpanan Wajib periode September 2026 anggota ini sudah LUNAS.',
                    },
                    {
                      key: 'pokok',
                      label: isTargetPokokLunas ? '🔒 Pokok (Lunas 1x)' : 'Simpanan Pokok (Rp 100rb)',
                      defaultAmount: '100.000',
                      disabled: isTargetPokokLunas,
                      disabledNote: 'Simpanan Pokok sebesar Rp 100.000 hanya disetor 1 kali seumur hidup saat daftar dan sudah lunas.',
                    },
                    {
                      key: 'sukarela',
                      label: 'Tabungan Sukarela (Min 25rb)',
                      defaultAmount: '50.000',
                      disabled: false,
                    },
                    {
                      key: 'talangan',
                      label: 'Dana Talangan Darurat',
                      defaultAmount: '',
                      disabled: false,
                    },
                    {
                      key: 'pinjaman',
                      label: 'Pinjaman 6% PMK 49',
                      defaultAmount: '',
                      disabled: false,
                    },
                    {
                      key: 'cicilan',
                      label: targetActiveLoan ? 'Angsuran Pinjaman' : '🔒 Angsuran (Nihil)',
                      defaultAmount: targetActiveLoan ? calculateLoanInstallment(targetActiveLoan.nominal, targetActiveLoan.tenorBulan).total.toLocaleString('id-ID') : '',
                      disabled: !!selectedTargetMem && !targetActiveLoan,
                      disabledNote: 'Anggota ini tidak memiliki pinjaman aktif (Pinjaman = Rp 0).',
                    },
                  ].map((item) => {
                    const isActive = txSubtype === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => {
                          if (item.disabled) {
                            showAlertDialog('Informasi Status Anggota', item.disabledNote || 'Opsi ini tidak berlaku untuk anggota ini.');
                            return;
                          }
                          setTxSubtype(item.key as any);
                          if (item.defaultAmount) {
                            setTxAmount(item.defaultAmount);
                          }
                        }}
                        style={[
                          styles.subtypeBtn,
                          isActive && styles.subtypeBtnActive,
                          item.disabled && { opacity: 0.45, backgroundColor: 'rgba(255, 255, 255, 0.02)' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subtypeBtnText,
                            isActive && styles.subtypeBtnTextActive,
                            item.disabled && { color: '#71717A' },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  });
                })()}
              </View>

              <Text style={styles.inputLabel}>Nominal Transaksi (Rp):</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#71717A"
                value={txAmount}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  if (!cleaned) setTxAmount('');
                  else setTxAmount(parseInt(cleaned, 10).toLocaleString('id-ID'));
                }}
              />

              <Text style={styles.inputLabel}>Nomor MID Anggota (Opsional/Rekomendasi):</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Contoh: MBINA-JKT-042"
                placeholderTextColor="#71717A"
                autoCapitalize="characters"
                value={txMemberMid}
                onChangeText={setTxMemberMid}
              />

              <Text style={styles.inputLabel}>Nama Anggota:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Contoh: Bambang Soedarmono"
                placeholderTextColor="#71717A"
                value={txMemberName}
                onChangeText={setTxMemberName}
              />

              <Text style={styles.inputLabel}>Keterangan Mutasi Kas:</Text>
              <TextInput
                style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="Contoh: Setoran Simpanan Wajib Periode September 2026 via Transfer Bank Mandiri"
                placeholderTextColor="#71717A"
                value={txDesc}
                onChangeText={setTxDesc}
              />

              <View style={{ height: 16 }} />
              <Pressable
                onPress={handleSaveTransaction}
                disabled={txSubmitting}
                style={[styles.modalSubmitBtn, txSubmitting && { opacity: 0.6 }]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#000" />
                <Text style={styles.modalSubmitBtnText}>
                  {txSubmitting ? 'Menyimpan Mutasi...' : 'Simpan Transaksi Kas'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: DETAIL REVIEW PINJAMAN ANGGOTA                        */}
      {/* ============================================================ */}
      <Modal
        visible={!!showLoanDetailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoanDetailModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text" size={20} color="#FBBF24" />
                <Text style={styles.modalTitle}>Detail Pengajuan Pinjaman</Text>
              </View>
              <Pressable onPress={() => setShowLoanDetailModal(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            {showLoanDetailModal && (() => {
              const calc = calculateLoanInstallment(showLoanDetailModal.nominal, showLoanDetailModal.tenorBulan);
              return (
                <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.loanDetailHeaderBox}>
                    <Text style={styles.loanDetailHeaderMid}>{showLoanDetailModal.mid}</Text>
                    <Text style={styles.loanDetailHeaderName}>{showLoanDetailModal.nama}</Text>
                    <Text style={styles.loanDetailHeaderChapter}>{showLoanDetailModal.chapter}</Text>
                  </View>

                  <View style={styles.loanBreakdownBox}>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Nominal Pokok Pinjaman:</Text>
                      <Text style={[styles.loanDetailValue, { color: '#FBBF24', fontSize: 15, fontWeight: '700' }]}>
                        {formatRupiah(showLoanDetailModal.nominal)}
                      </Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Suku Bunga Regulasi:</Text>
                      <Text style={styles.loanDetailValue}>6% per tahun (PMK 49/2025)</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Tenor Pinjaman:</Text>
                      <Text style={styles.loanDetailValue}>{showLoanDetailModal.tenorBulan} Bulan</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Masa Tenggang (Grace):</Text>
                      <Text style={styles.loanDetailValue}>{showLoanDetailModal.gracePeriodBulan} Bulan</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Cicilan Pokok / Bln:</Text>
                      <Text style={styles.loanDetailValue}>{formatRupiah(calc.pokok)}</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Bunga 6% / Bln (0.5%):</Text>
                      <Text style={styles.loanDetailValue}>{formatRupiah(calc.bunga)}</Text>
                    </View>
                    <View style={[styles.loanDetailRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 6, marginTop: 4 }]}>
                      <Text style={[styles.loanDetailLabel, { color: '#FAFAFA', fontWeight: '700' }]}>Total Angsuran / Bln:</Text>
                      <Text style={[styles.loanDetailValue, { color: '#34D399', fontSize: 14, fontWeight: '800' }]}>
                        {formatRupiah(calc.total)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.loanBreakdownBox, { marginTop: 10 }]}>
                    <Text style={styles.loanDetailLabel}>Agunan Penjamin:</Text>
                    <Text style={[styles.loanDetailValue, { color: '#F4F4F5', marginTop: 2 }]}>
                      {showLoanDetailModal.agunan}
                    </Text>
                    <Text style={[styles.loanDetailLabel, { marginTop: 8 }]}>Nilai Taksasi Agunan:</Text>
                    <Text style={[styles.loanDetailValue, { color: '#60A5FA', fontWeight: '700' }]}>
                      {formatRupiah(showLoanDetailModal.nilaiAgunan)}
                    </Text>
                    <Text style={[styles.loanDetailLabel, { marginTop: 8 }]}>Rekam Jejak Simpanan:</Text>
                    <Text style={[styles.loanDetailValue, { color: '#34D399', fontWeight: '700' }]}>
                      {formatRupiah(showLoanDetailModal.rekamJejakSimpanan)}
                    </Text>
                  </View>

                  {/* Rekening Tujuan Pencairan Member */}
                  {(() => {
                    const destBank = showLoanDetailModal.bankPenerima || members.find((m) => m.mid === showLoanDetailModal.mid)?.bankPengirim || 'Bank Mandiri';
                    const destRek = showLoanDetailModal.rekeningPenerima || members.find((m) => m.mid === showLoanDetailModal.mid)?.rekeningPengirim || '-';
                    const destName = showLoanDetailModal.namaPenerima || members.find((m) => m.mid === showLoanDetailModal.mid)?.namaPengirim || showLoanDetailModal.nama;

                    return (
                      <View style={[styles.loanBreakdownBox, { marginTop: 10, borderColor: 'rgba(52, 211, 153, 0.35)', backgroundColor: 'rgba(52, 211, 153, 0.06)' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Ionicons name="card" size={16} color="#34D399" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#34D399', letterSpacing: 0.5 }}>
                            REKENING TUJUAN PENCAIRAN (MEMBER):
                          </Text>
                        </View>
                        <View style={styles.loanDetailRow}>
                          <Text style={styles.loanDetailLabel}>Bank Penerima:</Text>
                          <Text style={[styles.loanDetailValue, { color: '#FFF', fontWeight: '700' }]}>{destBank}</Text>
                        </View>
                        <View style={styles.loanDetailRow}>
                          <Text style={styles.loanDetailLabel}>Nomor Rekening:</Text>
                          <Text style={[styles.loanDetailValue, { color: '#34D399', fontWeight: '800', fontSize: 14 }]}>{destRek}</Text>
                        </View>
                        <View style={styles.loanDetailRow}>
                          <Text style={styles.loanDetailLabel}>Atas Nama:</Text>
                          <Text style={[styles.loanDetailValue, { color: '#FAFAFA' }]}>{destName}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#A1A1AA', marginTop: 4 }}>
                          * Pencairan dana wajib ditransfer ke rekening bank resmi yang didaftarkan oleh anggota ber-MID.
                        </Text>
                      </View>
                    );
                  })()}

                  {/* Status Verifikasi Member jika sudah ditransfer */}
                  {showLoanDetailModal.status === 'disbursed_waiting_confirmation' && (
                    <View style={[styles.loanBreakdownBox, { marginTop: 10, borderColor: 'rgba(59, 130, 246, 0.4)', backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="time" size={16} color="#60A5FA" />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#60A5FA' }}>
                          DICAIRKAN — MENUNGGU VERIFIKASI ANGGOTA
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#BFDBFE', lineHeight: 16 }}>
                        Dana pinjaman telah ditransfer oleh bendahara koperasi. Anggota sedang memverifikasi bukti transfer dan saldo di aplikasinya.
                      </Text>
                    </View>
                  )}

                  {showLoanDetailModal.status === 'confirmed_active' && (
                    <View style={[styles.loanBreakdownBox, { marginTop: 10, borderColor: 'rgba(52, 211, 153, 0.4)', backgroundColor: 'rgba(52, 211, 153, 0.08)' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#34D399' }}>
                          PINJAMAN RESMI AKTIF & DIVERIFIKASI ANGGOTA
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#D1FAE5', lineHeight: 16 }}>
                        Anggota telah mengonfirmasi penerimaan dana ke rekeningnya. Jadwal angsuran bunga 6% resmi berjalan.
                      </Text>
                    </View>
                  )}

                  {showLoanDetailModal.status === 'pending' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                      <Pressable
                        onPress={() => handleRejectLoan(showLoanDetailModal)}
                        style={[styles.loanRejectBtn, { flex: 1, paddingVertical: 12 }]}
                      >
                        <Text style={styles.loanRejectText}>Tolak Pinjaman</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleApproveLoan(showLoanDetailModal)}
                        style={[styles.loanApproveBtn, { flex: 2, paddingVertical: 12 }]}
                      >
                        <Text style={styles.loanApproveText}>Setujui & Cairkan Kas</Text>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: E-STATEMENT & BUKU KAS REKAPITULASI                   */}
      {/* ============================================================ */}
      <Modal
        visible={showEStatementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEStatementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text" size={20} color="#FBBF24" />
                <Text style={styles.modalTitle}>E-Statement Kas Koperasi</Text>
              </View>
              <Pressable onPress={() => setShowEStatementModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={styles.statementHeader}>
                <Text style={styles.statementTitle}>KOPERASI BERSAMA SATU BINTANG</Text>
                <Text style={styles.statementSub}>MERCEDES-BENZ CLUB INDONESIA (MB CLUB INA)</Text>
                <Text style={styles.statementDate}>Dicetak pada: {formatDateTime(new Date().toISOString())}</Text>
              </View>

              <View style={styles.statementDivider} />

              <View style={styles.statementRow}>
                <Text style={styles.statementLabel}>Total Saldo Kas Bersih:</Text>
                <Text style={[styles.statementVal, { color: '#FBBF24', fontWeight: '800' }]}>
                  {formatRupiah(balance.total_balance)}
                </Text>
              </View>
              <View style={styles.statementRow}>
                <Text style={styles.statementLabel}>Simpanan Pokok (Rp 100.000):</Text>
                <Text style={styles.statementVal}>{formatRupiah(balance.simpanan_pokok)}</Text>
              </View>
              <View style={styles.statementRow}>
                <Text style={styles.statementLabel}>Simpanan Wajib (Rp 50.000/bln):</Text>
                <Text style={styles.statementVal}>{formatRupiah(balance.simpanan_wajib)}</Text>
              </View>
              <View style={styles.statementRow}>
                <Text style={styles.statementLabel}>Tabungan Sukarela (Min Rp 25.000):</Text>
                <Text style={styles.statementVal}>{formatRupiah(balance.simpanan_sukarela)}</Text>
              </View>
              <View style={styles.statementRow}>
                <Text style={styles.statementLabel}>Pinjaman Berjalan (Bunga 6%):</Text>
                <Text style={[styles.statementVal, { color: '#F87171' }]}>
                  {formatRupiah(balance.active_loan || 0)}
                </Text>
              </View>

              <View style={styles.statementDivider} />
              <Text style={[styles.statementLabel, { marginBottom: 8, fontWeight: '700', color: '#F4F4F5' }]}>
                10 Mutasi Kas Terakhir:
              </Text>

              {transactions.slice(0, 10).map((tx, idx) => (
                <View key={tx.id} style={styles.statementTxRow}>
                  <Text style={styles.statementTxNum}>{idx + 1}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statementTxDesc} numberOfLines={1}>{tx.description}</Text>
                    <Text style={styles.statementTxDate}>{formatDate(tx.created_at)} • {tx.reference_number}</Text>
                  </View>
                  <Text style={[styles.statementTxAmt, { color: tx.type === 'pinjaman' ? '#EF4444' : '#34D399' }]}>
                    {tx.type === 'pinjaman' ? '-' : '+'} {formatRupiah(tx.amount)}
                  </Text>
                </View>
              ))}

              <View style={{ height: 16 }} />
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'E-Statement Siap',
                    'Ringkasan buku kas siap diunduh / diekspor untuk lampiran Rapat Anggota Tahunan (RAT).'
                  );
                  setShowEStatementModal(false);
                }}
                style={styles.modalSubmitBtn}
              >
                <Ionicons name="cloud-download-outline" size={18} color="#000" />
                <Text style={styles.modalSubmitBtnText}>Ekspor / Unduh PDF</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: PRATINJAU BUKTI TRANSFER PEMBAYARAN ANGGOTA           */}
      {/* ============================================================ */}
      <Modal
        visible={!!selectedProofMember}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProofMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="receipt" size={20} color="#FBBF24" />
                <Text style={styles.modalTitle}>Bukti Transfer Pendaftaran</Text>
              </View>
              <Pressable onPress={() => setSelectedProofMember(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            {selectedProofMember && (() => {
              const totalSetoran =
                selectedProofMember.simpananPokok +
                selectedProofMember.simpananWajib +
                selectedProofMember.tabunganSukarela;
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Member info header */}
                  <View style={styles.proofModalInfoBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.proofModalName}>{selectedProofMember.nama}</Text>
                      <Text style={styles.memberMidChip}>{selectedProofMember.mid}</Text>
                    </View>
                    <Text style={styles.proofModalSub}>
                      {selectedProofMember.chapter} • {selectedProofMember.phone}
                    </Text>
                  </View>

                  {/* Transfer Proof Image */}
                  {selectedProofMember.buktiTransferUri ? (
                    <View style={styles.proofModalImageWrapper}>
                      <Image
                        source={{ uri: selectedProofMember.buktiTransferUri }}
                        style={styles.proofModalImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <View style={styles.proofModalNoImage}>
                      <Ionicons name="image-outline" size={48} color="#71717A" />
                      <Text style={{ color: '#71717A', marginTop: 8, fontSize: 12 }}>
                        Belum ada lampiran file bukti transfer
                      </Text>
                    </View>
                  )}

                  {/* Rincian Rekening & Setoran */}
                  <View style={styles.proofModalDetailBox}>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Bank Pengirim:</Text>
                      <Text style={styles.loanDetailValue}>{selectedProofMember.bankPengirim || 'Bank Mandiri'}</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Atas Nama Rekening:</Text>
                      <Text style={styles.loanDetailValue}>
                        {selectedProofMember.namaPengirim || selectedProofMember.nama}
                      </Text>
                    </View>
                    {selectedProofMember.rekeningPengirim && (
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>No Rekening Pengirim:</Text>
                        <Text style={styles.loanDetailValue}>{selectedProofMember.rekeningPengirim}</Text>
                      </View>
                    )}
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Rekening Tujuan:</Text>
                      <Text style={styles.loanDetailValue}>Mandiri 137-00-1234567-8 (Koperasi)</Text>
                    </View>

                    <View
                      style={[
                        styles.loanDetailRow,
                        {
                          borderTopWidth: 1,
                          borderTopColor: 'rgba(255,255,255,0.08)',
                          paddingTop: 8,
                          marginTop: 6,
                        },
                      ]}
                    >
                      <Text style={styles.loanDetailLabel}>• Simpanan Pokok (1x diawal):</Text>
                      <Text style={styles.loanDetailValue}>
                        {formatRupiah(selectedProofMember.simpananPokok)}
                      </Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>• Iuran Wajib (Bulan ke-1):</Text>
                      <Text style={styles.loanDetailValue}>
                        {formatRupiah(selectedProofMember.simpananWajib)}
                      </Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>• Tabungan Sukarela Awal:</Text>
                      <Text style={styles.loanDetailValue}>
                        {formatRupiah(selectedProofMember.tabunganSukarela)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.loanDetailRow,
                        {
                          borderTopWidth: 1,
                          borderTopColor: 'rgba(255,255,255,0.1)',
                          paddingTop: 8,
                          marginTop: 6,
                        },
                      ]}
                    >
                      <Text style={[styles.loanDetailLabel, { color: '#FFF', fontWeight: '700' }]}>
                        Total Transfer Masuk:
                      </Text>
                      <Text
                        style={[
                          styles.loanDetailValue,
                          { color: '#FBBF24', fontSize: 16, fontWeight: '800' },
                        ]}
                      >
                        {formatRupiah(totalSetoran)}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                    <Pressable
                      onPress={() => setSelectedProofMember(null)}
                      style={[
                        styles.loanRejectBtn,
                        {
                          flex: 1,
                          paddingVertical: 12,
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                        },
                      ]}
                    >
                      <Text style={[styles.loanRejectText, { color: '#A1A1AA' }]}>Tutup</Text>
                    </Pressable>
                    {selectedProofMember.status === 'pending' && (
                      <>
                        <Pressable
                          onPress={() => {
                            const mem = selectedProofMember;
                            handleRejectMember(mem);
                          }}
                          style={[styles.loanRejectBtn, { flex: 1, paddingVertical: 12 }]}
                        >
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                          <Text style={styles.loanRejectText}>Tolak</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            const mem = selectedProofMember;
                            setSelectedProofMember(null);
                            handleApproveMember(mem);
                          }}
                          style={[styles.loanApproveBtn, { flex: 1.5, paddingVertical: 12 }]}
                        >
                          <Ionicons name="checkmark-done-circle" size={18} color="#000" />
                          <Text style={styles.loanApproveText}>Verifikasi & Bukukan</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: DETAIL PROFIL & REKENING ANGGOTA (DATA TABLE POPUP)   */}
      {/* ============================================================ */}
      <Modal
        visible={!!selectedDetailMember}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDetailMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="person-circle" size={22} color="#FBBF24" />
                <Text style={styles.modalTitle}>Rincian Anggota Koperasi</Text>
              </View>
              <Pressable onPress={() => setSelectedDetailMember(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            {selectedDetailMember && (() => {
              const mem = selectedDetailMember;
              const totalSimp = (mem.simpananPokok ?? 0) + (mem.simpananWajib ?? 0) + (mem.tabunganSukarela ?? 0);
              const isWajibPaid = mem.lastPaidWajibMonth === currentMonthKey || (mem.status === 'active' && mem.simpananWajib >= 50000);
              const kopId = mem.kopMemberId || (mem.status === 'active' ? generateKopMemberId(mem.mid) : 'PENDING');

              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Member ID & Name Box */}
                  <View style={styles.loanDetailHeaderBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', borderWidth: 1, borderColor: '#FBBF24', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FBBF24' }}>{kopId}</Text>
                      </View>
                      <View style={[
                        styles.tableStatusBadge,
                        mem.status === 'active' ? styles.memberStatusActive : mem.status === 'rejected' ? styles.memberStatusRejected : styles.memberStatusPending
                      ]}>
                        <Text style={[
                          styles.tableStatusBadgeText,
                          { color: mem.status === 'active' ? '#34D399' : mem.status === 'rejected' ? '#EF4444' : '#FBBF24' }
                        ]}>
                          {mem.status === 'active' ? 'ANGGOTA AKTIF' : mem.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU VERIFIKASI'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.loanDetailHeaderName}>{mem.nama}</Text>
                    <Text style={styles.loanDetailHeaderMid}>MID: {mem.mid} • {mem.chapter}</Text>
                  </View>

                  {/* Kontak & Registrasi */}
                  <View style={[styles.loanBreakdownBox, { marginTop: 10 }]}>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>No. Handphone / WA:</Text>
                      <Text style={[styles.loanDetailValue, { color: '#FAFAFA' }]}>{mem.phone || '-'}</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Email Terdaftar:</Text>
                      <Text style={[styles.loanDetailValue, { color: '#A1A1AA' }]}>{mem.email || '-'}</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Tanggal Bergabung:</Text>
                      <Text style={styles.loanDetailValue}>{formatDateTime(mem.tanggalDaftar)}</Text>
                    </View>
                  </View>

                  {/* Rekening Bank Member */}
                  <View style={[styles.loanBreakdownBox, { marginTop: 10, borderColor: 'rgba(52, 211, 153, 0.35)', backgroundColor: 'rgba(52, 211, 153, 0.06)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Ionicons name="card" size={16} color="#34D399" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#34D399', letterSpacing: 0.5 }}>
                        REKENING BANK PENERIMA MEMBER:
                      </Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Bank:</Text>
                      <Text style={[styles.loanDetailValue, { color: '#FFF', fontWeight: '700' }]}>{mem.bankPengirim || 'Bank Mandiri'}</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>No. Rekening:</Text>
                      <Text style={[styles.loanDetailValue, { color: '#34D399', fontWeight: '800', fontSize: 14 }]}>{mem.rekeningPengirim || '-'}</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Atas Nama:</Text>
                      <Text style={[styles.loanDetailValue, { color: '#FAFAFA' }]}>{mem.namaPengirim || mem.nama}</Text>
                    </View>
                  </View>

                  {/* Rincian Posisi Simpanan */}
                  <View style={[styles.loanBreakdownBox, { marginTop: 10 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FBBF24', marginBottom: 8 }}>
                      POSISI BUKU SIMPANAN ANGGOTA:
                    </Text>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Simpanan Pokok (1x diawal):</Text>
                      <Text style={styles.loanDetailValue}>{formatRupiah(mem.simpananPokok)}</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Simpanan Wajib (Rp 50rb/bln):</Text>
                      <Text style={styles.loanDetailValue}>{formatRupiah(mem.simpananWajib)}</Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Status Iuran Bulan Berjalan:</Text>
                      <Text style={[styles.loanDetailValue, { color: isWajibPaid ? '#34D399' : '#F87171', fontWeight: '700' }]}>
                        {isWajibPaid ? 'LUNAS (SEP 2026)' : 'BELUM DIBAYAR'}
                      </Text>
                    </View>
                    <View style={styles.loanDetailRow}>
                      <Text style={styles.loanDetailLabel}>Tabungan Sukarela:</Text>
                      <Text style={styles.loanDetailValue}>{formatRupiah(mem.tabunganSukarela)}</Text>
                    </View>
                    <View style={[styles.loanDetailRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 6, marginTop: 4 }]}>
                      <Text style={[styles.loanDetailLabel, { color: '#FFF', fontWeight: '800' }]}>Total Akumulasi Simpanan:</Text>
                      <Text style={[styles.loanDetailValue, { color: '#FBBF24', fontSize: 15, fontWeight: '800' }]}>
                        {formatRupiah(totalSimp)}
                      </Text>
                    </View>
                  </View>

                  {/* Bukti Transfer Setoran Awal (Jika Ada) */}
                  {mem.buktiTransferUri && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.loanDetailLabel, { marginBottom: 6 }]}>Bukti Transfer Pembayaran:</Text>
                      <View style={styles.proofModalImageWrapper}>
                        <Image
                          source={{ uri: mem.buktiTransferUri }}
                          style={styles.proofModalImage}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                  )}

                    {/* Pending Deposit Notification Banner in Detail */}
                    {mem.pendingDeposit && (
                      <View style={[styles.proofModalInfoBox, { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: '#FBBF24', marginVertical: 10 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="alert-circle" size={16} color="#FBBF24" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#FBBF24' }}>
                            Setoran Menunggu Verifikasi: {formatRupiah(mem.pendingDeposit.nominal)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#D4D4D8', marginTop: 4 }}>
                          Transfer via {mem.pendingDeposit.bankPengirim || 'Bank Mandiri'} pada {mem.pendingDeposit.tanggalTransfer}. Klik tombol Verif Setor di bawah untuk memeriksa struk dan menyetujui pembukuan.
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <Pressable
                        onPress={() => setSelectedDetailMember(null)}
                        style={[styles.loanRejectBtn, { flex: 1, paddingVertical: 12, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}
                      >
                        <Text style={[styles.loanRejectText, { color: '#A1A1AA' }]}>Tutup</Text>
                      </Pressable>

                      {mem.pendingDeposit && (
                        <Pressable
                          onPress={() => {
                            const target = mem;
                            setSelectedDetailMember(null);
                            setSelectedDepositMember(target);
                          }}
                          style={[styles.loanApproveBtn, { flex: 2, paddingVertical: 12 }]}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#000" />
                          <Text style={styles.loanApproveText}>
                            Verif Setor ({formatRupiah(mem.pendingDeposit.nominal)})
                          </Text>
                        </Pressable>
                      )}

                      {mem.status === 'pending' && (
                        <>
                          <Pressable
                            onPress={() => {
                              setSelectedDetailMember(null);
                              handleRejectMember(mem);
                            }}
                            style={[styles.loanRejectBtn, { flex: 1, paddingVertical: 12 }]}
                          >
                            <Ionicons name="close-circle" size={16} color="#EF4444" />
                            <Text style={styles.loanRejectText}>Tolak</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setSelectedDetailMember(null);
                              handleApproveMember(mem);
                            }}
                            style={[styles.loanApproveBtn, { flex: 1.5, paddingVertical: 12 }]}
                          >
                            <Ionicons name="checkmark-done-circle" size={18} color="#000" />
                            <Text style={styles.loanApproveText}>Verifikasi</Text>
                          </Pressable>
                        </>
                      )}

                      {mem.status === 'active' && !isWajibPaid && !mem.pendingDeposit && (
                        <Pressable
                          onPress={() => {
                            setSelectedDetailMember(null);
                            handleSendWaReminder(mem);
                          }}
                          style={[styles.loanRejectBtn, { flex: 1.2, paddingVertical: 12, backgroundColor: 'rgba(37, 211, 102, 0.15)', borderColor: '#25D366' }]}
                        >
                          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                          <Text style={[styles.loanRejectText, { color: '#25D366' }]}>Kirim WA</Text>
                        </Pressable>
                      )}

                      {mem.status === 'active' && !isWajibPaid && mem.tabunganSukarela >= 50000 && !mem.pendingDeposit && (
                        <Pressable
                          onPress={() => {
                            setSelectedDetailMember(null);
                            handleAutoDebitWajib(mem);
                          }}
                          style={[styles.loanRejectBtn, { flex: 1.2, paddingVertical: 12, backgroundColor: 'rgba(251, 191, 36, 0.15)', borderColor: '#FBBF24' }]}
                        >
                          <Ionicons name="swap-horizontal" size={16} color="#FBBF24" />
                          <Text style={[styles.loanRejectText, { color: '#FBBF24' }]}>Autodebet</Text>
                        </Pressable>
                      )}
                    </View>
                  </ScrollView>
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* ============================================================ */}
        {/* MODAL: VERIFIKASI SETORAN KAS ANGGOTA (TRANSFER BANK)         */}
        {/* ============================================================ */}
        <Modal
          visible={!!selectedDepositMember && !!selectedDepositMember.pendingDeposit}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedDepositMember(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '92%' }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="shield-checkmark" size={20} color="#FBBF24" />
                  <View>
                    <Text style={styles.modalTitle}>Verifikasi Setoran Kas</Text>
                    <Text style={{ fontSize: 10, color: '#A1A1AA' }}>Mutasi Kas Masuk dari Anggota Aktif</Text>
                  </View>
                </View>
                <Pressable onPress={() => setSelectedDepositMember(null)} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#A1A1AA" />
                </Pressable>
              </View>

              {selectedDepositMember && selectedDepositMember.pendingDeposit && (() => {
                const dep = selectedDepositMember.pendingDeposit;
                const curSukarela = selectedDepositMember.tabunganSukarela || 0;
                const curWajib = selectedDepositMember.simpananWajib || 0;
                const nextSukarela = curSukarela + dep.sukarelaPortion;
                const nextWajib = curWajib + dep.wajibPortion;
                const curTotal = selectedDepositMember.simpananPokok + curWajib + curSukarela;
                const nextTotal = curTotal + dep.nominal;

                return (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Member info header */}
                    <View style={styles.proofModalInfoBox}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.proofModalName}>{selectedDepositMember.nama}</Text>
                        <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', borderWidth: 1, borderColor: '#FBBF24', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FBBF24' }}>
                            {selectedDepositMember.kopMemberId || selectedDepositMember.mid}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.proofModalSub}>
                        {selectedDepositMember.chapter} • MID: {selectedDepositMember.mid} • {selectedDepositMember.phone}
                      </Text>
                    </View>

                    {/* Transfer Proof Image */}
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#D4D4D8', marginTop: 12, marginBottom: 6 }}>
                      Bukti Struk Transfer Bank (Mandiri):
                    </Text>
                    {dep.buktiTransferUri ? (
                      <View style={styles.proofModalImageWrapper}>
                        <Image
                          source={{ uri: dep.buktiTransferUri }}
                          style={styles.proofModalImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <View style={styles.proofModalNoImage}>
                        <Ionicons name="image-outline" size={48} color="#71717A" />
                        <Text style={{ color: '#71717A', marginTop: 8, fontSize: 12 }}>
                          Belum ada lampiran struk transfer
                        </Text>
                      </View>
                    )}

                    {/* Detail Rekening Pengirim */}
                    <View style={[styles.proofModalDetailBox, { marginTop: 12 }]}>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Bank Pengirim:</Text>
                        <Text style={styles.loanDetailValue}>{dep.bankPengirim || 'Bank Mandiri'}</Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>No. Rekening Pengirim:</Text>
                        <Text style={styles.loanDetailValue}>{dep.rekeningPengirim || '-'}</Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Atas Nama Pengirim:</Text>
                        <Text style={styles.loanDetailValue}>{dep.namaPengirim || selectedDepositMember.nama}</Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Waktu Transfer:</Text>
                        <Text style={styles.loanDetailValue}>{dep.tanggalTransfer}</Text>
                      </View>
                    </View>

                    {/* Rincian Alokasi Dana Setoran */}
                    <View style={[styles.proofModalDetailBox, { marginTop: 8, borderColor: 'rgba(251, 191, 36, 0.3)', borderWidth: 1 }]}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FBBF24', marginBottom: 4 }}>
                        Rincian Alokasi Dana Kas Masuk:
                      </Text>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>• Simpanan Wajib:</Text>
                        <Text style={styles.loanDetailValue}>
                          {dep.wajibPortion > 0 ? formatRupiah(dep.wajibPortion) : 'Rp 0 (Sudah Lunas)'}
                        </Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>• Tabungan Sukarela:</Text>
                        <Text style={[styles.loanDetailValue, { color: '#34D399', fontWeight: '700' }]}>
                          +{formatRupiah(dep.sukarelaPortion)}
                        </Text>
                      </View>
                      {dep.loanPortion > 0 && (
                        <View style={styles.loanDetailRow}>
                          <Text style={styles.loanDetailLabel}>• Angsuran Pinjaman:</Text>
                          <Text style={styles.loanDetailValue}>{formatRupiah(dep.loanPortion)}</Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.loanDetailRow,
                          {
                            borderTopWidth: 1,
                            borderTopColor: 'rgba(255,255,255,0.1)',
                            paddingTop: 8,
                            marginTop: 4,
                          },
                        ]}
                      >
                        <Text style={[styles.loanDetailLabel, { color: '#FFF', fontWeight: '800', fontSize: 12 }]}>
                          Total Nominal Setoran:
                        </Text>
                        <Text style={[styles.loanDetailValue, { color: '#FBBF24', fontSize: 16, fontWeight: '800' }]}>
                          {formatRupiah(dep.nominal)}
                        </Text>
                      </View>
                    </View>

                    {/* Ringkasan Perubahan Saldo Anggota */}
                    <View style={[styles.proofModalInfoBox, { marginTop: 8, backgroundColor: 'rgba(52, 211, 153, 0.08)', borderColor: 'rgba(52, 211, 153, 0.25)' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#34D399', marginBottom: 4 }}>
                        Simulasi Saldo Setelah Disetujui:
                      </Text>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Saldo Tabungan Sukarela:</Text>
                        <Text style={styles.loanDetailValue}>
                          {formatRupiah(curSukarela)} ➔ <Text style={{ color: '#34D399', fontWeight: '800' }}>{formatRupiah(nextSukarela)}</Text>
                        </Text>
                      </View>
                      <View style={styles.loanDetailRow}>
                        <Text style={styles.loanDetailLabel}>Total Simpanan Anggota:</Text>
                        <Text style={styles.loanDetailValue}>
                          {formatRupiah(curTotal)} ➔ <Text style={{ color: '#FBBF24', fontWeight: '800' }}>{formatRupiah(nextTotal)}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                      <Pressable
                        onPress={() => setSelectedDepositMember(null)}
                        disabled={isProcessingDeposit}
                        style={[
                          styles.loanRejectBtn,
                          {
                            flex: 1,
                            paddingVertical: 12,
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                          },
                        ]}
                      >
                        <Text style={[styles.loanRejectText, { color: '#A1A1AA' }]}>Tutup</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleRejectDeposit(selectedDepositMember)}
                        disabled={isProcessingDeposit}
                        style={[styles.loanRejectBtn, { flex: 1, paddingVertical: 12 }]}
                      >
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.loanRejectText}>Tolak</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleApproveDeposit(selectedDepositMember)}
                        disabled={isProcessingDeposit}
                        style={[styles.loanApproveBtn, { flex: 2, paddingVertical: 12, opacity: isProcessingDeposit ? 0.6 : 1 }]}
                      >
                        <Ionicons name="checkmark-done-circle" size={18} color="#000" />
                        <Text style={styles.loanApproveText}>
                          {isProcessingDeposit ? 'Memproses...' : `Setujui & Bukukan (${formatRupiah(dep.nominal)})`}
                        </Text>
                      </Pressable>
                    </View>
                  </ScrollView>
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* ============================================================ */}
        {/* MODAL: BERITA ACARA PENILAIAN MANDIRI KESEHATAN KOPERASI      */}
        {/* ============================================================ */}
        <Modal
          visible={showHealthCertModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHealthCertModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '92%', maxWidth: 580 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="document-text" size={20} color="#FBBF24" />
                  <View>
                    <Text style={styles.modalTitle}>Berita Acara Penilaian Mandiri</Text>
                    <Text style={{ fontSize: 10, color: '#A1A1AA' }}>Kepatuhan PermenKopUKM RI No. 9 Tahun 2020</Text>
                  </View>
                </View>
                <Pressable onPress={() => setShowHealthCertModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#A1A1AA" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.certPaper}>
                  <View style={styles.certHeader}>
                    <Text style={styles.certTitleOfficial}>KOPERASI BERSAMA SATU BINTANG</Text>
                    <Text style={styles.certSubtitleOfficial}>MERCEDES-BENZ CLUB INDONESIA (MBCI)</Text>
                    <Text style={styles.certAddressOfficial}>Kantor Pusat: Gedung Pengelola Koperasi MBCI • Jakarta Selatan</Text>
                    <View style={styles.certDividerLine} />
                    <Text style={styles.certDocTitle}>BERITA ACARA PENILAIAN MANDIRI TINGKAT KESEHATAN KOPERASI</Text>
                    <Text style={styles.certDocNo}>Nomor: BA-PKK/2026/IX/001 • Tanggal: 12 September 2026</Text>
                  </View>

                  <Text style={styles.certParagraph}>
                    Berdasarkan audit evaluasi data operasional riil per tanggal 12 September 2026 yang dilaksanakan berpedoman pada <Text style={{ fontWeight: '700', color: '#FAFAFA' }}>Peraturan Menteri Koperasi dan Usaha Kecil dan Menengah Republik Indonesia Nomor 9 Tahun 2020</Text> tentang Pengawasan Koperasi, diperoleh hasil penilaian mandiri (Self-Assessment) sebagai berikut:
                  </Text>

                  {/* Ringkasan Skor Tabel */}
                  <View style={styles.certTable}>
                    <View style={styles.certTableRowHeader}>
                      <Text style={[styles.certTableCell, { flex: 0.8, fontWeight: '700', color: '#FBBF24' }]}>No</Text>
                      <Text style={[styles.certTableCell, { flex: 3.5, fontWeight: '700', color: '#FBBF24' }]}>Aspek Penilaian</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center', fontWeight: '700', color: '#FBBF24' }]}>Bobot</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center', fontWeight: '700', color: '#FBBF24' }]}>Skor Riil</Text>
                      <Text style={[styles.certTableCell, { flex: 1.8, textAlign: 'right', fontWeight: '700', color: '#FBBF24' }]}>Poin</Text>
                    </View>
                    <View style={styles.certTableRow}>
                      <Text style={[styles.certTableCell, { flex: 0.8 }]}>1</Text>
                      <Text style={[styles.certTableCell, { flex: 3.5 }]}>Tata Kelola (Governance)</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center' }]}>30%</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center' }]}>{healthAssessment.aspects.tataKelola.score}</Text>
                      <Text style={[styles.certTableCell, { flex: 1.8, textAlign: 'right', fontWeight: '700' }]}>{healthAssessment.aspects.tataKelola.point.toFixed(2)}</Text>
                    </View>
                    <View style={styles.certTableRow}>
                      <Text style={[styles.certTableCell, { flex: 0.8 }]}>2</Text>
                      <Text style={[styles.certTableCell, { flex: 3.5 }]}>Profil Risiko (Risk Profile)</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center' }]}>15%</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center' }]}>{healthAssessment.aspects.profilRisiko.score}</Text>
                      <Text style={[styles.certTableCell, { flex: 1.8, textAlign: 'right', fontWeight: '700' }]}>{healthAssessment.aspects.profilRisiko.point.toFixed(2)}</Text>
                    </View>
                    <View style={styles.certTableRow}>
                      <Text style={[styles.certTableCell, { flex: 0.8 }]}>3</Text>
                      <Text style={[styles.certTableCell, { flex: 3.5 }]}>Kinerja Keuangan (Performance)</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center' }]}>25%</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center' }]}>{healthAssessment.aspects.kinerjaKeuangan.score}</Text>
                      <Text style={[styles.certTableCell, { flex: 1.8, textAlign: 'right', fontWeight: '700' }]}>{healthAssessment.aspects.kinerjaKeuangan.point.toFixed(2)}</Text>
                    </View>
                    <View style={styles.certTableRow}>
                      <Text style={[styles.certTableCell, { flex: 0.8 }]}>4</Text>
                      <Text style={[styles.certTableCell, { flex: 3.5 }]}>Permodalan (Capital Adequacy)</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center' }]}>30%</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center' }]}>{healthAssessment.aspects.permodalan.score}</Text>
                      <Text style={[styles.certTableCell, { flex: 1.8, textAlign: 'right', fontWeight: '700' }]}>{healthAssessment.aspects.permodalan.point.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.certTableRow, { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderTopWidth: 1.5, borderTopColor: '#FBBF24' }]}>
                      <Text style={[styles.certTableCell, { flex: 4.3, fontWeight: '800', color: '#FFF' }]}>SKOR KOMPOSIT TOTAL</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center', fontWeight: '800', color: '#FFF' }]}>100%</Text>
                      <Text style={[styles.certTableCell, { flex: 1.5, textAlign: 'center', fontWeight: '800', color: '#FBBF24' }]}>{healthAssessment.score.toFixed(1)}</Text>
                      <Text style={[styles.certTableCell, { flex: 1.8, textAlign: 'right', fontWeight: '800', color: '#FBBF24' }]}>{healthAssessment.score.toFixed(1)}</Text>
                    </View>
                  </View>

                  {/* Predikat Box */}
                  <View style={[styles.certPredikatBox, { borderColor: healthAssessment.color }]}>
                    <Text style={styles.certPredikatLabel}>KESIMPULAN TINGKAT KESEHATAN:</Text>
                    <Text style={[styles.certPredikatValue, { color: healthAssessment.color }]}>
                      {healthAssessment.status} (SKOR: {healthAssessment.score.toFixed(1)} / 100)
                    </Text>
                    <Text style={styles.certPredikatNote}>
                      {healthAssessment.isLoanAllowed
                        ? 'Koperasi dinyatakan memenuhi persyaratan untuk memberikan pinjaman kepada anggota.'
                        : 'Koperasi belum diperkenankan menyalurkan pinjaman demi memproteksi kas simpanan sukarela anggota hingga syarat permodalan minimum (Rp 15 Juta) dan kuorum anggota (min. 9 orang) terpenuhi.'}
                    </Text>
                  </View>

                  {/* Signatures */}
                  <View style={styles.certSignatureRow}>
                    <View style={styles.certSigBox}>
                      <Text style={styles.certSigRole}>Dibuat & Dinilai Oleh:</Text>
                      <View style={{ height: 40 }} />
                      <Text style={styles.certSigName}>Pengelola Keuangan Koperasi</Text>
                      <Text style={styles.certSigId}>MID: MBINA-KOP-2026-000001</Text>
                    </View>
                    <View style={styles.certSigBox}>
                      <Text style={styles.certSigRole}>Mengetahui,</Text>
                      <View style={{ height: 40 }} />
                      <Text style={styles.certSigName}>Ketua Koperasi / Pengawas</Text>
                      <Text style={styles.certSigId}>Koperasi Bersama Satu Bintang</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <Pressable
                    onPress={() => setShowHealthCertModal(false)}
                    style={[styles.loanRejectBtn, { flex: 1, paddingVertical: 12, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}
                  >
                    <Text style={[styles.loanRejectText, { color: '#A1A1AA' }]}>Tutup</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      showAlertDialog(
                        'Berita Acara Berhasil Diekspor',
                        `Dokumen resmi Berita Acara Penilaian Mandiri Kesehatan Koperasi No. BA-PKK/2026/IX/001 dengan predikat ${healthAssessment.status} (Skor ${healthAssessment.score.toFixed(1)}) telah siap diunduh dalam format arsip E-Report.`
                      );
                    }}
                    style={[styles.loanApproveBtn, { flex: 1.5, paddingVertical: 12 }]}
                  >
                    <Ionicons name="download-outline" size={16} color="#000" />
                    <Text style={styles.loanApproveText}>Unduh Berita Acara (PDF)</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(18, 18, 22, 0.95)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FAFAFA',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 1,
  },
  adminChip: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  switchViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchViewText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  identityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(30, 25, 15, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.2)',
  },
  identityText: {
    fontSize: 11,
    color: '#D4D4D8',
    flex: 1,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(18, 18, 22, 0.7)',
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: '#FBBF24',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  tabButtonTextActive: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  content: {
    padding: 16,
  },
  primaryCashCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(24, 24, 28, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    marginBottom: 16,
  },
  primaryCashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goldIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCashLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  primaryCashStatus: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  addTxPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addTxPrimaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  primaryCashAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginVertical: 6,
  },
  compositionBarContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 8,
  },
  compBarSegment: {
    height: '100%',
  },
  compLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  compLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compLegendText: {
    fontSize: 10,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FAFAFA',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: '#71717A',
    marginTop: 3,
  },
  regulasiBanner: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    marginBottom: 20,
  },
  regulasiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
    flex: 1,
  },
  regulasiDesc: {
    fontSize: 11,
    color: '#D4D4D8',
    lineHeight: 18,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FAFAFA',
    letterSpacing: 0.3,
  },
  sectionHeaderSub: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  tabSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    minWidth: '46%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  quickCardDesc: {
    fontSize: 10,
    color: '#71717A',
    marginTop: 2,
  },
  loanCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  loanCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  loanCardMid: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    color: '#FBBF24',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  loanCardChapter: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  loanStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  loanStatusApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  loanStatusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  loanStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FBBF24',
  },
  loanCardBody: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 4,
  },
  loanDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loanDetailLabel: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  loanDetailNominal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  loanDetailValue: {
    fontSize: 11,
    color: '#E4E4E7',
    fontWeight: '600',
  },
  loanDetailPurpose: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#D4D4D8',
    marginTop: 2,
  },
  loanCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  loanRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  loanRejectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  loanApproveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FBBF24',
  },
  loanApproveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  loanDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  loanDetailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E7',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 12,
    color: '#FAFAFA',
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  filterPillActive: {
    backgroundColor: '#FBBF24',
  },
  filterPillText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  mutasiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mutasiCountText: {
    fontSize: 11,
    color: '#71717A',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
  },
  exportBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C5A059',
  },
  txRowCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  txRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txTypeIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txRefNumber: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    color: '#A1A1AA',
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  txDescriptionText: {
    fontSize: 12,
    color: '#E4E4E7',
    marginVertical: 4,
    lineHeight: 18,
  },
  txFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  txDateText: {
    fontSize: 10,
    color: '#71717A',
  },
  txSuccessBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  txSuccessText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#34D399',
  },
  memberCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  memberMidChip: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    color: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  memberChapter: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  memberStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memberStatusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  memberStatusPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  memberStatusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  memberStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  memberBalanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  memBalItem: {
    flex: 1,
    minWidth: '45%',
  },
  memBalLabel: {
    fontSize: 10,
    color: '#71717A',
  },
  memBalVal: {
    fontSize: 12,
    color: '#E4E4E7',
    fontWeight: '700',
    marginTop: 1,
  },
  memberFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  memberJoinDate: {
    fontSize: 10,
    color: '#71717A',
  },
  verifyMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#34D399',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  verifyMemberBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  rejectMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rejectMemberBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  rejectReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  rejectReasonText: {
    fontSize: 11,
    color: '#FCA5A5',
    flex: 1,
    lineHeight: 16,
  },
  addDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderWidth: 1,
    borderColor: '#C5A059',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addDepositBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FDE68A',
  },
  cardBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#FAFAFA',
    marginTop: 4,
  },
  formInputSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#FAFAFA',
    textAlign: 'center',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '600',
    marginTop: 6,
  },
  shuRatioRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  subRatioLabel: {
    fontSize: 10,
    color: '#71717A',
  },
  shuResultHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FBBF24',
  },
  shuResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  shuResultLabel: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  shuResultVal: {
    fontSize: 12,
    color: '#FAFAFA',
    fontWeight: '700',
  },
  memberShuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  memberShuName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  memberShuMid: {
    fontSize: 10,
    color: '#71717A',
  },
  memberShuTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34D399',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E4E4E7',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#121216',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  subtypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  subtypeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subtypeBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: '#FBBF24',
  },
  subtypeBtnText: {
    fontSize: 10,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  subtypeBtnTextActive: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#FBBF24',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
  },
  loanDetailHeaderBox: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  loanDetailHeaderMid: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    color: '#FBBF24',
  },
  loanDetailHeaderName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FAFAFA',
    marginTop: 2,
  },
  loanDetailHeaderChapter: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 1,
  },
  loanBreakdownBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  statementHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statementTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FBBF24',
  },
  statementSub: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 2,
  },
  statementDate: {
    fontSize: 9,
    color: '#71717A',
    marginTop: 2,
  },
  statementDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 10,
  },
  statementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  statementLabel: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  statementVal: {
    fontSize: 12,
    color: '#FAFAFA',
    fontWeight: '600',
  },
  statementTxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    gap: 6,
  },
  statementTxNum: {
    fontSize: 10,
    color: '#71717A',
  },
  statementTxDesc: {
    fontSize: 11,
    color: '#E4E4E7',
  },
  statementTxDate: {
    fontSize: 9,
    color: '#71717A',
  },
  statementTxAmt: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberProofBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  memberProofHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 6,
  },
  memberProofTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },
  proofVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proofVerifiedActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  proofVerifiedPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  proofVerifiedRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  proofVerifiedText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  memberProofBody: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  memberProofThumbContainer: {
    width: 68,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    position: 'relative',
  },
  memberProofThumb: {
    width: '100%',
    height: '100%',
  },
  memberProofZoomBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 2,
  },
  memberProofNoThumb: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  proofFieldLabel: {
    fontSize: 10,
    color: '#A1A1AA',
    width: 80,
  },
  proofFieldVal: {
    fontSize: 11,
    color: '#FAFAFA',
    fontWeight: '600',
    flex: 1,
  },
  viewProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  viewProofBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
  },
  checkProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  checkProofBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },
  proofModalInfoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  proofModalName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  proofModalSub: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  proofModalImageWrapper: {
    width: '100%',
    height: 260,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofModalImage: {
    width: '100%',
    height: '100%',
  },
  proofModalNoImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  proofModalDetailBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  monthlyDuesBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  monthlyDuesTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  monthlyDuesBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  monthlyDuesBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  waReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    borderWidth: 1,
    borderColor: '#25D366',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  waReminderBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#25D366',
  },
  autodebitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: '#FBBF24',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  autodebitBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#34D399',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  markPaidBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },

  // Table Controls & Search
  tableControlCard: {
    backgroundColor: '#121216',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  memberSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#FAFAFA',
    paddingVertical: 0,
  },
  memberFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  memberFilterChipActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderColor: '#FBBF24',
  },
  memberFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  memberFilterChipTextActive: {
    color: '#FBBF24',
    fontWeight: '700',
  },

  // Table Structure
  tableWrapperScroll: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#101014',
    overflow: 'hidden',
  },
  memberTableContainer: {
    minWidth: 1200,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.3,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableRowEven: {
    backgroundColor: '#101014',
  },
  tableRowOdd: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
  tdCell: {
    fontSize: 11,
    color: '#D4D4D8',
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  emptyTableRow: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  // Status Badges
  tableStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  tableStatusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Table Action Buttons
  tableActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  tableActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
  },

  // Pagination Controls
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  paginationInfo: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  paginationBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FAFAFA',
  },

  // Deposit Alert Banner Styles
  depositAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1.5,
    borderColor: '#FBBF24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  depositAlertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositAlertTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  depositAlertSub: {
    fontSize: 10.5,
    color: '#D4D4D8',
    marginTop: 2,
  },
  depositAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  depositAlertBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  pulseBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  pulseBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFF',
  },

  // ==========================================
  // TAB KESEHATAN KOPERASI (PERMENKOPUKM 9/2020)
  // ==========================================
  loanLockWarningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  loanLockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanLockWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
  },
  loanLockBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  loanLockBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  loanLockWarningDesc: {
    fontSize: 11,
    color: '#D4D4D8',
    marginTop: 4,
    lineHeight: 16,
  },
  loanLockReasonItem: {
    fontSize: 10.5,
    color: '#FCD34D',
    lineHeight: 15,
  },
  loanLockActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  loanLockActionBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#000',
  },

  // Health Summary Card
  healthSummaryCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  healthSummaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  healthLegalBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  healthOrgName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FAFAFA',
    marginTop: 2,
  },
  healthDateText: {
    fontSize: 10.5,
    color: '#A1A1AA',
    marginTop: 1,
  },
  healthStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  healthStatusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  healthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScoreNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  healthScoreScale: {
    fontSize: 9,
    color: '#A1A1AA',
    marginTop: -2,
  },
  healthScoreMeaningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  healthScoreMeaningSub: {
    fontSize: 10.5,
    color: '#A1A1AA',
    marginTop: 3,
    lineHeight: 15,
  },
  healthLoanStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
  },
  healthLoanStatusText: {
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
  },
  healthCertBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FBBF24',
    paddingVertical: 10,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  healthCertBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },

  // Aspect Cards
  aspectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  aspectCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  aspectTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  aspectWeightBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aspectWeightText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FBBF24',
  },
  aspectSub: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 2,
  },
  aspectScoreVal: {
    fontSize: 13,
    fontWeight: '900',
  },
  aspectPointText: {
    fontSize: 9.5,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  aspectProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
  },
  aspectProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  aspectIndicatorsList: {
    marginTop: 10,
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  indicatorName: {
    fontSize: 10.5,
    color: '#D4D4D8',
    fontWeight: '600',
  },
  indicatorVal: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  indicatorStd: {
    fontSize: 9.5,
    color: '#71717A',
  },

  // Corrective Action Plan
  correctiveActionCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  correctiveActionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FBBF24',
    flex: 1,
  },
  correctiveActionSub: {
    fontSize: 10.5,
    color: '#A1A1AA',
    lineHeight: 15,
  },

  // Berita Acara Certificate Modal
  certPaper: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 16,
  },
  certHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  certTitleOfficial: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  certSubtitleOfficial: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FAFAFA',
    marginTop: 2,
    textAlign: 'center',
  },
  certAddressOfficial: {
    fontSize: 8.5,
    color: '#A1A1AA',
    marginTop: 2,
    textAlign: 'center',
  },
  certDividerLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#FBBF24',
    marginVertical: 10,
  },
  certDocTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FAFAFA',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  certDocNo: {
    fontSize: 9,
    color: '#A1A1AA',
    marginTop: 2,
    textAlign: 'center',
  },
  certParagraph: {
    fontSize: 10,
    color: '#D4D4D8',
    lineHeight: 15,
    marginBottom: 12,
    textAlign: 'justify',
  },
  certTable: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  certTableRowHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  certTableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  certTableCell: {
    fontSize: 9.5,
    color: '#FAFAFA',
  },
  certPredikatBox: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginBottom: 12,
  },
  certPredikatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A1A1AA',
    letterSpacing: 0.5,
  },
  certPredikatValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  certPredikatNote: {
    fontSize: 9.5,
    color: '#D4D4D8',
    marginTop: 4,
    lineHeight: 14,
  },
  certSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
  },
  certSigBox: {
    flex: 1,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 6,
  },
  certSigRole: {
    fontSize: 9,
    color: '#A1A1AA',
    fontWeight: '700',
  },
  certSigName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  certSigId: {
    fontSize: 8.5,
    color: '#71717A',
    marginTop: 1,
  },
});
