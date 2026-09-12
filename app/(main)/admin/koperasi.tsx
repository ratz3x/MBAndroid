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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
type TabType = 'ikhtisar' | 'mutasi' | 'pinjaman' | 'anggota' | 'shu';

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
  status: 'pending' | 'approved' | 'rejected';
  catatanAdmin?: string;
  approvedAt?: string;
}

interface MemberKopItem {
  id: string;
  mid: string;
  nama: string;
  chapter: string;
  email: string;
  phone: string;
  simpananPokok: number;
  simpananWajib: number;
  tabunganSukarela: number;
  status: 'active' | 'pending';
  tanggalDaftar: string;
  buktiTransferUri?: string | null;
  bankPengirim?: string | null;
  rekeningPengirim?: string | null;
  namaPengirim?: string | null;
}

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
    nama: 'Pengelola Keuangan Koperasi',
    chapter: 'Koperasi Bersama Satu Bintang',
    email: 'Dummy_Kop1@mbandro.org',
    phone: '081298765432',
    simpananPokok: 100000,
    simpananWajib: 150000,
    tabunganSukarela: 1000000,
    status: 'active',
    tanggalDaftar: '2026-01-01',
  },
  {
    id: 'mem_002',
    mid: 'MBINA-JKT-042',
    nama: 'Bambang Soedarmono',
    chapter: 'W124 MBCI Jakarta',
    email: 'bambang.w124@gmail.com',
    phone: '081122334455',
    simpananPokok: 100000,
    simpananWajib: 300000,
    tabunganSukarela: 3800000,
    status: 'active',
    tanggalDaftar: '2026-03-15',
  },
  {
    id: 'mem_003',
    mid: 'MBINA-BDG-019',
    nama: 'Hendra Gunawan',
    chapter: 'W210 MBCI Bandung',
    email: 'hendra.gunawan@yahoo.co.id',
    phone: '081398877665',
    simpananPokok: 100000,
    simpananWajib: 250000,
    tabunganSukarela: 6150000,
    status: 'active',
    tanggalDaftar: '2026-04-10',
  },
  {
    id: 'mem_004',
    mid: 'MBINA-SBY-088',
    nama: 'Arya Pratama',
    chapter: 'MBCI Chapter Surabaya',
    email: 'arya.pratama@mbcisby.id',
    phone: '081700998811',
    simpananPokok: 100000,
    simpananWajib: 450000,
    tabunganSukarela: 12250000,
    status: 'active',
    tanggalDaftar: '2026-02-01',
  },
  {
    id: 'mem_005',
    mid: 'MBINA-SMG-014',
    nama: 'Kusumo Wardhana',
    chapter: 'W202 MBCI Semarang',
    email: 'kusumo.w@mbci-smg.org',
    phone: '081566778899',
    simpananPokok: 100000,
    simpananWajib: 50000,
    tabunganSukarela: 25000,
    status: 'pending',
    tanggalDaftar: '2026-09-11',
    bankPengirim: 'Bank BCA',
    namaPengirim: 'Kusumo Wardhana',
    rekeningPengirim: '246-880-1122',
    buktiTransferUri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'mem_006',
    mid: 'MBINA-JBR-2026-000002',
    nama: 'Ayesha Fairuz Fajr',
    chapter: 'MBC Bandung',
    email: 'ayesha.fairuz@mbc-bandung.org',
    phone: '082129709696',
    simpananPokok: 100000,
    simpananWajib: 50000,
    tabunganSukarela: 25000,
    status: 'pending',
    tanggalDaftar: '2026-09-12',
    bankPengirim: 'Bank Mandiri',
    namaPengirim: 'Ayesha Fairuz Fajr',
    rekeningPengirim: '137-00-1234567-8',
    buktiTransferUri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
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
    simpanan_pokok: 400000,
    simpanan_wajib: 1150000,
    simpanan_sukarela: 23225000,
    total_balance: 24775000,
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

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [showLoanDetailModal, setShowLoanDetailModal] = useState<LoanRequest | null>(null);
  const [showShuModal, setShowShuModal] = useState(false);
  const [showEStatementModal, setShowEStatementModal] = useState(false);
  const [selectedProofMember, setSelectedProofMember] = useState<MemberKopItem | null>(null);

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
      // 1. Balance
      const rawBal = await AsyncStorage.getItem(KOP_STORAGE_BAL);
      if (rawBal) {
        setBalance(JSON.parse(rawBal));
      } else {
        const initBal: KoperasiBalance = {
          id: 'bal_kop_central',
          member_id: KOP_USER_ID,
          simpanan_pokok: 400000,
          simpanan_wajib: 1150000,
          simpanan_sukarela: 23225000,
          total_balance: 24775000,
          active_loan: 0,
          loan_remaining: 0,
          updated_at: new Date().toISOString(),
        };
        setBalance(initBal);
        await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(initBal));
      }

      // 2. Transactions
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
            id: 'tx_init_002',
            member_id: KOP_USER_ID,
            type: 'simpanan',
            amount: 3800000,
            status: 'completed',
            description: '[Simpanan Sukarela] MID: MBINA-JKT-042 — Tabungan Sukarela Perawatan Unit W124',
            reference_number: 'TX-KOP-2026-1002',
            due_date: null,
            processed_by: KOP_USER_ID,
            processed_at: '2026-03-15T09:30:00Z',
            created_at: '2026-03-15T09:30:00Z',
            updated_at: '2026-03-15T09:30:00Z',
          },
          {
            id: 'tx_init_003',
            member_id: KOP_USER_ID,
            type: 'simpanan',
            amount: 6150000,
            status: 'completed',
            description: '[Simpanan Sukarela] MID: MBINA-BDG-019 — Tabungan Sukarela Operasional Touring',
            reference_number: 'TX-KOP-2026-0410',
            due_date: null,
            processed_by: KOP_USER_ID,
            processed_at: '2026-04-10T11:00:00Z',
            created_at: '2026-04-10T11:00:00Z',
            updated_at: '2026-04-10T11:00:00Z',
          },
        ];
        setTransactions(initTxs);
        await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify(initTxs));
      }

      // 3. Loans: Bersihkan data dummy lama dan mulai dengan antrean bersih
      try {
        await AsyncStorage.removeItem('@mbclub_koperasi_loan_requests_v2');
        await AsyncStorage.removeItem('@mbclub_koperasi_loan_requests');
      } catch {}
      const rawLoans = await AsyncStorage.getItem(KOP_STORAGE_LOANS);
      if (rawLoans) {
        const parsedLoans: LoanRequest[] = JSON.parse(rawLoans);
        const dummyIds = new Set(['req_001', 'req_002', 'req_003']);
        const dummyMids = new Set(['MBINA-JKT-042', 'MBINA-BDG-019', 'MBINA-SBY-088']);
        const cleaned = parsedLoans.filter((r) => !dummyIds.has(r.id) && !dummyMids.has(r.mid));
        setLoanRequests(cleaned);
        await AsyncStorage.setItem(KOP_STORAGE_LOANS, JSON.stringify(cleaned));
      } else {
        setLoanRequests([]);
        await AsyncStorage.setItem(KOP_STORAGE_LOANS, JSON.stringify([]));
      }

      // 4. Members
      const rawMembers = await AsyncStorage.getItem(KOP_STORAGE_MEMBERS);
      if (rawMembers) {
        const parsed: MemberKopItem[] = JSON.parse(rawMembers);
        const existingMids = new Set(parsed.map((m) => m.mid.toUpperCase()));
        const missing = INITIAL_MEMBERS.filter((m) => !existingMids.has(m.mid.toUpperCase()));
        const merged = [...parsed, ...missing];
        setMembers(merged);
        if (missing.length > 0) {
          await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(merged));
        }
      } else {
        setMembers(INITIAL_MEMBERS);
        await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(INITIAL_MEMBERS));
      }
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

    showConfirmDialog(
      'Konfirmasi Persetujuan Pinjaman',
      `Setujui pencairan pinjaman sebesar ${formatRupiah(request.nominal)} untuk ${request.nama} (${request.mid})?\n\n• Suku Bunga: 6% p.a. (PMK 49/2025)\n• Tenor: ${request.tenorBulan} Bulan\n• Grace Period: ${request.gracePeriodBulan} Bulan\n• Agunan: ${request.agunan}`,
      async () => {
        try {
          // 1. Update request status
          const updatedRequests = loanRequests.map((r) =>
            r.id === request.id
              ? {
                  ...r,
                  status: 'approved' as const,
                  approvedAt: new Date().toISOString(),
                  catatanAdmin: 'Disetujui sesuai ketentuan PMK No. 49 Tahun 2025 (Bunga 6% flat p.a.)',
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
            description: `[Pencairan Pinjaman 6% PMK 49] MID: ${request.mid} (${request.nama}) — Tenor: ${request.tenorBulan} Bln, Grace: ${request.gracePeriodBulan} Bln. Agunan: ${request.agunan}`,
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
            'Pencairan Disetujui',
            `Pinjaman ${formatRupiah(request.nominal)} telah dicairkan ke anggota ${request.nama} dan dicatat dalam buku kas.`
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
          // 1. Update status member
          const updated = members.map((m) =>
            m.id === targetMember.id ? { ...m, status: 'active' as const } : m
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

  // Statistik & Metrics
  const pendingLoansCount = activeLoans.filter((r) => r.status === 'pending').length;
  const pendingMembersCount = members.filter((m) => m.status === 'pending').length;
  const totalSimpananSemua = balance.simpanan_pokok + balance.simpanan_wajib + balance.simpanan_sukarela;

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
                          req.status === 'rejected' && styles.loanStatusRejected,
                        ]}
                      >
                        <Text style={styles.loanStatusText}>
                          {req.status === 'pending'
                            ? 'MENUNGGU APPROVAL'
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

            {members.map((mem) => {
              const totalSimpanan = mem.simpananPokok + mem.simpananWajib + mem.tabunganSukarela;
              return (
                <View key={mem.id} style={styles.memberCard}>
                  <View style={styles.memberCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memberName}>{mem.nama}</Text>
                        <Text style={styles.memberMidChip}>{mem.mid}</Text>
                      </View>
                      <Text style={styles.memberChapter}>{mem.chapter}</Text>
                    </View>
                    <View
                      style={[
                        styles.memberStatusBadge,
                        mem.status === 'active'
                          ? styles.memberStatusActive
                          : styles.memberStatusPending,
                      ]}
                    >
                      <Text style={styles.memberStatusText}>
                        {mem.status === 'active' ? 'AKTIF' : 'MENUNGGU VERIFIKASI'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberBalanceGrid}>
                    <View style={styles.memBalItem}>
                      <Text style={styles.memBalLabel}>Simpanan Pokok</Text>
                      <Text style={styles.memBalVal}>{formatRupiah(mem.simpananPokok)}</Text>
                    </View>
                    <View style={styles.memBalItem}>
                      <Text style={styles.memBalLabel}>Simpanan Wajib</Text>
                      <Text style={styles.memBalVal}>{formatRupiah(mem.simpananWajib)}</Text>
                    </View>
                    <View style={styles.memBalItem}>
                      <Text style={styles.memBalLabel}>Tabungan Sukarela</Text>
                      <Text style={styles.memBalVal}>{formatRupiah(mem.tabunganSukarela)}</Text>
                    </View>
                    <View style={styles.memBalItem}>
                      <Text style={styles.memBalLabel}>Total Simpanan</Text>
                      <Text style={[styles.memBalVal, { color: '#FBBF24', fontWeight: '700' }]}>
                        {formatRupiah(totalSimpanan)}
                      </Text>
                    </View>
                  </View>

                  {/* Bukti Transfer Setoran Awal Card Section */}
                  {(mem.buktiTransferUri || mem.bankPengirim || mem.status === 'pending') && (
                    <View style={styles.memberProofBox}>
                      <View style={styles.memberProofHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="receipt" size={13} color="#FBBF24" />
                          <Text style={styles.memberProofTitle}>Bukti Transfer Setoran Awal</Text>
                        </View>
                        <View
                          style={[
                            styles.proofVerifiedBadge,
                            mem.status === 'active'
                              ? styles.proofVerifiedActive
                              : styles.proofVerifiedPending,
                          ]}
                        >
                          <Ionicons
                            name={mem.status === 'active' ? 'checkmark-circle' : 'alert-circle'}
                            size={11}
                            color={mem.status === 'active' ? '#34D399' : '#FBBF24'}
                          />
                          <Text
                            style={[
                              styles.proofVerifiedText,
                              { color: mem.status === 'active' ? '#34D399' : '#FBBF24' },
                            ]}
                          >
                            {mem.status === 'active' ? 'Terverifikasi' : 'Perlu Verifikasi'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.memberProofBody}>
                        {mem.buktiTransferUri ? (
                          <Pressable
                            onPress={() => setSelectedProofMember(mem)}
                            style={styles.memberProofThumbContainer}
                          >
                            <Image
                              source={{ uri: mem.buktiTransferUri }}
                              style={styles.memberProofThumb}
                              resizeMode="cover"
                            />
                            <View style={styles.memberProofZoomBadge}>
                              <Ionicons name="scan" size={12} color="#FFF" />
                            </View>
                          </Pressable>
                        ) : (
                          <View style={styles.memberProofNoThumb}>
                            <Ionicons name="image-outline" size={24} color="#71717A" />
                            <Text style={{ fontSize: 9, color: '#71717A', marginTop: 2 }}>Tanpa Foto</Text>
                          </View>
                        )}

                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          <View style={styles.proofFieldRow}>
                            <Text style={styles.proofFieldLabel}>Bank Pengirim:</Text>
                            <Text style={styles.proofFieldVal}>{mem.bankPengirim || 'Bank Mandiri'}</Text>
                          </View>
                          <View style={styles.proofFieldRow}>
                            <Text style={styles.proofFieldLabel}>Pengirim:</Text>
                            <Text style={styles.proofFieldVal} numberOfLines={1}>
                              {mem.namaPengirim || mem.nama}
                            </Text>
                          </View>
                          {mem.rekeningPengirim && (
                            <View style={styles.proofFieldRow}>
                              <Text style={styles.proofFieldLabel}>Rekening:</Text>
                              <Text style={styles.proofFieldVal}>{mem.rekeningPengirim}</Text>
                            </View>
                          )}

                          <Pressable
                            onPress={() => setSelectedProofMember(mem)}
                            style={styles.viewProofBtn}
                          >
                            <Ionicons name="eye-outline" size={13} color="#FBBF24" />
                            <Text style={styles.viewProofBtnText}>Lihat Bukti Lengkap</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={styles.memberFooterRow}>
                    <Text style={styles.memberJoinDate}>Terdaftar sejak {formatDate(mem.tanggalDaftar)}</Text>
                    {mem.status === 'pending' ? (
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Pressable
                          onPress={() => setSelectedProofMember(mem)}
                          style={styles.checkProofBtn}
                        >
                          <Ionicons name="eye" size={12} color="#FBBF24" />
                          <Text style={styles.checkProofBtnText}>Cek Bukti</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleApproveMember(mem)}
                          style={styles.verifyMemberBtn}
                        >
                          <Ionicons name="checkmark-done" size={14} color="#000" />
                          <Text style={styles.verifyMemberBtnText}>Verifikasi & Bukukan</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setTxMemberMid(mem.mid);
                          setTxMemberName(mem.nama);
                          setShowTxModal(true);
                        }}
                        style={styles.addDepositBtn}
                      >
                        <Ionicons name="add" size={12} color="#C5A059" />
                        <Text style={styles.addDepositBtnText}>Input Setoran</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
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

                  {members.map((m) => {
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
                  })}
                </View>
              );
            })()}
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
              <Text style={styles.inputLabel}>Jenis Transaksi:</Text>
              <View style={styles.subtypeGrid}>
                {[
                  { key: 'wajib', label: 'Simpanan Wajib (Rp 50rb)' },
                  { key: 'pokok', label: 'Simpanan Pokok (Rp 100rb)' },
                  { key: 'sukarela', label: 'Tabungan Sukarela (Min 25rb)' },
                  { key: 'talangan', label: 'Dana Talangan Darurat' },
                  { key: 'pinjaman', label: 'Pinjaman 6% PMK 49' },
                  { key: 'cicilan', label: 'Angsuran Pinjaman' },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setTxSubtype(item.key as any)}
                    style={[
                      styles.subtypeBtn,
                      txSubtype === item.key && styles.subtypeBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subtypeBtnText,
                        txSubtype === item.key && styles.subtypeBtnTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
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
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <Pressable
                      onPress={() => setSelectedProofMember(null)}
                      style={[styles.loanRejectBtn, { flex: 1, paddingVertical: 12 }]}
                    >
                      <Text style={styles.loanRejectText}>Tutup</Text>
                    </Pressable>
                    {selectedProofMember.status === 'pending' && (
                      <Pressable
                        onPress={() => {
                          const mem = selectedProofMember;
                          setSelectedProofMember(null);
                          handleApproveMember(mem);
                        }}
                        style={[styles.loanApproveBtn, { flex: 2, paddingVertical: 12 }]}
                      >
                        <Ionicons name="checkmark-done-circle" size={18} color="#000" />
                        <Text style={styles.loanApproveText}>Verifikasi & Bukukan</Text>
                      </Pressable>
                    )}
                  </View>
                </ScrollView>
              );
            })()}
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
});
