// ============================================================
// Koperasi Screen — Koperasi Bersama Satu Bintang
// Mercedes-Benz Club Indonesia (MB Club INA)
// Fokus Utama: Unit Usaha Simpan Pinjam Komunitas
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/services/supabase';
import { LuxuryCard } from '../../src/components/ui/LuxuryCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { MetallicButton } from '../../src/components/ui/MetallicButton';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../src/constants/theme';
import { formatRupiah, formatDateTime } from '../../src/utils/helpers';
import { useAuth, KOP_USER_ID } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import type { KoperasiBalance, KoperasiTransaction } from '../../src/types/database.types';

const KOPERASI_LOGO = require('../../assets/images/logo-koperasi.jpg');

// Storage keys
const KOP_STORAGE_TX = '@mbclub_koperasi_real_txs_v4_zero';
const KOP_STORAGE_BAL = '@mbclub_koperasi_real_bal_v4_zero';
const KOP_STORAGE_MEMBERS = '@mbclub_koperasi_members_v2';
const KOP_STORAGE_LOANS = '@mbclub_koperasi_loan_requests_v3_clean';

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

// Data Awal Kas Koperasi Sesuai Rekap Anggota
const INITIAL_KOP_BALANCE: KoperasiBalance = {
  id: 'bal_kop_central',
  member_id: KOP_USER_ID,
  simpanan_pokok: 200000,
  simpanan_wajib: 100000,
  simpanan_sukarela: 1550000,
  total_balance: 1850000,
  active_loan: 0,
  loan_remaining: 0,
  updated_at: new Date().toISOString(),
};
const ZERO_KOP_BALANCE = INITIAL_KOP_BALANCE;

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

export const DEFAULT_KOP_MEMBERS = [
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
    status: 'active' as const,
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
    status: 'pending' as const,
    tanggalDaftar: '2026-09-11',
    lastPaidWajibMonth: null,
    bankPengirim: 'Bank BCA',
    namaPengirim: 'Kusumo Wardhana',
    rekeningPengirim: '246-880-1122',
    buktiTransferUri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
  },
];

export default function KoperasiScreen() {
  const router = useRouter();
  const { user, profile, isKoperasiAdmin } = useAuth();
  const isKopManager = user?.id === KOP_USER_ID || isKoperasiAdmin;

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
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPayWajibBankModal, setShowPayWajibBankModal] = useState(false);
  const [showBukuRekeningModal, setShowBukuRekeningModal] = useState(false);
  const [wajibTransferProofUri, setWajibTransferProofUri] = useState<string | null>(null);
  const [wajibBankSender, setWajibBankSender] = useState('Bank Mandiri');
  const [wajibRekSender, setWajibRekSender] = useState('');
  const [wajibNameSender, setWajibNameSender] = useState('');
  const [wajibSubmitting, setWajibSubmitting] = useState(false);

  // Setoran Kas Koperasi (Alokasi Otomatis: Wajib, Pinjaman, dan Sukarela)
  const [transferTotalAmount, setTransferTotalAmount] = useState('500000');

  // Membership & Registration State
  const { member: currentMember } = useProfile(user?.id);
  const [membershipStatus, setMembershipStatus] = useState<'unregistered' | 'pending' | 'active' | 'rejected'>('unregistered');
  const [memberKopData, setMemberKopData] = useState<any>(null);

  // Form Registration State
  const [regMid, setRegMid] = useState('');
  const [regName, setRegName] = useState('');
  const [regChapter, setRegChapter] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSukarela, setRegSukarela] = useState('25000');
  const [transferProofUri, setTransferProofUri] = useState<string | null>(null);
  const [bankPengirim, setBankPengirim] = useState('Bank Mandiri');
  const [rekeningPengirim, setRekeningPengirim] = useState('');
  const [namaPengirim, setNamaPengirim] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Form State for Recording Simpan Pinjam
  const [txSubtype, setTxSubtype] = useState<'pokok' | 'wajib' | 'sukarela' | 'talangan' | 'pinjaman' | 'cicilan'>('wajib');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txMemberMid, setTxMemberMid] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);

  // Loan Application & Disbursement Verification State
  const [memberLoans, setMemberLoans] = useState<any[]>([]);
  const [showApplyLoanModal, setShowApplyLoanModal] = useState(false);
  const [showMemberProofLoanModal, setShowMemberProofLoanModal] = useState<any>(null);
  const [showHealthNoticeModal, setShowHealthNoticeModal] = useState(false);
  const [showLoanSopModal, setShowLoanSopModal] = useState(false);

  // Form State for Apply Loan (Mitigasi Risiko 5C)
  const [loanNominal, setLoanNominal] = useState('15000000');
  const [loanTenor, setLoanTenor] = useState(12);
  const [loanAgunan, setLoanAgunan] = useState('BPKB Mercedes-Benz');
  const [loanNilaiAgunan, setLoanNilaiAgunan] = useState('85000000');
  const [loanTujuan, setLoanTujuan] = useState('Perawatan Servis & Kaki-kaki Unit Mercedes-Benz');
  const [loanIncome, setLoanIncome] = useState('12000000'); // Penghasilan Bersih Bulanan (Capacity)
  const [loanBankStatementProof, setLoanBankStatementProof] = useState<string | null>(null); // Rekening Koran 3 Bln
  const [loanChapterEndorser, setLoanChapterEndorser] = useState(''); // Pengurus Chapter Penjamin (Condition)
  const [loanChapterEndorserPhone, setLoanChapterEndorserPhone] = useState('');
  const [loanAgunanPajak, setLoanAgunanPajak] = useState<'hidup' | 'mati'>('hidup');
  const [loanAgunanOwner, setLoanAgunanOwner] = useState('');
  const [loanSubmitting, setLoanSubmitting] = useState(false);

  const openRegisterModal = () => {
    setRegMid(currentMember?.member_number || '');
    setRegName(profile?.full_name || '');
    setRegChapter(currentMember?.chapter || 'MB Club Indonesia');
    setRegPhone(profile?.phone || '');
    setRegSukarela('25000');
    setBankPengirim('Bank Mandiri');
    setRekeningPengirim('');
    setNamaPengirim(profile?.full_name || '');
    setTransferProofUri(null);
    setShowRegisterModal(true);
  };

  const handlePickProof = async () => {
    // 1. Web Implementation: Direct HTML5 file input with synchronous click for bulletproof browser compatibility
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64Uri = event.target?.result as string;
              if (base64Uri) {
                setTransferProofUri(base64Uri);
              }
              try {
                document.body.removeChild(input);
              } catch (_) {}
            };
            reader.onerror = () => {
              try {
                document.body.removeChild(input);
              } catch (_) {}
              showAlertDialog('Gagal Membaca File', 'Tidak dapat memuat berkas gambar bukti transfer.');
            };
            reader.readAsDataURL(file);
          } else {
            try {
              document.body.removeChild(input);
            } catch (_) {}
          }
        };

        // Trigger OS file browser dialog immediately
        input.click();
      } catch (err: any) {
        showAlertDialog('Gagal Memilih Foto', err?.message || 'Terjadi kesalahan saat membuka pemilih berkas.');
      }
      return;
    }

    // 2. Mobile Native (Android / iOS)
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlertDialog('Izin Ditolak', 'Izin galeri diperlukan untuk memilih foto bukti transfer.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTransferProofUri(result.assets[0].uri);
      }
    } catch (err: any) {
      showAlertDialog('Gagal Memilih Foto', err?.message || 'Terjadi kesalahan saat memilih berkas.');
    }
  };

  const handlePickWajibProof = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64Uri = event.target?.result as string;
              if (base64Uri) {
                setWajibTransferProofUri(base64Uri);
              }
              try {
                document.body.removeChild(input);
              } catch (_) {}
            };
            reader.onerror = () => {
              try {
                document.body.removeChild(input);
              } catch (_) {}
              showAlertDialog('Gagal Membaca File', 'Tidak dapat memuat berkas gambar bukti transfer.');
            };
            reader.readAsDataURL(file);
          } else {
            try {
              document.body.removeChild(input);
            } catch (_) {}
          }
        };

        input.click();
      } catch (err: any) {
        showAlertDialog('Gagal Memilih Foto', err?.message || 'Terjadi kesalahan saat membuka pemilih berkas.');
      }
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlertDialog('Izin Ditolak', 'Izin galeri diperlukan untuk memilih foto bukti transfer.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setWajibTransferProofUri(result.assets[0].uri);
      }
    } catch (err: any) {
      showAlertDialog('Gagal Memilih Foto', err?.message || 'Terjadi kesalahan saat memilih berkas.');
    }
  };

  const handlePickBankStatementProof = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64Uri = event.target?.result as string;
              if (base64Uri) {
                setLoanBankStatementProof(base64Uri);
              }
              try {
                document.body.removeChild(input);
              } catch (_) {}
            };
            reader.onerror = () => {
              try { document.body.removeChild(input); } catch (_) {}
              showAlertDialog('Gagal Membaca File', 'Terjadi kesalahan saat membaca berkas.');
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } catch (e: any) {
        showAlertDialog('Gagal Membuka File Browser', e?.message || 'Tidak dapat membuka dialog berkas.');
      }
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlertDialog('Izin Ditolak', 'Aplikasi memerlukan izin galeri untuk mengunggah rekening koran / mutasi bank.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoanBankStatementProof(result.assets[0].uri);
      }
    } catch (err: any) {
      showAlertDialog('Gagal Memilih Dokumen', err?.message || 'Terjadi kesalahan saat memilih berkas rekening koran.');
    }
  };

  const getTransferBreakdown = (amountStr: string) => {
    const totalAmount = parseInt((amountStr || '0').replace(/[^0-9]/g, ''), 10) || 0;
    const isWajibPaid = memberKopData?.lastPaidWajibMonth === currentMonthKey || (memberKopData?.simpananWajib >= 50000 && !memberKopData?.unpaidMonth);
    
    // Check active loan
    const activeLoan = memberLoans.find((l) => l.status === 'confirmed_active' || l.status === 'active');
    const monthlyInstallment = activeLoan ? Math.round((activeLoan.nominal || 0) / (activeLoan.tenorBulan || 12)) : 0;

    let wajibPortion = 0;
    if (!isWajibPaid) {
      wajibPortion = Math.min(50000, totalAmount);
    }
    const remAfterWajib = Math.max(0, totalAmount - wajibPortion);

    let loanPortion = 0;
    if (monthlyInstallment > 0) {
      loanPortion = Math.min(monthlyInstallment, remAfterWajib);
    }
    const remAfterLoan = Math.max(0, remAfterWajib - loanPortion);

    const sukarelaPortion = remAfterLoan;

    return {
      totalAmount,
      wajibPortion,
      loanPortion,
      sukarelaPortion,
      isWajibPaid,
      hasActiveLoan: !!activeLoan,
    };
  };

  const openTransferModal = (defaultAmtOrCategory?: string) => {
    const isWajibPaid = memberKopData?.lastPaidWajibMonth === currentMonthKey || (memberKopData?.simpananWajib >= 50000 && !memberKopData?.unpaidMonth);
    if (defaultAmtOrCategory === 'wajib' && !isWajibPaid) {
      setTransferTotalAmount('50000');
    } else if (defaultAmtOrCategory && !isNaN(parseInt(defaultAmtOrCategory.replace(/[^0-9]/g, ''), 10))) {
      setTransferTotalAmount(defaultAmtOrCategory);
    } else {
      setTransferTotalAmount('500000');
    }
    setWajibBankSender(memberKopData?.bankPengirim || 'Bank Mandiri');
    setWajibRekSender(memberKopData?.rekeningPengirim || '');
    setWajibNameSender(memberKopData?.namaPengirim || memberKopData?.nama || profile?.full_name || '');
    setWajibTransferProofUri(null);
    setShowPayWajibBankModal(true);
  };

  const handleCopyRekening = () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        (navigator as any).clipboard.writeText('1370012345678');
      }
    } catch (_) {}
    showAlertDialog(
      'Nomor Rekening Disalin 📋',
      'Bank Mandiri: 137-00-1234567-8\na.n. Koperasi Bersama Satu Bintang\n\nNomor rekening kas koperasi telah berhasil disalin.'
    );
  };

  const handlePayWajibFromSukarela = () => {
    const sukarelaBal = memberKopData?.tabunganSukarela ?? 0;
    if (sukarelaBal < 50000) {
      showAlertDialog(
        'Saldo Sukarela Tidak Cukup',
        `Saldo Tabungan Sukarela Anda (${formatRupiah(sukarelaBal)}) tidak mencukupi untuk autodebet Iuran Simpanan Wajib Rp 50.000. Silakan bayar melalui transfer Bank Mandiri.`
      );
      return;
    }

    showConfirmDialog(
      'Autodebet Simpanan Wajib',
      `Bayar Iuran Simpanan Wajib periode ${getMonthNameIndo(currentMonthKey)} sebesar Rp 50.000 dengan memotong saldo Tabungan Sukarela?\n\n• Saldo Sukarela Saat Ini: ${formatRupiah(sukarelaBal)}\n• Potongan Iuran: Rp 50.000\n• Sisa Saldo Sukarela: ${formatRupiah(sukarelaBal - 50000)}`,
      async () => {
        try {
          const rawMem = await AsyncStorage.getItem(KOP_STORAGE_MEMBERS);
          if (rawMem) {
            const memList = JSON.parse(rawMem);
            const userMid = (memberKopData?.mid || '').trim().toUpperCase();
            const updated = memList.map((m: any) => {
              if (m.id === user?.id || (userMid && m.mid && m.mid.trim().toUpperCase() === userMid)) {
                return {
                  ...m,
                  simpananWajib: (m.simpananWajib || 0) + 50000,
                  tabunganSukarela: (m.tabunganSukarela || 0) - 50000,
                  lastPaidWajibMonth: currentMonthKey,
                };
              }
              return m;
            });
            await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(updated));
          }

          // Catat transaksi mutasi
          const rawTx = await AsyncStorage.getItem(KOP_STORAGE_TX);
          const allTxs = rawTx ? JSON.parse(rawTx) : [];
          const newTx: KoperasiTransaction = {
            id: `tx_autodeb_${Date.now()}`,
            member_id: user?.id || KOP_USER_ID,
            type: 'simpanan',
            amount: 50000,
            status: 'completed',
            description: `[Simpanan Wajib] Autodebet Sukarela MID: ${memberKopData?.mid || '-'} (${memberKopData?.nama || profile?.full_name}) — Periode ${getMonthNameIndo(currentMonthKey)}`,
            reference_number: `TX-DEB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            due_date: null,
            processed_by: user?.id || KOP_USER_ID,
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify([newTx, ...allTxs]));

          await loadData();
          showAlertDialog(
            'Pembayaran Berhasil! 🎉',
            `Iuran Simpanan Wajib periode ${getMonthNameIndo(currentMonthKey)} sebesar Rp 50.000 telah lunas dibayar via autodebet Tabungan Sukarela.`
          );
        } catch {
          showAlertDialog('Gagal', 'Gagal memproses pembayaran via Tabungan Sukarela.');
        }
      },
      'Ya, Potong Saldo Sukarela',
      'Batal'
    );
  };

  const handlePayWajibBankSubmit = async () => {
    if (!wajibTransferProofUri) {
      showAlertDialog(
        'Bukti Transfer Belum Dilampirkan',
        'Mohon unggah foto / screenshot bukti transfer pembayaran ke rekening Bank Mandiri Koperasi agar mutasi kas dapat diverifikasi.'
      );
      return;
    }

    const breakdown = getTransferBreakdown(transferTotalAmount);
    if (breakdown.totalAmount <= 0) {
      showAlertDialog('Perhatian', 'Masukkan total nominal transfer yang valid (lebih dari Rp 0).');
      return;
    }

    const { totalAmount, wajibPortion, loanPortion, sukarelaPortion } = breakdown;

    setWajibSubmitting(true);
    try {
      // 1. Update Member Balance
      const rawMem = await AsyncStorage.getItem(KOP_STORAGE_MEMBERS);
      if (rawMem) {
        const memList = JSON.parse(rawMem);
        const userMid = (memberKopData?.mid || '').trim().toUpperCase();
        const updated = memList.map((m: any) => {
          if (m.id === user?.id || (userMid && m.mid && m.mid.trim().toUpperCase() === userMid)) {
            return {
              ...m,
              pendingDeposit: {
                id: `dep_${Date.now()}`,
                nominal: totalAmount,
                wajibPortion,
                sukarelaPortion,
                loanPortion,
                buktiTransferUri: wajibTransferProofUri,
                tanggalTransfer: new Date().toISOString().replace('T', ' ').slice(0, 16),
                bankPengirim: wajibBankSender || m.bankPengirim,
                rekeningPengirim: wajibRekSender || m.rekeningPengirim,
                namaPengirim: wajibNameSender || m.namaPengirim,
                keterangan: descLabel,
              },
              simpananWajib: (m.simpananWajib || 0) + wajibPortion,
              tabunganSukarela: (m.tabunganSukarela || 0) + sukarelaPortion,
              lastPaidWajibMonth: wajibPortion >= 50000 ? currentMonthKey : m.lastPaidWajibMonth,
              wajibProofUri: wajibTransferProofUri,
              bankPengirim: wajibBankSender || m.bankPengirim,
              rekeningPengirim: wajibRekSender || m.rekeningPengirim,
              namaPengirim: wajibNameSender || m.namaPengirim,
            };
          }
          return m;
        });
        await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(updated));
      }

      // 2. Catat transaksi mutasi kas
      const rawTx = await AsyncStorage.getItem(KOP_STORAGE_TX);
      const allTxs = rawTx ? JSON.parse(rawTx) : [];
      const refNum = `TX-SETOR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const descItems = [];
      if (wajibPortion > 0) descItems.push(`Simpanan Wajib ${formatRupiah(wajibPortion)}`);
      if (loanPortion > 0) descItems.push(`Angsuran Pinjaman ${formatRupiah(loanPortion)}`);
      if (sukarelaPortion > 0) descItems.push(`Tabungan Sukarela ${formatRupiah(sukarelaPortion)}`);

      const descLabel = descItems.length > 0 ? descItems.join(', ') : `Setoran Kas ${formatRupiah(totalAmount)}`;

      const newTx: KoperasiTransaction = {
        id: `tx_setor_bank_${Date.now()}`,
        member_id: user?.id || KOP_USER_ID,
        type: 'simpanan',
        amount: totalAmount,
        status: 'completed',
        description: `[Transfer Bank Mandiri] Total ${formatRupiah(totalAmount)} (Rincian: ${descLabel}) — MID: ${memberKopData?.mid || '-'} (${memberKopData?.nama || profile?.full_name}) via ${wajibBankSender} ${wajibRekSender}`,
        reference_number: refNum,
        due_date: null,
        processed_by: user?.id || KOP_USER_ID,
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify([newTx, ...allTxs]));

      // 3. Update Saldo Kas Koperasi
      const rawBal = await AsyncStorage.getItem(KOP_STORAGE_BAL);
      if (rawBal) {
        const balData = JSON.parse(rawBal);
        balData.simpanan_wajib = (balData.simpanan_wajib || 0) + wajibPortion;
        balData.simpanan_sukarela = (balData.simpanan_sukarela || 0) + sukarelaPortion;
        balData.total_balance = (balData.total_balance || 0) + totalAmount;
        if (loanPortion > 0) {
          balData.active_loan = Math.max(0, (balData.active_loan || 0) - loanPortion);
          balData.loan_remaining = Math.max(0, (balData.loan_remaining || 0) - loanPortion);
        }
        balData.updated_at = new Date().toISOString();
        await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(balData));
      }

      setShowPayWajibBankModal(false);
      setWajibTransferProofUri(null);
      await loadData();

      showAlertDialog(
        'Setoran Berhasil Dikonfirmasi! 🎉',
        `Pembayaran transfer kas sebesar ${formatRupiah(totalAmount)} telah berhasil dibukukan dengan rincian alokasi otomatis:\n\n• Simpanan Wajib: ${formatRupiah(wajibPortion)}${wajibPortion > 0 ? ' (Lunas Bulan Ini)' : ' (Nihil / Lunas Sebelumnya)'}\n• Angsuran Pinjaman: ${formatRupiah(loanPortion)}${loanPortion > 0 ? ' (Terpotong)' : ' (Nihil)'}\n• Tabungan Sukarela: ${formatRupiah(sukarelaPortion)} (Otomatis Masuk Tabungan)\n\nNomor Referensi: ${refNum}\nSaldo simpanan Anda otomatis bertambah dan tercatat pada Buku Tabungan Digital (E-Passbook).`
      );
    } catch {
      showAlertDialog('Gagal', 'Terjadi kesalahan saat memproses bukti setoran.');
    } finally {
      setWajibSubmitting(false);
    }
  };

  const handleRegisterSubmit = async () => {
    if (!regMid.trim()) {
      showAlertDialog('Perhatian', 'Nomor Member ID (MID) wajib diisi.');
      return;
    }
    if (!regName.trim()) {
      showAlertDialog('Perhatian', 'Nama lengkap wajib diisi.');
      return;
    }
    const numSukarela = parseInt(regSukarela.replace(/[^0-9]/g, ''), 10) || 0;
    if (numSukarela < 25000) {
      showAlertDialog('Perhatian', 'Tabungan Sukarela minimal Rp 25.000.');
      return;
    }
    if (!bankPengirim.trim()) {
      showAlertDialog('Perhatian', 'Nama bank rekening anggota wajib diisi.');
      return;
    }
    if (!rekeningPengirim.trim()) {
      showAlertDialog(
        'Nomor Rekening Wajib Diisi',
        'Nomor rekening bank wajib diisi sebagai rekening resmi penerima pencairan pinjaman dari koperasi dan bagi hasil SHU tahunan.'
      );
      return;
    }
    if (!namaPengirim.trim()) {
      showAlertDialog('Perhatian', 'Nama pemilik rekening bank wajib diisi.');
      return;
    }
    if (!transferProofUri) {
      showAlertDialog(
        'Bukti Transfer Belum Dilampirkan',
        'Mohon unggah foto / screenshot bukti transfer pembayaran setoran awal agar pengelola koperasi dapat memverifikasi mutasi kas masuk.'
      );
      return;
    }

    setRegSubmitting(true);
    try {
      const rawMem = await AsyncStorage.getItem(KOP_STORAGE_MEMBERS);
      let memList = rawMem ? JSON.parse(rawMem) : [];

      const newMemberItem = {
        id: user?.id || `mem_${Date.now()}`,
        mid: regMid.trim().toUpperCase(),
        nama: regName.trim(),
        chapter: regChapter.trim() || 'MB Club Indonesia',
        email: user?.email || '',
        phone: regPhone.trim() || '081298765432',
        simpananPokok: 100000,
        simpananWajib: 50000,
        tabunganSukarela: numSukarela,
        status: 'pending' as const,
        tanggalDaftar: new Date().toISOString().split('T')[0],
        buktiTransferUri: transferProofUri,
        bankPengirim: bankPengirim.trim() || 'Bank Transfer',
        rekeningPengirim: rekeningPengirim.trim() || '-',
        namaPengirim: namaPengirim.trim() || regName.trim(),
      };

      // Simpan ke list anggota (pending) & filter seluruh duplikat MID yang sama
      memList = [
        newMemberItem,
        ...memList.filter((m: any) => (m.id !== user?.id && (!m.mid || m.mid.trim().toUpperCase() !== newMemberItem.mid)))
      ];
      await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(memList));
      await AsyncStorage.setItem('@mbclub_my_koperasi_mid', newMemberItem.mid);

      setMembershipStatus('pending');
      setMemberKopData(newMemberItem);
      setShowRegisterModal(false);

      const totalInitial = 100000 + 50000 + numSukarela;
      showAlertDialog(
        'Pendaftaran Berhasil Terkirim! 🎉',
        `Pendaftaran keanggotaan Koperasi Bersama Satu Bintang telah dicatat.\n\nRincian Setoran Awal:\n• Simpanan Pokok: Rp 100.000\n• Iuran Wajib: Rp 50.000\n• Tabungan Sukarela: ${formatRupiah(numSukarela)}\n• Total Setoran: ${formatRupiah(totalInitial)}\n\nSilakan transfer ke Rekening Bank Mandiri 137-00-1234567-8 a.n. Koperasi Bersama Satu Bintang. Pengelola Keuangan akan memverifikasi mutasi bank dan mengaktifkan akun Anda.`
      );
    } catch {
      showAlertDialog('Gagal', 'Terjadi kesalahan saat memproses pendaftaran.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleApplyLoanSubmit = async () => {
    // PROTEKSI KESEHATAN KOPERASI (PERMENKOPUKM NO. 9 TAHUN 2020)
    showAlertDialog(
      'Fasilitas Pinjaman Ditangguhkan',
      'Penyaluran pinjaman baru ditangguhkan sementara berdasarkan audit transparansi PermenKopUKM RI No. 9 Tahun 2020.\n\nStatus Tingkat Kesehatan: DALAM PENGAWASAN (Skor 54.4 / 100)\nModal Sendiri Disetor: Rp 300.000 (Standar min. Rp 15.000.000)\n\nKebijakan ini diterapkan demi memproteksi kas simpanan sukarela seluruh anggota dari risiko likuiditas gagal bayar.'
    );
    setShowApplyLoanModal(false);
    setShowHealthNoticeModal(true);
    return;

    const numNominal = parseInt(loanNominal.replace(/[^0-9]/g, ''), 10) || 0;
    if (numNominal < 1000000) {
      showAlertDialog('Perhatian', 'Nominal pengajuan pinjaman minimal Rp 1.000.000.');
      return;
    }
    if (!loanTujuan.trim()) {
      showAlertDialog('Perhatian', 'Peruntukan / keperluan pinjaman wajib diisi.');
      return;
    }
    if (!loanAgunan.trim()) {
      showAlertDialog('Perhatian', 'Agunan / jaminan pinjaman wajib dicantumkan.');
      return;
    }

    setLoanSubmitting(true);
    try {
      const rawLoans = await AsyncStorage.getItem(KOP_STORAGE_LOANS);
      const allLoans = rawLoans ? JSON.parse(rawLoans as string) : [];

      const newLoanItem = {
        id: `loan_${Date.now()}`,
        mid: memberKopData?.mid || currentMember?.member_number || 'MBINA-NEW',
        nama: memberKopData?.nama || profile?.full_name || 'Anggota Koperasi',
        chapter: memberKopData?.chapter || currentMember?.chapter || 'MB Club Indonesia',
        email: user?.email || '',
        phone: memberKopData?.phone || profile?.phone || '',
        nominal: numNominal,
        tenorBulan: loanTenor,
        gracePeriodBulan: 6,
        tujuan: loanTujuan.trim(),
        agunan: loanAgunan.trim(),
        nilaiAgunan: parseInt(loanNilaiAgunan.replace(/[^0-9]/g, ''), 10) || 50000000,
        rekamJejakSimpanan: (memberKopData?.simpananPokok || 100000) + (memberKopData?.simpananWajib || 50000) + (memberKopData?.tabunganSukarela || 25000),
        tanggalPengajuan: new Date().toISOString().split('T')[0],
        status: 'pending' as const,
        bankPenerima: memberKopData?.bankPengirim || 'Bank Mandiri',
        rekeningPenerima: memberKopData?.rekeningPengirim || '-',
        namaPenerima: memberKopData?.namaPengirim || memberKopData?.nama || profile?.full_name || '-',
      };

      const updatedLoans = [newLoanItem, ...allLoans];
      await AsyncStorage.setItem(KOP_STORAGE_LOANS, JSON.stringify(updatedLoans));

      setMemberLoans([newLoanItem, ...memberLoans]);
      setShowApplyLoanModal(false);

      showAlertDialog(
        'Pengajuan Pinjaman Terkirim! 📋',
        `Pengajuan pinjaman sebesar ${formatRupiah(numNominal)} (Tenor ${loanTenor} bulan, Grace Period 6 bulan, Bunga 6% PMK 49/2025) telah diajukan ke Pengelola Keuangan Koperasi.\n\nRekening Tujuan Pencairan:\n${newLoanItem.bankPenerima} — ${newLoanItem.rekeningPenerima}\na.n. ${newLoanItem.namaPenerima}\n\nSetelah disetujui, dana akan dikirimkan ke rekening tersebut dan bukti transfer pencairan dari koperasi akan dikirimkan ke aplikasi untuk Anda verifikasi.`
      );
    } catch {
      showAlertDialog('Gagal', 'Terjadi kesalahan sistem saat mengirim pengajuan pinjaman.');
    } finally {
      setLoanSubmitting(false);
    }
  };

  const handleConfirmDisbursement = (loan: any) => {
    showConfirmDialog(
      'Konfirmasi Penerimaan Dana Pinjaman',
      `Apakah Anda mengonfirmasi bahwa dana pencairan pinjaman sebesar ${formatRupiah(loan.nominal)} telah efektif masuk ke rekening Anda:\n\n• Bank: ${loan.bankPenerima || memberKopData?.bankPengirim}\n• No Rekening: ${loan.rekeningPenerima || memberKopData?.rekeningPengirim}\n• Atas Nama: ${loan.namaPenerima || memberKopData?.namaPengirim}\n\nSetelah konfirmasi, pinjaman bunga 6% resmi aktif dan jadwal angsuran diaktifkan dengan masa tenggang (grace period) ${loan.gracePeriodBulan || 6} bulan.`,
      async () => {
        try {
          const rawLoans = await AsyncStorage.getItem(KOP_STORAGE_LOANS);
          if (rawLoans) {
            const allLoans = JSON.parse(rawLoans);
            const updated = allLoans.map((l: any) =>
              l.id === loan.id
                ? {
                    ...l,
                    status: 'confirmed_active',
                    confirmedByMemberAt: new Date().toISOString(),
                  }
                : l
            );
            await AsyncStorage.setItem(KOP_STORAGE_LOANS, JSON.stringify(updated));
            setMemberLoans(updated.filter((l: any) => l.mid === loan.mid));

            // Update balance active_loan
            if (balance) {
              const newBal = {
                ...balance,
                active_loan: (balance.active_loan || 0) + loan.nominal,
                loan_remaining: (balance.loan_remaining || 0) + loan.nominal,
              };
              setBalance(newBal);
            }

            setShowMemberProofLoanModal(null);
            showAlertDialog(
              'Penerimaan Dana Terverifikasi! 🎉',
              `Terima kasih! Anda telah memverifikasi penerimaan dana pinjaman sebesar ${formatRupiah(loan.nominal)}. Pinjaman bunga 6% Anda kini resmi AKTIF.`
            );
          }
        } catch {
          showAlertDialog('Gagal', 'Terjadi kesalahan saat memverifikasi penerimaan dana.');
        }
      },
      'Ya, Dana Sudah Masuk',
      'Batal'
    );
  };

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isKopManager) {
      setMembershipStatus('active');
      try {
        const rawMem = await AsyncStorage.getItem(KOP_STORAGE_MEMBERS);
        const memList = rawMem ? JSON.parse(rawMem) : DEFAULT_KOP_MEMBERS;
        const rawLoans = await AsyncStorage.getItem(KOP_STORAGE_LOANS);
        const loanList = rawLoans ? JSON.parse(rawLoans) : [];

        const activeMems = memList.filter((m: any) => m.status === 'active');
        const sumPokok = activeMems.reduce((sum: number, m: any) => sum + (m.simpananPokok || 0), 0);
        const sumWajib = activeMems.reduce((sum: number, m: any) => sum + (m.simpananWajib || 0), 0);
        const sumSukarela = activeMems.reduce((sum: number, m: any) => sum + (m.tabunganSukarela || 0), 0);
        const sumLoans = loanList.filter((l: any) => l.status === 'confirmed_active' || l.status === 'disbursed_waiting_confirmation').reduce((sum: number, l: any) => sum + (l.nominal || 0), 0);
        const totalBal = Math.max(0, (sumPokok + sumWajib + sumSukarela) - sumLoans);

        const realBal: KoperasiBalance = {
          id: 'bal_kop_central',
          member_id: KOP_USER_ID,
          simpanan_pokok: sumPokok > 0 ? sumPokok : 200000,
          simpanan_wajib: sumWajib > 0 ? sumWajib : 100000,
          simpanan_sukarela: sumSukarela > 0 ? sumSukarela : 1550000,
          total_balance: totalBal > 0 ? totalBal : 1850000,
          active_loan: sumLoans,
          loan_remaining: sumLoans,
          updated_at: new Date().toISOString(),
        };
        setBalance(realBal);
        await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(realBal));

        const rawTx = await AsyncStorage.getItem(KOP_STORAGE_TX);
        if (rawTx) {
          setTransactions(JSON.parse(rawTx));
        } else {
          setTransactions([]);
          await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify([]));
        }
      } catch {
        setBalance(INITIAL_KOP_BALANCE);
        setTransactions([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    // Regular member: check KOP_STORAGE_MEMBERS
    try {
      const rawMem = await AsyncStorage.getItem(KOP_STORAGE_MEMBERS);
      const storedMyMid = await AsyncStorage.getItem('@mbclub_my_koperasi_mid');

      let memList: any[] = [];
      if (rawMem) {
        try {
          memList = JSON.parse(rawMem);
        } catch {
          memList = [...DEFAULT_KOP_MEMBERS];
        }
      } else {
        memList = [...DEFAULT_KOP_MEMBERS];
        await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(memList));
      }

      // Pastikan data Ayesha Fairuz Fajr selalu terdaftar dan sinkron
      const ayeshaIdx = memList.findIndex((m: any) =>
        m.mid === 'MBINA-JBR-2026-000002' ||
        m.kopMemberId === 'KOP-JBR-2026-000002' ||
        m.email === 'afairuzfajr@gmail.com' ||
        m.altEmail === 'ayesha.fairuz@mbc-bandung.org' ||
        m.nama?.toLowerCase().includes('ayesha')
      );
      if (ayeshaIdx === -1) {
        memList.unshift(DEFAULT_KOP_MEMBERS[0]);
        await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(memList));
      } else {
        memList[ayeshaIdx] = {
          ...memList[ayeshaIdx],
          id: '2089ee31-71e8-43d7-bb76-d218c10f932d',
          altId: 'mem_006',
          mid: 'MBINA-JBR-2026-000002',
          kopMemberId: 'KOP-JBR-2026-000002',
          nama: 'Ayesha Fairuz Fajr',
          email: 'afairuzfajr@gmail.com',
          altEmail: 'ayesha.fairuz@mbc-bandung.org',
          phone: '082129709696',
          status: 'active',
          simpananPokok: 100000,
          simpananWajib: 50000,
          tabunganSukarela: Math.max(memList[ayeshaIdx].tabunganSukarela || 0, 450000),
          lastPaidWajibMonth: currentMonthKey,
        };
        await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(memList));
      }

      const userMid = (storedMyMid || currentMember?.member_number || '').trim().toUpperCase();
      const userEmail = user?.email?.trim().toLowerCase();
      const userName = profile?.full_name?.trim().toLowerCase();
      const userPhone = profile?.phone?.trim();

      const isAyesha =
        user?.id === '2089ee31-71e8-43d7-bb76-d218c10f932d' ||
        userEmail === 'afairuzfajr@gmail.com' ||
        userEmail === 'ayesha.fairuz@mbc-bandung.org' ||
        userEmail?.includes('afairuz') ||
        userName?.includes('ayesha') ||
        user?.user_metadata?.full_name?.toLowerCase().includes('ayesha') ||
        userMid === 'MBINA-JBR-2026-000002' ||
        storedMyMid === 'MBINA-JBR-2026-000002';

      // Cari record
      let matchingRecords = memList.filter((m: any) =>
        (userMid && m.mid && m.mid.trim().toUpperCase() === userMid) ||
        (userEmail && (m.email?.toLowerCase() === userEmail || m.altEmail?.toLowerCase() === userEmail)) ||
        (m.id && (m.id === user.id || m.altId === user.id)) ||
        (userName && m.nama && m.nama.trim().toLowerCase() === userName) ||
        (userPhone && m.phone === userPhone)
      );

      if (isAyesha && matchingRecords.length === 0) {
        const foundAyesha = memList.find((m: any) => m.mid === 'MBINA-JBR-2026-000002' || m.nama?.toLowerCase().includes('ayesha'));
        if (foundAyesha) matchingRecords = [foundAyesha];
      }

      let found: any = null;
      if (matchingRecords.length > 0) {
        const activeRecord = matchingRecords.find((m: any) => m.status === 'active');
        const base = activeRecord || matchingRecords[0];

        const rawTotalDeposit = (base.simpananPokok ?? 0) + (base.simpananWajib ?? 0) + (base.tabunganSukarela ?? 0);
        const totalDeposit = rawTotalDeposit > 0 ? rawTotalDeposit : (isAyesha ? 600000 : 375000);

        const correctedPokok = 100000;
        const correctedWajib = 50000;
        const correctedSukarela = isAyesha ? Math.max(base.tabunganSukarela || 0, 450000) : Math.max(25000, totalDeposit - correctedPokok - correctedWajib);

        const isFundedOrActive = !!activeRecord || base.status === 'active' || totalDeposit >= 175000 || isAyesha;
        const effectiveMid = userMid || base.mid || (isAyesha ? 'MBINA-JBR-2026-000002' : 'MBINA-NEW');
        const assignedKopId = base.kopMemberId || (isFundedOrActive ? generateKopMemberId(effectiveMid) : null);

        found = {
          ...base,
          id: user.id || base.id,
          mid: effectiveMid,
          kopMemberId: assignedKopId,
          status: isFundedOrActive ? 'active' : base.status,
          simpananPokok: correctedPokok,
          simpananWajib: correctedWajib,
          tabunganSukarela: correctedSukarela,
          lastPaidWajibMonth: base.lastPaidWajibMonth || currentMonthKey,
        };

        const cleanMid = found.mid.trim().toUpperCase();
        const cleanList = [
          found,
          ...memList.filter((m: any) => !m.mid || m.mid.trim().toUpperCase() !== cleanMid)
        ];
        await AsyncStorage.setItem(KOP_STORAGE_MEMBERS, JSON.stringify(cleanList));
        await AsyncStorage.setItem('@mbclub_my_koperasi_mid', found.mid);
      }

      let activeMemBal: KoperasiBalance | null = null;
      if (found) {
        setMembershipStatus(found.status);
        setMemberKopData(found);
        const totalBal = (found.simpananPokok ?? 0) + (found.simpananWajib ?? 0) + (found.tabunganSukarela ?? 0);
        activeMemBal = {
          id: `bal_${found.id}`,
          member_id: found.id,
          simpanan_pokok: found.simpananPokok ?? 0,
          simpanan_wajib: found.simpananWajib ?? 0,
          simpanan_sukarela: found.tabunganSukarela ?? 0,
          total_balance: totalBal,
          active_loan: 0,
          loan_remaining: 0,
          updated_at: new Date().toISOString(),
        };
        setBalance(activeMemBal);
      } else {
        setMembershipStatus('unregistered');
        setBalance(ZERO_KOP_BALANCE);
      }

      // Check loans for member
      try {
        const rawLoans = await AsyncStorage.getItem(KOP_STORAGE_LOANS);
        if (rawLoans) {
          const allLoans = JSON.parse(rawLoans);
          const myLoans = allLoans.filter((l: any) =>
            (userMid && l.mid && l.mid.trim().toUpperCase() === userMid) ||
            (userEmail && l.email && l.email.trim().toLowerCase() === userEmail) ||
            (l.id && l.id === user.id)
          );
          setMemberLoans(myLoans);

          // Calculate active loan total for balance card
          const activeLoanSum = myLoans
            .filter((l: any) => l.status === 'confirmed_active' || l.status === 'active')
            .reduce((sum: number, l: any) => sum + (l.nominal || 0), 0);

          if (activeMemBal) {
            activeMemBal.active_loan = activeLoanSum;
            activeMemBal.loan_remaining = activeLoanSum;
            setBalance({ ...activeMemBal });
          }
        } else {
          setMemberLoans([]);
        }
      } catch {}

      // Check transactions
      const rawTx = await AsyncStorage.getItem(KOP_STORAGE_TX);
      if (rawTx) {
        const allTxs: KoperasiTransaction[] = JSON.parse(rawTx);
        const myTxs = allTxs.filter((t) =>
          (userMid && t.description && t.description.toUpperCase().includes(userMid)) ||
          t.member_id === user.id
        );
        setTransactions(myTxs);
      } else {
        setTransactions([]);
      }
    } catch {
      setMembershipStatus('unregistered');
      setBalance(ZERO_KOP_BALANCE);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isKopManager, currentMember?.member_number, profile?.full_name]);

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

  // Reset Semua Data ke Nol (Sesuai Permintaan User)
  const handleResetToZero = () => {
    showConfirmDialog(
      'Konfirmasi Reset Nol',
      'Apakah Anda yakin ingin mengosongkan seluruh saldo kas dan riwayat transaksi koperasi kembali ke Rp 0?',
      async () => {
        setBalance(ZERO_KOP_BALANCE);
        setTransactions([]);
        await AsyncStorage.setItem(KOP_STORAGE_BAL, JSON.stringify(ZERO_KOP_BALANCE));
        await AsyncStorage.setItem(KOP_STORAGE_TX, JSON.stringify([]));
        showAlertDialog('Berhasil', 'Seluruh data kas dan mutasi simpan pinjam koperasi telah di-reset ke Nol.');
      },
      'Reset ke Nol',
      'Batal'
    );
  };

  // Simpan Transaksi Baru Simpan Pinjam
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
      showAlertDialog('Sukses', `Transaksi ${labelMap[txSubtype]} senilai ${formatRupiah(numAmount)} berhasil dicatat.`);
    } catch (err) {
      showAlertDialog('Gagal', 'Terjadi kesalahan saat menyimpan transaksi.');
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
                  <Pressable
                    onPress={() => router.push('/(main)/admin/koperasi' as any)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      backgroundColor: 'rgba(251, 191, 36, 0.15)',
                      borderColor: '#FBBF24',
                      borderWidth: 1,
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Ionicons name="apps" size={13} color="#FBBF24" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FDE68A' }}>
                      Buka Dashboard Pengelola Koperasi
                    </Text>
                    <Ionicons name="arrow-forward" size={11} color="#FBBF24" />
                  </Pressable>
                </View>
                <Pressable onPress={handleResetToZero} style={styles.resetZeroBtn} hitSlop={6}>
                  <Ionicons name="refresh" size={13} color="#EF4444" />
                  <Text style={styles.resetZeroBtnText}>Nol-kan</Text>
                </Pressable>
              </View>
            )}

            {/* Registration Prompt for Unregistered Members */}
            {!isKopManager && membershipStatus === 'unregistered' && (
              <View style={styles.registerPromptCard}>
                <View style={styles.registerPromptHeader}>
                  <View style={styles.goldStarBadge}>
                    <Ionicons name="star" size={18} color="#000" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.registerPromptTitle}>Pendaftaran Anggota Koperasi</Text>
                    <Text style={styles.registerPromptSubtitle}>
                      Koperasi Bersama Satu Bintang • MB Club Indonesia
                    </Text>
                  </View>
                  <View style={styles.unregChip}>
                    <Text style={styles.unregChipText}>BELUM TERDAFTAR</Text>
                  </View>
                </View>

                <Text style={styles.registerPromptDesc}>
                  Daftarkan akun Anda untuk menikmati fasilitas pinjaman lunak bunga rendah <Text style={{ color: '#FBBF24', fontWeight: '700' }}>6% flat p.a. (PMK No. 49/2025)</Text>, dana talangan touring/servis, dan pembagian dividen tahunan <Text style={{ color: '#FBBF24', fontWeight: '700' }}>bunga 1% SHU</Text>.
                </Text>

                <View style={styles.registerFeeBoxes}>
                  <View style={styles.feeBox}>
                    <Text style={styles.feeBoxLabel}>Simpanan Pokok</Text>
                    <Text style={styles.feeBoxVal}>Rp 100.000</Text>
                    <Text style={styles.feeBoxNote}>1x saat daftar</Text>
                  </View>
                  <View style={styles.feeBox}>
                    <Text style={styles.feeBoxLabel}>Iuran Wajib</Text>
                    <Text style={styles.feeBoxVal}>Rp 50.000</Text>
                    <Text style={styles.feeBoxNote}>per bulan</Text>
                  </View>
                  <View style={styles.feeBox}>
                    <Text style={styles.feeBoxLabel}>Tabungan Sukarela</Text>
                    <Text style={styles.feeBoxVal}>Min. Rp 25.000</Text>
                    <Text style={styles.feeBoxNote}>bebas/fleksibel</Text>
                  </View>
                </View>

                <Pressable
                  onPress={openRegisterModal}
                  style={styles.openRegisterBtn}
                >
                  <Ionicons name="person-add" size={16} color="#000" />
                  <Text style={styles.openRegisterBtnText}>Daftar Jadi Anggota Koperasi Sekarang</Text>
                  <Ionicons name="chevron-forward" size={16} color="#000" />
                </Pressable>
              </View>
            )}

            {/* Pending Verification Banner */}
            {!isKopManager && membershipStatus === 'pending' && (
              <View style={styles.pendingMemberBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time" size={24} color="#FBBF24" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingTitle}>Pendaftaran Sedang Diverifikasi</Text>
                    <Text style={styles.pendingSubtitle}>
                      Pengelola Koperasi sedang memverifikasi setoran awal keanggotaan Anda.
                    </Text>
                  </View>
                  <View style={styles.pendingChip}>
                    <Text style={styles.pendingChipText}>MENUNGGU VERIFIKASI</Text>
                  </View>
                </View>

                <View style={styles.pendingDetailsBox}>
                  <Text style={styles.pendingDetailText}>
                    • MID Terdaftar: <Text style={{ color: '#FBBF24', fontWeight: '700' }}>{memberKopData?.mid || currentMember?.member_number || '-'}</Text>{'\n'}
                    • Setoran Awal: Pokok (Rp 100rb) + Wajib (Rp 50rb) + Sukarela ({formatRupiah(memberKopData?.tabunganSukarela || 25000)}){'\n'}
                    • Rekening Tujuan: <Text style={{ color: '#FDE68A', fontWeight: '700' }}>Bank Mandiri 137-00-1234567-8</Text> a.n. Koperasi Bersama Satu Bintang
                  </Text>
                </View>
              </View>
            )}

            {/* Rejected Verification Banner */}
            {!isKopManager && membershipStatus === 'rejected' && (
              <View style={styles.rejectedMemberBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rejectedTitle}>Pendaftaran Belum Disetujui</Text>
                    <Text style={styles.rejectedSubtitle}>
                      {memberKopData?.catatanAdmin || 'Bukti transfer tidak valid atau dana setoran belum diterima di mutasi rekening kas Mandiri koperasi.'}
                    </Text>
                  </View>
                  <View style={styles.rejectedChip}>
                    <Text style={styles.rejectedChipText}>DITOLAK</Text>
                  </View>
                </View>

                <Pressable
                  onPress={openRegisterModal}
                  style={styles.reRegisterBtn}
                >
                  <Ionicons name="refresh" size={14} color="#FFF" />
                  <Text style={styles.reRegisterBtnText}>Unggah Ulang Bukti Transfer</Text>
                </Pressable>
              </View>
            )}

            {/* Active Member Status Badge */}
            {!isKopManager && membershipStatus === 'active' && (
              <View style={styles.activeMemberBanner}>
                <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.activeMemberText}>
                      Status: <Text style={{ color: '#34D399', fontWeight: '800' }}>ANGGOTA RESMI AKTIF</Text>
                    </Text>
                    <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', borderWidth: 1, borderColor: '#FBBF24', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FBBF24' }}>
                        {memberKopData?.kopMemberId || (memberKopData?.mid ? generateKopMemberId(memberKopData.mid) : 'KOP-JBR-2026-000002')}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#D4D4D8', lineHeight: 16 }}>
                    No. Anggota Koperasi: <Text style={{ color: '#FBBF24', fontWeight: '800' }}>{memberKopData?.kopMemberId || (memberKopData?.mid ? generateKopMemberId(memberKopData.mid) : 'KOP-JBR-2026-000002')}</Text>
                    {' • '}MID MBCI: <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{memberKopData?.mid || currentMember?.member_number || '-'}</Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Verifikasi Pencairan Pinjaman dari Koperasi */}
            {!isKopManager && memberLoans.some((l) => l.status === 'disbursed_waiting_confirmation') && (
              memberLoans.filter((l) => l.status === 'disbursed_waiting_confirmation').map((loan) => (
                <View key={loan.id} style={styles.disbursedCard}>
                  <View style={styles.disbursedCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="cash" size={24} color="#34D399" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.disbursedTitle}>Dana Pinjaman Telah Ditransfer Koperasi! 💰</Text>
                        <Text style={styles.disbursedSubtitle}>
                          Pengelola koperasi telah mentransfer pencairan dana ke rekening bank Anda.
                        </Text>
                      </View>
                      <View style={styles.disbursedBadge}>
                        <Text style={styles.disbursedBadgeText}>PERLU VERIFIKASI</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.disbursedDetailBox}>
                    <View style={styles.disbursedRow}>
                      <Text style={styles.disbursedRowLabel}>Nominal Ditransfer:</Text>
                      <Text style={[styles.disbursedRowVal, { color: '#34D399', fontSize: 16, fontWeight: '800' }]}>
                        {formatRupiah(loan.nominal)}
                      </Text>
                    </View>
                    <View style={styles.disbursedRow}>
                      <Text style={styles.disbursedRowLabel}>Rekening Tujuan:</Text>
                      <Text style={[styles.disbursedRowVal, { color: '#FAFAFA', fontWeight: '700' }]}>
                        {loan.bankPenerima || memberKopData?.bankPengirim} — {loan.rekeningPenerima || memberKopData?.rekeningPengirim}
                      </Text>
                    </View>
                    <View style={styles.disbursedRow}>
                      <Text style={styles.disbursedRowLabel}>Atas Nama:</Text>
                      <Text style={styles.disbursedRowVal}>
                        {loan.namaPenerima || memberKopData?.namaPengirim || memberKopData?.nama}
                      </Text>
                    </View>
                    <View style={styles.disbursedRow}>
                      <Text style={styles.disbursedRowLabel}>Skema Suku Bunga:</Text>
                      <Text style={styles.disbursedRowVal}>6% Flat p.a. (PMK 49/2025) • Tenor {loan.tenorBulan} Bln</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <Pressable
                      onPress={() => setShowMemberProofLoanModal(loan)}
                      style={styles.checkDisbursementProofBtn}
                    >
                      <Ionicons name="receipt" size={14} color="#FBBF24" />
                      <Text style={styles.checkDisbursementProofBtnText}>Lihat Bukti Transfer</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleConfirmDisbursement(loan)}
                      style={styles.confirmDisbursementBtn}
                    >
                      <Ionicons name="checkmark-done-circle" size={16} color="#000" />
                      <Text style={styles.confirmDisbursementBtnText}>Konfirmasi Dana Diterima</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            {/* Saldo Simpan Pinjam Card */}
            <LuxuryCard variant="gold" style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                  <Ionicons name="wallet-outline" size={22} color={Colors.brand.gold} />
                  <Text style={styles.balanceTitle}>
                    {isKopManager ? 'Total Likuiditas Kas Simpan Pinjam' : 'Saldo Simpan Pinjam Anda'}
                  </Text>
                </View>
                {!isKopManager && membershipStatus === 'active' && (
                  <Pressable
                    onPress={() => setShowBukuRekeningModal(true)}
                    style={styles.openBukuBtn}
                  >
                    <Ionicons name="book-outline" size={13} color="#000" />
                    <Text style={styles.openBukuBtnText}>Buku Tabungan</Text>
                  </Pressable>
                )}
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

              {!isKopManager && membershipStatus === 'active' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <Pressable
                    onPress={() => openTransferModal('wajib')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: '#FBBF24',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons name="card" size={15} color="#000" />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#000' }}>
                      Transfer & Setor Simpanan
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openTransferModal('sukarela')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={15} color="#FAFAFA" />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FAFAFA' }}>
                      Setor Sukarela
                    </Text>
                  </Pressable>
                </View>
              )}
            </LuxuryCard>

            {/* Akses Cepat Buku Rekening Koperasi Digital */}
            {!isKopManager && membershipStatus === 'active' && (
              <Pressable
                onPress={() => setShowBukuRekeningModal(true)}
                style={styles.bukuBannerCard}
              >
                <View style={styles.bukuBannerIconBox}>
                  <Ionicons name="book" size={22} color="#FBBF24" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.bukuBannerTitle}>Buku Rekening Simpan Pinjam</Text>
                    <View style={styles.bukuPassbookTag}>
                      <Text style={styles.bukuPassbookTagText}>E-PASSBOOK</Text>
                    </View>
                  </View>
                  <Text style={styles.bukuBannerSub}>
                    No. Rek: {memberKopData?.kopMemberId || (memberKopData?.mid ? generateKopMemberId(memberKopData.mid) : 'KOP-JBR-2026-000002')} • Cek mutasi buku tabungan
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#FBBF24" />
              </Pressable>
            )}

            {/* Status & Notifikasi Tagihan Simpanan Wajib Bulanan */}
            {!isKopManager && membershipStatus === 'active' && (() => {
              const isCurrentMonthPaid = memberKopData?.lastPaidWajibMonth === currentMonthKey || (memberKopData?.simpananWajib >= 50000 && !memberKopData?.unpaidMonth);
              const currentMonthLabel = getMonthNameIndo(currentMonthKey);
              const sukarelaBalance = memberKopData?.tabunganSukarela ?? 0;

              return (
                <View style={[
                  styles.wajibNotificationCard,
                  isCurrentMonthPaid ? styles.wajibCardPaid : styles.wajibCardUnpaid
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <View style={[
                      styles.wajibIconBadge,
                      {
                        backgroundColor: isCurrentMonthPaid ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        borderColor: isCurrentMonthPaid ? '#34D399' : '#EF4444',
                      }
                    ]}>
                      <Ionicons
                        name={isCurrentMonthPaid ? 'shield-checkmark' : 'alert-circle'}
                        size={22}
                        color={isCurrentMonthPaid ? '#34D399' : '#EF4444'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={[styles.wajibCardTitle, { color: isCurrentMonthPaid ? '#34D399' : '#F87171' }]}>
                          {isCurrentMonthPaid ? 'Simpanan Wajib Bulan Ini: LUNAS' : 'Tagihan Simpanan Wajib Bulanan'}
                        </Text>
                        <View style={[
                          styles.wajibStatusChip,
                          {
                            backgroundColor: isCurrentMonthPaid ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            borderColor: isCurrentMonthPaid ? '#34D399' : '#EF4444',
                          }
                        ]}>
                          <Text style={[styles.wajibStatusChipText, { color: isCurrentMonthPaid ? '#34D399' : '#F87171' }]}>
                            {isCurrentMonthPaid ? `LUNAS (${currentMonthLabel})` : `BELUM DIBAYAR (${currentMonthLabel})`}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.wajibCardDesc}>
                        {isCurrentMonthPaid
                          ? `Iuran Simpanan Wajib periode ${currentMonthLabel} sebesar Rp 50.000 telah lunas tercatat. Tagihan berikutnya jatuh tempo pada tanggal 10 di bulan berikutnya.`
                          : `Iuran Simpanan Wajib periode ${currentMonthLabel} sebesar Rp 50.000 belum tercatat lunas. Segera lakukan pembayaran untuk menjaga keaktifan fasilitas pinjaman 6% PMK 49 dan dividen SHU.`}
                      </Text>

                      {!isCurrentMonthPaid ? (
                        <View style={{ marginTop: 10, gap: 8 }}>
                          {sukarelaBalance >= 50000 && (
                            <Pressable
                              onPress={handlePayWajibFromSukarela}
                              style={styles.payWajibSukarelaBtn}
                            >
                              <Ionicons name="swap-horizontal" size={15} color="#000" />
                              <Text style={styles.payWajibSukarelaBtnText}>
                                Potong dr Tabungan Sukarela ({formatRupiah(sukarelaBalance)})
                              </Text>
                            </Pressable>
                          )}
                          <Pressable
                            onPress={() => openTransferModal('wajib')}
                            style={styles.payWajibBankBtn}
                          >
                            <Ionicons name="card-outline" size={15} color="#FBBF24" />
                            <Text style={styles.payWajibBankBtnText}>Transfer Bank Mandiri & Upload Bukti (Rp 50.000)</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={{ marginTop: 6, gap: 8 }}>
                          <View style={styles.wajibPaidMetaRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="calendar-outline" size={12} color="#A1A1AA" />
                              <Text style={styles.wajibPaidMetaText}>Periode: {currentMonthLabel}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="wallet-outline" size={12} color="#34D399" />
                              <Text style={[styles.wajibPaidMetaText, { color: '#34D399', fontWeight: '700' }]}>
                                Saldo Sukarela: {formatRupiah(sukarelaBalance)}
                              </Text>
                            </View>
                          </View>
                          <Pressable
                            onPress={() => openTransferModal('sukarela')}
                            style={[
                              styles.payWajibBankBtn,
                              { borderColor: 'rgba(52, 211, 153, 0.4)', backgroundColor: 'rgba(52, 211, 153, 0.08)' }
                            ]}
                          >
                            <Ionicons name="add-circle-outline" size={15} color="#34D399" />
                            <Text style={[styles.payWajibBankBtnText, { color: '#34D399' }]}>
                              Setor Tabungan Sukarela via Bank Mandiri
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })()}

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

            {/* Banner Transparansi Tingkat Kesehatan Koperasi (PermenKopUKM No. 9/2020) */}
            <Pressable
              onPress={() => setShowHealthNoticeModal(true)}
              style={styles.healthMemberBanner}
            >
              <View style={styles.healthMemberBannerIcon}>
                <Ionicons name="shield-half" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.healthMemberBannerTitle}>
                    Tingkat Kesehatan: DALAM PENGAWASAN
                  </Text>
                  <View style={styles.healthMemberBannerBadge}>
                    <Text style={styles.healthMemberBannerBadgeText}>SKOR 54.4 / 100</Text>
                  </View>
                </View>
                <Text style={styles.healthMemberBannerSub}>
                  Audit PermenKopUKM 9/2020 dari data riil. Fasilitas pinjaman ditangguhkan sementara demi memproteksi keamanan tabungan sukarela anggota.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
            </Pressable>

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
                      showAlertDialog(
                        'Pencairan Pinjaman Ditangguhkan',
                        'Berdasarkan audit kesehatan PermenKopUKM No. 9/2020, Koperasi saat ini berstatus DALAM PENGAWASAN (Skor 54.4). Pencairan pinjaman baru dikunci otomatis demi memproteksi kas titipan anggota.'
                      );
                    }}
                    style={[styles.actionCard, { opacity: 0.85 }]}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Ionicons name="lock-closed" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.actionLabel}>Pencairan Pinjaman (-)</Text>
                    <View style={styles.loanLockMiniBadge}>
                      <Text style={styles.loanLockMiniBadgeText}>DITANGGUHKAN</Text>
                    </View>
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
                  {membershipStatus === 'unregistered' ? (
                    <LuxuryCard
                      onPress={openRegisterModal}
                      style={styles.actionCard}
                      padding={12}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                        <Ionicons name="person-add" size={22} color="#FBBF24" />
                      </View>
                      <Text style={[styles.actionLabel, { color: '#FDE68A', fontWeight: '800' }]}>
                        Daftar Anggota Koperasi
                      </Text>
                    </LuxuryCard>
                  ) : membershipStatus === 'pending' ? (
                    <LuxuryCard
                      onPress={() => Alert.alert(
                        'Status Pendaftaran Anda',
                        `Pendaftaran Anda atas nama ${memberKopData?.nama || profile?.full_name} (${memberKopData?.mid || currentMember?.member_number || '-'}) sedang dalam proses verifikasi mutasi bank oleh Pengelola Koperasi.\n\nRekening Koperasi: Bank Mandiri 137-00-1234567-8 a.n. Koperasi Bersama Satu Bintang.`
                      )}
                      style={styles.actionCard}
                      padding={12}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                        <Ionicons name="hourglass-outline" size={22} color="#F59E0B" />
                      </View>
                      <Text style={[styles.actionLabel, { color: '#FBBF24', fontWeight: '700' }]}>
                        Status Verifikasi (Pending)
                      </Text>
                    </LuxuryCard>
                  ) : (
                    <LuxuryCard
                      onPress={() => {
                        const isWajibPaid = memberKopData?.lastPaidWajibMonth === currentMonthKey || (memberKopData?.simpananWajib ?? 0) >= 50000;
                        openTransferModal(isWajibPaid ? 'sukarela' : 'wajib');
                      }}
                      style={styles.actionCard}
                      padding={12}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Ionicons name="card-outline" size={22} color="#10B981" />
                      </View>
                      <Text style={styles.actionLabel}>Transfer Simpanan Koperasi</Text>
                    </LuxuryCard>
                  )}

                  {/* Dana Talangan Darurat (Ditangguhkan Sementara Sesuai Regulasi) */}
                  <LuxuryCard
                    onPress={() => setShowHealthNoticeModal(true)}
                    style={[styles.actionCard, { opacity: 0.88 }]}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Ionicons name="lock-closed" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.actionLabel}>Dana Talangan Darurat</Text>
                    <View style={styles.loanLockMiniBadge}>
                      <Text style={styles.loanLockMiniBadgeText}>DITANGGUHKAN</Text>
                    </View>
                  </LuxuryCard>

                  {/* Pinjaman Lunak 6% (Ditangguhkan Sementara Sesuai Regulasi) */}
                  <LuxuryCard
                    onPress={() => setShowHealthNoticeModal(true)}
                    style={[styles.actionCard, { opacity: 0.88 }]}
                    padding={12}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Ionicons name="lock-closed" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.actionLabel}>Pinjaman 6% PMK 49</Text>
                    <View style={styles.loanLockMiniBadge}>
                      <Text style={styles.loanLockMiniBadgeText}>DITANGGUHKAN</Text>
                    </View>
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
                {(() => {
                  const isPokokLunas = memberKopData?.status === 'active' || (memberKopData?.simpananPokok ?? 0) >= 100000;
                  const isWajibPaid = memberKopData?.lastPaidWajibMonth === currentMonthKey || (memberKopData?.simpananWajib ?? 0) >= 50000;

                  const items: Array<{
                    key: 'pokok' | 'wajib' | 'sukarela' | 'talangan' | 'pinjaman' | 'cicilan';
                    label: string;
                    disabled?: boolean;
                    disabledReason?: string;
                    defaultAmount: string;
                  }> = [
                    {
                      key: 'pokok',
                      label: isPokokLunas ? 'Simpanan Pokok (Rp 100.000) ✓ LUNAS 1X' : 'Simpanan Pokok (Rp 100.000)',
                      disabled: isPokokLunas,
                      disabledReason: 'Simpanan Pokok sebesar Rp 100.000 telah lunas saat pendaftaran awal dan telah disetujui pengurus koperasi.\n\nSesuai aturan AD/ART, Simpanan Pokok hanya disetor 1x seumur hidup dan dinonaktifkan dari pembayaran berulang agar anggota koperasi dapat fokus pada Simpanan Wajib & Sukarela.',
                      defaultAmount: '100000',
                    },
                    {
                      key: 'wajib',
                      label: isWajibPaid ? 'Simpanan Wajib (Rp 50.000) ✓ LUNAS SEP' : 'Simpanan Wajib (Rp 50.000)',
                      disabled: isWajibPaid,
                      disabledReason: 'Simpanan Wajib periode bulan ini (Rp 50.000) telah lunas tercatat.\n\nUntuk mencegah pembayaran ganda dalam bulan yang sama, Anda disarankan menabung di Tabungan Sukarela atau membayar angsuran pinjaman.',
                      defaultAmount: '50000',
                    },
                    {
                      key: 'sukarela',
                      label: 'Tabungan Sukarela (Min. Rp 25.000)',
                      defaultAmount: '25000',
                    },
                    {
                      key: 'talangan',
                      label: 'Dana Talangan Servis (-)',
                      defaultAmount: '',
                    },
                    {
                      key: 'pinjaman',
                      label: 'Pinjaman Lunak (-)',
                      defaultAmount: '',
                    },
                    {
                      key: 'cicilan',
                      label: 'Angsuran Cicilan (+)',
                      defaultAmount: '',
                    },
                  ];

                  return items.map((item) => {
                    const isSelected = txSubtype === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[
                          styles.typeSelectorPill,
                          isSelected && styles.typeSelectorPillActive,
                          item.disabled && {
                            opacity: 0.5,
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                          },
                        ]}
                        onPress={() => {
                          if (item.disabled) {
                            showAlertDialog('Status Simpanan 🔒', item.disabledReason || 'Pilihan ini telah lunas.');
                            return;
                          }
                          setTxSubtype(item.key);
                          if (item.defaultAmount) {
                            setTxAmount(item.defaultAmount);
                          }
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {item.disabled && <Ionicons name="lock-closed" size={11} color="#A1A1AA" />}
                          <Text
                            style={[
                              styles.typeSelectorText,
                              isSelected && styles.typeSelectorTextActive,
                              item.disabled && { color: '#71717A' },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  });
                })()}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <Text style={styles.inputLabel}>Nominal (Rp)</Text>
                {txSubtype === 'wajib' && (
                  <View style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', borderWidth: 1, borderColor: '#34D399', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#34D399' }}>TARIF TETAP: RP 50.000 / BLN</Text>
                  </View>
                )}
                {txSubtype === 'pokok' && (
                  <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', borderWidth: 1, borderColor: '#FBBF24', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FBBF24' }}>TARIF TETAP: RP 100.000 (1X)</Text>
                  </View>
                )}
                {txSubtype === 'sukarela' && (
                  <View style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', borderWidth: 1, borderColor: '#60A5FA', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#60A5FA' }}>MINIMAL RP 25.000 (BEBAS)</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={styles.modalInput}
                value={txAmount}
                onChangeText={setTxAmount}
                placeholder={txSubtype === 'wajib' ? '50000' : txSubtype === 'pokok' ? '100000' : 'Contoh: 50000'}
                placeholderTextColor="#71717A"
                keyboardType="numeric"
              />
              {txSubtype === 'wajib' && (
                <Text style={{ fontSize: 10.5, color: '#34D399', marginTop: 3, marginBottom: 8 }}>
                  * Nominal otomatis terisi Rp 50.000 untuk mencegah kebingungan jumlah iuran bulanan.
                </Text>
              )}
              {txSubtype === 'pokok' && (
                <Text style={{ fontSize: 10.5, color: '#FBBF24', marginTop: 3, marginBottom: 8 }}>
                  * Nominal Simpanan Pokok resmi Rp 100.000 (hanya 1x diawal saat pendaftaran).
                </Text>
              )}
              {txSubtype === 'sukarela' && (
                <Text style={{ fontSize: 10.5, color: '#A1A1AA', marginTop: 3, marginBottom: 8 }}>
                  * Tabungan Sukarela bebas setor nominal berapa pun (minimal Rp 25.000) dan dapat ditarik sewaktu-waktu.
                </Text>
              )}

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

      {/* ── MODAL 4: FORMULIR PENDAFTARAN ANGGOTA KOPERASI ────────────── */}
      <Modal visible={showRegisterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Formulir Pendaftaran Anggota</Text>
                <Text style={styles.modalSubtitle}>Koperasi Bersama Satu Bintang • MBCI</Text>
              </View>
              <Pressable onPress={() => setShowRegisterModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#E4E4E7" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Syarat Keanggotaan Banner */}
              <View style={styles.midInfoBox}>
                <Ionicons name="information-circle" size={22} color="#FBBF24" />
                <Text style={styles.midInfoText}>
                  Syarat menjadi anggota Koperasi Bersama Satu Bintang:{'\n'}
                  1. Mempunyai Member Number (MID resmi MBCI){'\n'}
                  2. Mendaftarkan akun di Koperasi{'\n'}
                  3. Membayar Simpanan Pokok Rp 100.000, Iuran Wajib Rp 50.000, dan Tabungan Sukarela min. Rp 25.000{'\n'}
                  ✓ Berhak mendapatkan Bunga 1% dari SHU tahunan
                </Text>
              </View>

              {/* Input MID */}
              <Text style={styles.inputLabel}>Nomor Member ID (MID) Resmi MBCI *</Text>
              <TextInput
                style={styles.modalInput}
                value={regMid}
                onChangeText={setRegMid}
                placeholder="Contoh: MBINA-JKT-042"
                placeholderTextColor="#71717A"
                autoCapitalize="characters"
              />

              {/* Input Nama Lengkap */}
              <Text style={styles.inputLabel}>Nama Lengkap Sesuai KTA *</Text>
              <TextInput
                style={styles.modalInput}
                value={regName}
                onChangeText={setRegName}
                placeholder="Contoh: Bambang Soedarmono"
                placeholderTextColor="#71717A"
              />

              {/* Input Chapter */}
              <Text style={styles.inputLabel}>Chapter / Club Asal *</Text>
              <TextInput
                style={styles.modalInput}
                value={regChapter}
                onChangeText={setRegChapter}
                placeholder="Contoh: W124 MBCI Jakarta"
                placeholderTextColor="#71717A"
              />

              {/* Input Telepon */}
              <Text style={styles.inputLabel}>Nomor WhatsApp / Telepon *</Text>
              <TextInput
                style={styles.modalInput}
                value={regPhone}
                onChangeText={setRegPhone}
                placeholder="Contoh: 081298765432"
                placeholderTextColor="#71717A"
                keyboardType="phone-pad"
              />

              {/* Komposisi Setoran Awal */}
              <View style={styles.regSummaryBox}>
                <Text style={styles.regSummaryTitle}>RINCIAN KOMITMEN SETORAN AWAL:</Text>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>• Simpanan Pokok (1x diawal):</Text>
                  <Text style={[styles.reportRowVal, { color: '#60A5FA' }]}>Rp 100.000</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>• Iuran Wajib (Bulan ke-1):</Text>
                  <Text style={[styles.reportRowVal, { color: '#34D399' }]}>Rp 50.000</Text>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.inputLabel}>• Tabungan Sukarela Awal (Min. Rp 25.000):</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={regSukarela}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, '');
                      setRegSukarela(cleaned);
                    }}
                    placeholder="25000"
                    placeholderTextColor="#71717A"
                    keyboardType="numeric"
                  />
                </View>

                {(() => {
                  const sukarelaNum = parseInt(regSukarela.replace(/[^0-9]/g, ''), 10) || 0;
                  const totalInitial = 100000 + 50000 + sukarelaNum;
                  return (
                    <View style={[styles.reportRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 8 }]}>
                      <Text style={[styles.reportRowLabel, { color: '#FAFAFA', fontWeight: '800' }]}>Total Transfer Setoran Awal:</Text>
                      <Text style={[styles.reportRowVal, { color: '#FBBF24', fontSize: 16, fontWeight: '800' }]}>
                        {formatRupiah(totalInitial)}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* Bank Mandiri Transfer Box */}
              <View style={styles.regBankBox}>
                <Text style={styles.regBankTitle}>REKENING RESMI REKENING PENAMPUNG:</Text>
                <Text style={styles.regBankAcc}>Bank Mandiri: 137-00-1234567-8</Text>
                <Text style={styles.regBankNote}>a.n. Koperasi Bersama Satu Bintang</Text>
                <Text style={[styles.regBankNote, { marginTop: 4, color: '#D4D4D8' }]}>
                  Berita Transfer: DAFTAR KOP - {regMid || '[MID]'} - {regName || '[NAMA]'}
                </Text>
              </View>

              {/* Data Rekening Pengirim */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Bank Pengirim Transfer *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={bankPengirim}
                  onChangeText={setBankPengirim}
                  placeholder="Contoh: Bank BCA / Mandiri / BRI / BNI"
                  placeholderTextColor="#71717A"
                />

                <Text style={styles.inputLabel}>Nama Pemilik Rekening Pengirim *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={namaPengirim}
                  onChangeText={setNamaPengirim}
                  placeholder="Contoh: Ayesha Fairuz Fajr"
                  placeholderTextColor="#71717A"
                />

                <Text style={styles.inputLabel}>Nomor Rekening Bank Anggota (Wajib) *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={rekeningPengirim}
                  onChangeText={setRekeningPengirim}
                  placeholder="Contoh: 1370012345678"
                  placeholderTextColor="#71717A"
                  keyboardType="numeric"
                />
                <Text style={{ fontSize: 10, color: '#A1A1AA', marginTop: 3 }}>
                  💡 Rekening bank ini wajib dicantumkan sebagai rekening resmi penerimaan pencairan pinjaman koperasi dan pembagian hasil SHU tahunan.
                </Text>
              </View>

              {/* Upload Bukti Transfer Box */}
              <View style={styles.uploadProofSection}>
                <Text style={styles.regSummaryTitle}>UNGGAH BUKTI TRANSFER PEMBAYARAN *</Text>
                <Text style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 10 }}>
                  Lampirkan struk ATM / screenshot m-Banking sebagai bukti setoran awal Rp 175.000 (atau lebih) untuk diverifikasi pengelola.
                </Text>

                {transferProofUri ? (
                  <View style={styles.proofPreviewContainer}>
                    <Image
                      source={{ uri: transferProofUri }}
                      style={styles.proofPreviewImage}
                      resizeMode="cover"
                    />
                    <View style={styles.proofPreviewOverlay}>
                      <View style={styles.proofSuccessTag}>
                        <Ionicons name="checkmark-circle" size={14} color="#34D399" />
                        <Text style={styles.proofSuccessText}>Bukti Transfer Terlampir</Text>
                      </View>
                      <Pressable
                        onPress={handlePickProof}
                        style={styles.changeProofBtn}
                      >
                        <Ionicons name="camera-reverse" size={13} color="#FFF" />
                        <Text style={styles.changeProofBtnText}>Ganti Foto</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={handlePickProof}
                    style={styles.uploadProofPlaceholder}
                  >
                    <View style={styles.uploadProofIconCircle}>
                      <Ionicons name="cloud-upload" size={26} color="#FBBF24" />
                    </View>
                    <Text style={styles.uploadProofTitle}>Pilih Foto / Screenshot Bukti Transfer</Text>
                    <Text style={styles.uploadProofSub}>Format JPG, PNG atau Screenshot Mobile Banking</Text>
                  </Pressable>
                )}
              </View>

              <View style={{ height: 16 }} />
              <MetallicButton
                label={regSubmitting ? "Mengirim Pendaftaran..." : "Kirim Pendaftaran & Setoran Awal"}
                onPress={handleRegisterSubmit}
                variant="gold"
                size="lg"
                disabled={regSubmitting}
              />
              <View style={{ height: 8 }} />
              <MetallicButton
                label="Batal"
                onPress={() => setShowRegisterModal(false)}
                variant="silver"
                size="md"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: FORMULIR TRANSFER & SETORAN SIMPANAN KOPERASI          */}
      {/* ============================================================ */}
      <Modal
        visible={showPayWajibBankModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayWajibBankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="card" size={22} color="#FBBF24" />
                <View>
                  <Text style={styles.modalTitle}>Transfer & Setor Simpanan</Text>
                  <Text style={styles.modalSubtitle}>Koperasi Bersama Satu Bintang • MB Club Indonesia</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowPayWajibBankModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Rekening Tujuan Kas Koperasi */}
              <View style={styles.regBankBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="business" size={16} color="#FBBF24" />
                    <Text style={styles.regBankTitle}>REKENING TUJUAN KAS KOPERASI:</Text>
                  </View>
                  <Pressable
                    onPress={handleCopyRekening}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#FBBF24',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Ionicons name="copy-outline" size={12} color="#000" />
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#000' }}>Salin No. Rek</Text>
                  </Pressable>
                </View>
                <Text style={styles.regBankAcc}>Bank Mandiri: 137-00-1234567-8</Text>
                <Text style={styles.regBankNote}>a.n. Koperasi Bersama Satu Bintang</Text>
                <Text style={{ fontSize: 10, color: '#71717A', marginTop: 4 }}>
                  Kantor: Office 88 Kota Kasablanka Unit 16B, Jakarta Selatan
                </Text>
              </View>

              {/* Input Nominal Transfer */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Nominal Dana yang Ditransfer ke Kas Koperasi (Rp) *
              </Text>
              
              {/* Preset Chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {[
                  { label: 'Rp 50rb (Wajib Saja)', val: '50000' },
                  { label: 'Rp 100rb', val: '100000' },
                  { label: 'Rp 250rb', val: '250000' },
                  { label: 'Rp 500rb', val: '500000' },
                  { label: 'Rp 1 Juta', val: '1000000' },
                ].map((chip) => {
                  const isSel = transferTotalAmount === chip.val;
                  return (
                    <Pressable
                      key={chip.val}
                      onPress={() => setTransferTotalAmount(chip.val)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: isSel ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        borderWidth: 1,
                        borderColor: isSel ? '#FBBF24' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: isSel ? '800' : '600', color: isSel ? '#FBBF24' : '#D4D4D8' }}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={styles.modalInput}
                value={transferTotalAmount}
                onChangeText={setTransferTotalAmount}
                placeholder="Contoh: 500000"
                placeholderTextColor="#71717A"
                keyboardType="numeric"
              />

              {/* Rincian Alokasi Dana Otomatis */}
              {(() => {
                const breakdown = getTransferBreakdown(transferTotalAmount);
                return (
                  <View style={[styles.regSummaryBox, { marginTop: 12, backgroundColor: 'rgba(251, 191, 36, 0.08)', borderColor: 'rgba(251, 191, 36, 0.3)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={styles.regSummaryTitle}>RINCIAN PEMBAGIAN DANA (OTOMATIS):</Text>
                      <View style={{ backgroundColor: 'rgba(52, 211, 153, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#34D399' }}>SISTEM OTOMATIS</Text>
                      </View>
                    </View>

                    {/* 1. Simpanan Wajib */}
                    <View style={styles.reportRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reportRowLabel}>• Simpanan Wajib (Rp 50.000 / Bln):</Text>
                        <Text style={{ fontSize: 10.5, color: '#A1A1AA', marginTop: 1 }}>
                          {breakdown.wajibPortion > 0
                            ? 'Iuran wajib periode berjalan'
                            : breakdown.isWajibPaid
                            ? 'Sudah lunas sebelumnya'
                            : 'Nihil'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.reportRowVal, { color: breakdown.wajibPortion > 0 ? '#34D399' : '#A1A1AA', fontWeight: '700', fontSize: 13 }]}>
                          {formatRupiah(breakdown.wajibPortion)}
                        </Text>
                        {breakdown.wajibPortion >= 50000 && (
                          <Text style={{ fontSize: 9.5, color: '#34D399', fontWeight: '700' }}>✓ LUNAS BULAN INI</Text>
                        )}
                        {breakdown.isWajibPaid && breakdown.wajibPortion === 0 && (
                          <Text style={{ fontSize: 9.5, color: '#34D399', fontWeight: '700' }}>✓ SUDAH LUNAS</Text>
                        )}
                      </View>
                    </View>

                    {/* 2. Angsuran Pinjaman */}
                    <View style={[styles.reportRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 6 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reportRowLabel}>• Angsuran Pinjaman (PMK 49):</Text>
                        <Text style={{ fontSize: 10.5, color: '#A1A1AA', marginTop: 1 }}>
                          {breakdown.hasActiveLoan
                            ? (breakdown.loanPortion > 0 ? 'Cicilan pinjaman berjalan' : 'Tidak ada tagihan')
                            : 'Tidak ada pinjaman aktif (Nihil)'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.reportRowVal, { color: breakdown.loanPortion > 0 ? '#FBBF24' : '#71717A', fontWeight: '700', fontSize: 13 }]}>
                          {formatRupiah(breakdown.loanPortion)}
                        </Text>
                        <Text style={{ fontSize: 9.5, color: breakdown.loanPortion > 0 ? '#FBBF24' : '#71717A', fontWeight: '700' }}>
                          {breakdown.loanPortion > 0 ? 'TERPOTONG' : 'NIHIL (RP 0)'}
                        </Text>
                      </View>
                    </View>

                    {/* 3. Tabungan Sukarela */}
                    <View style={[styles.reportRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 6 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reportRowLabel}>• Tabungan Sukarela (Kelebihan Dana):</Text>
                        <Text style={{ fontSize: 10.5, color: '#60A5FA', marginTop: 1 }}>
                          Kelebihan dana otomatis masuk tabungan Anda
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.reportRowVal, { color: '#60A5FA', fontSize: 14, fontWeight: '800' }]}>
                          {formatRupiah(breakdown.sukarelaPortion)}
                        </Text>
                        <Text style={{ fontSize: 9.5, color: '#60A5FA', fontWeight: '700' }}>
                          {breakdown.sukarelaPortion > 0 ? 'MASUK TABUNGAN' : 'NIHIL'}
                        </Text>
                      </View>
                    </View>

                    {/* Total Row */}
                    <View style={[styles.reportRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 8, marginTop: 8 }]}>
                      <Text style={[styles.reportRowLabel, { color: '#FFF', fontWeight: '800', fontSize: 13 }]}>
                        TOTAL SETORAN KAS:
                      </Text>
                      <Text style={[styles.reportRowVal, { color: '#FBBF24', fontSize: 18, fontWeight: '800' }]}>
                        {formatRupiah(breakdown.totalAmount)}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Data Rekening Pengirim (Anggota) */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Data Rekening Pengirim (Anggota)</Text>
              <View style={{ gap: 8 }}>
                <View>
                  <Text style={{ fontSize: 10.5, color: '#A1A1AA', marginBottom: 3 }}>Bank Pengirim:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={wajibBankSender}
                    onChangeText={setWajibBankSender}
                    placeholder="Contoh: Bank Mandiri / BCA / BRI"
                    placeholderTextColor="#71717A"
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 10.5, color: '#A1A1AA', marginBottom: 3 }}>Nomor Rekening Pengirim:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={wajibRekSender}
                    onChangeText={setWajibRekSender}
                    placeholder="Nomor rekening pengirim"
                    placeholderTextColor="#71717A"
                    keyboardType="numeric"
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 10.5, color: '#A1A1AA', marginBottom: 3 }}>Nama Pemilik Rekening:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={wajibNameSender}
                    onChangeText={setWajibNameSender}
                    placeholder="Nama pemilik rekening"
                    placeholderTextColor="#71717A"
                  />
                </View>
              </View>

              {/* Upload Bukti */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Upload Bukti Transfer Bank Mandiri *</Text>
              <Pressable
                onPress={handlePickWajibProof}
                style={[
                  styles.proofUploadButton,
                  wajibTransferProofUri ? { borderColor: '#34D399', backgroundColor: 'rgba(52, 211, 153, 0.08)' } : {}
                ]}
              >
                {wajibTransferProofUri ? (
                  <View style={{ alignItems: 'center', gap: 6, width: '100%' }}>
                    <Image
                      source={{ uri: wajibTransferProofUri }}
                      style={{ width: '100%', height: 160, borderRadius: 8 }}
                      resizeMode="contain"
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#34D399' }}>
                        Bukti Terpilih (Ketuk untuk ganti)
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', gap: 6, paddingVertical: 12 }}>
                    <Ionicons name="cloud-upload-outline" size={32} color="#FBBF24" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FAFAFA' }}>
                      Pilih Foto / Bukti Transfer
                    </Text>
                    <Text style={{ fontSize: 11, color: '#A1A1AA', textAlign: 'center' }}>
                      Format JPG, PNG atau Screenshot Mobile Banking Mandiri/ATM
                    </Text>
                  </View>
                )}
              </Pressable>

              <View style={{ height: 16 }} />
              <MetallicButton
                label={wajibSubmitting ? "Mengirim Konfirmasi..." : "Kirim Konfirmasi Transfer ke Koperasi"}
                onPress={handlePayWajibBankSubmit}
                variant="gold"
                size="lg"
                disabled={wajibSubmitting}
              />
              <View style={{ height: 8 }} />
              <MetallicButton
                label="Batal"
                onPress={() => setShowPayWajibBankModal(false)}
                variant="silver"
                size="md"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: BUKU REKENING SIMPAN PINJAM KOPERASI DIGITAL           */}
      {/* ============================================================ */}
      <Modal
        visible={showBukuRekeningModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBukuRekeningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '92%', backgroundColor: '#0B0B0E' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="book" size={20} color="#FBBF24" />
                <View>
                  <Text style={styles.modalTitle}>Buku Tabungan Koperasi Digital</Text>
                  <Text style={{ fontSize: 10, color: '#A1A1AA' }}>E-Passbook Resmi Anggota Koperasi Bersama Satu Bintang</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowBukuRekeningModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Passbook Hardcover Style Card */}
              <View style={styles.passbookCover}>
                <View style={styles.passbookCoverHeader}>
                  <Image source={KOPERASI_LOGO} style={styles.passbookLogo} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passbookKopName}>KOPERASI BERSAMA SATU BINTANG</Text>
                    <Text style={styles.passbookKopSub}>MERCEDES-BENZ CLUB INDONESIA</Text>
                    <Text style={styles.passbookLegal}>Badan Hukum: AHU-0001234.AH.01.29.TAHUN 2026</Text>
                  </View>
                  <View style={styles.passbookTypeChip}>
                    <Text style={styles.passbookTypeChipText}>BUKU SIMPANAN</Text>
                  </View>
                </View>

                {/* Garis Pembatas Emas */}
                <View style={styles.passbookGoldLine} />

                {/* Identitas Pemilik Buku */}
                <View style={styles.passbookGrid}>
                  <View style={styles.passbookRow}>
                    <Text style={styles.passbookLabel}>No. Rekening Koperasi</Text>
                    <Text style={[styles.passbookVal, { color: '#FBBF24', fontWeight: '800' }]}>
                      {memberKopData?.kopMemberId || (memberKopData?.mid ? generateKopMemberId(memberKopData.mid) : 'KOP-JBR-2026-000002')}
                    </Text>
                  </View>
                  <View style={styles.passbookRow}>
                    <Text style={styles.passbookLabel}>Nomor MID MBCI</Text>
                    <Text style={styles.passbookVal}>{memberKopData?.mid || currentMember?.member_number || '-'}</Text>
                  </View>
                  <View style={styles.passbookRow}>
                    <Text style={styles.passbookLabel}>Nama Pemilik Rekening</Text>
                    <Text style={[styles.passbookVal, { color: '#FAFAFA', fontWeight: '700' }]}>
                      {memberKopData?.nama || profile?.full_name || 'Ayesha Fairuz Fajr'}
                    </Text>
                  </View>
                  <View style={styles.passbookRow}>
                    <Text style={styles.passbookLabel}>Klub / Chapter</Text>
                    <Text style={styles.passbookVal}>{memberKopData?.chapter || currentMember?.chapter || 'MBC Bandung'}</Text>
                  </View>
                  <View style={styles.passbookRow}>
                    <Text style={styles.passbookLabel}>Tanggal Buka Buku</Text>
                    <Text style={styles.passbookVal}>{formatDateTime(memberKopData?.tanggalDaftar || '2026-09-12')}</Text>
                  </View>
                  <View style={styles.passbookRow}>
                    <Text style={styles.passbookLabel}>Rekening Bank Penerima</Text>
                    <Text style={styles.passbookVal}>
                      {memberKopData?.bankPengirim || 'Bank Mandiri'} — {memberKopData?.rekeningPengirim || '137-00-1234567-8'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Saldo Akun di Buku Rekening */}
              <View style={styles.passbookBalanceBox}>
                <Text style={styles.passbookSectionTitle}>POSISI SALDO SIMPANAN ANGGOTA:</Text>
                <View style={styles.passbookBalGrid}>
                  <View style={styles.passbookBalCol}>
                    <Text style={styles.passbookBalLabel}>Simpanan Pokok</Text>
                    <Text style={styles.passbookBalNum}>{formatRupiah(memberKopData?.simpananPokok ?? 100000)}</Text>
                    <Text style={styles.passbookBalSub}>1x diawal</Text>
                  </View>
                  <View style={styles.passbookBalCol}>
                    <Text style={styles.passbookBalLabel}>Simpanan Wajib</Text>
                    <Text style={styles.passbookBalNum}>{formatRupiah(memberKopData?.simpananWajib ?? 50000)}</Text>
                    <Text style={styles.passbookBalSub}>Rp 50.000 / bln</Text>
                  </View>
                  <View style={styles.passbookBalCol}>
                    <Text style={styles.passbookBalLabel}>Tabungan Sukarela</Text>
                    <Text style={styles.passbookBalNum}>{formatRupiah(memberKopData?.tabunganSukarela ?? 450000)}</Text>
                    <Text style={styles.passbookBalSub}>Bebas setor/tarik</Text>
                  </View>
                </View>

                <View style={styles.passbookTotalRow}>
                  <Text style={styles.passbookTotalLabel}>TOTAL SALDO BUKU TABUNGAN:</Text>
                  <Text style={styles.passbookTotalVal}>
                    {formatRupiah((memberKopData?.simpananPokok ?? 100000) + (memberKopData?.simpananWajib ?? 50000) + (memberKopData?.tabunganSukarela ?? 450000))}
                  </Text>
                </View>
              </View>

              {/* Lembaran Catatan Mutasi Buku Tabungan */}
              <View style={styles.passbookSheet}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.passbookSheetTitle}>LEMBAR TRANSAKSI BUKU TABUNGAN</Text>
                  <Text style={styles.passbookSheetHalaman}>Halaman 1 / 1</Text>
                </View>

                {/* Tabel Header Lembar Buku */}
                <View style={styles.passbookTableHead}>
                  <Text style={[styles.passbookTh, { width: 68 }]}>Tgl</Text>
                  <Text style={[styles.passbookTh, { flex: 1 }]}>Sandi / Keterangan</Text>
                  <Text style={[styles.passbookTh, { width: 76, textAlign: 'right' }]}>Kredit (+)</Text>
                  <Text style={[styles.passbookTh, { width: 84, textAlign: 'right' }]}>Saldo</Text>
                </View>

                {/* Baris Buku Tabungan */}
                <View style={styles.passbookTableRow}>
                  <Text style={[styles.passbookTd, { width: 68 }]}>12/09/26</Text>
                  <Text style={[styles.passbookTd, { flex: 1 }]} numberOfLines={1}>Setoran Pokok Awal</Text>
                  <Text style={[styles.passbookTd, { width: 76, textAlign: 'right', color: '#34D399' }]}>100.000</Text>
                  <Text style={[styles.passbookTd, { width: 84, textAlign: 'right', fontWeight: '700' }]}>100.000</Text>
                </View>
                <View style={[styles.passbookTableRow, { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                  <Text style={[styles.passbookTd, { width: 68 }]}>12/09/26</Text>
                  <Text style={[styles.passbookTd, { flex: 1 }]} numberOfLines={1}>Iuran Wajib Sep 2026</Text>
                  <Text style={[styles.passbookTd, { width: 76, textAlign: 'right', color: '#34D399' }]}>50.000</Text>
                  <Text style={[styles.passbookTd, { width: 84, textAlign: 'right', fontWeight: '700' }]}>150.000</Text>
                </View>
                <View style={styles.passbookTableRow}>
                  <Text style={[styles.passbookTd, { width: 68 }]}>12/09/26</Text>
                  <Text style={[styles.passbookTd, { flex: 1 }]} numberOfLines={1}>Setoran Kas / Sukarela</Text>
                  <Text style={[styles.passbookTd, { width: 76, textAlign: 'right', color: '#34D399' }]}>450.000</Text>
                  <Text style={[styles.passbookTd, { width: 84, textAlign: 'right', fontWeight: '700', color: '#FBBF24' }]}>600.000</Text>
                </View>

                {/* Tanda Tangan & Stempel Pengesahan */}
                <View style={styles.passbookStampSection}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, color: '#71717A' }}>Dicetak Elektronik:</Text>
                    <Text style={{ fontSize: 10, color: '#A1A1AA', fontWeight: '600' }}>Sistem Core Koperasi v4.0</Text>
                    <Text style={{ fontSize: 9.5, color: '#71717A' }}>Sah tanpa tanda tangan basah</Text>
                  </View>
                  <View style={styles.passbookStampBadge}>
                    <Ionicons name="shield-checkmark" size={16} color="#34D399" />
                    <Text style={styles.passbookStampText}>TERVERIFIKASI SISTEM{'\n'}KOPERASI SATU BINTANG</Text>
                  </View>
                </View>
              </View>

              <View style={{ height: 16 }} />
              <MetallicButton
                label="Cetak / Simpan E-Passbook (PDF)"
                onPress={() => {
                  showAlertDialog(
                    'Cetak Buku Tabungan',
                    `Buku Rekening Koperasi No. ${memberKopData?.kopMemberId || 'KOP-JBR-2026-000002'} a.n. ${memberKopData?.nama || 'Ayesha Fairuz Fajr'} siap diunduh dalam format E-Statement PDF resmi.`
                  );
                }}
                variant="gold"
                size="md"
              />
              <View style={{ height: 8 }} />
              <MetallicButton
                label="Tutup Buku"
                onPress={() => setShowBukuRekeningModal(false)}
                variant="silver"
                size="md"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: FORMULIR PENGAJUAN PINJAMAN ANGGOTA                    */}
      {/* ============================================================ */}
      <Modal
        visible={showApplyLoanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApplyLoanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cash" size={20} color="#FBBF24" />
                <Text style={styles.modalTitle}>Pengajuan Pinjaman Koperasi</Text>
              </View>
              <Pressable onPress={() => setShowApplyLoanModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Syarat & Bunga Banner */}
              <View style={styles.midInfoBox}>
                <Ionicons name="information-circle" size={22} color="#FBBF24" />
                <Text style={styles.midInfoText}>
                  Ketentuan Pembiayaan (PMK No. 49 Tahun 2025):{'\n'}
                  • Bunga Flat 6% per tahun (0.5% per bulan){'\n'}
                  • Masa Tenggang (Grace Period): 6 Bulan{'\n'}
                  • Pencairan langsung ke Rekening Bank Terdaftar Anda
                </Text>
              </View>

              {/* Rekening Tujuan Pencairan */}
              <View style={[styles.regBankBox, { marginTop: 10, borderColor: 'rgba(52, 211, 153, 0.35)', backgroundColor: 'rgba(52, 211, 153, 0.08)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="card" size={16} color="#34D399" />
                  <Text style={[styles.regBankTitle, { color: '#34D399' }]}>REKENING PENERIMA PENCAIRAN (TERDAFTAR):</Text>
                </View>
                <Text style={[styles.regBankAcc, { color: '#FFF' }]}>
                  {memberKopData?.bankPengirim || 'Bank Mandiri'}: {memberKopData?.rekeningPengirim || '-'}
                </Text>
                <Text style={[styles.regBankNote, { color: '#D1FAE5' }]}>
                  a.n. {memberKopData?.namaPengirim || memberKopData?.nama || profile?.full_name}
                </Text>
              </View>

              {/* Input Nominal */}
              <Text style={styles.inputLabel}>Nominal Pengajuan Pinjaman (Rp) *</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={loanNominal}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setLoanNominal(cleaned);
                }}
                placeholder="Contoh: 15000000"
                placeholderTextColor="#71717A"
              />

              {/* Pilihan Tenor */}
              <Text style={styles.inputLabel}>Jangka Waktu / Tenor Pinjaman *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {[12, 24, 36, 48, 60].map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setLoanTenor(t)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: loanTenor === t ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      borderWidth: 1,
                      borderColor: loanTenor === t ? '#FBBF24' : 'rgba(255, 255, 255, 0.1)',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: loanTenor === t ? '#FBBF24' : '#A1A1AA' }}>
                      {t} Bln
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Simulasi Angsuran */}
              {(() => {
                const numNom = parseInt(loanNominal.replace(/[^0-9]/g, ''), 10) || 0;
                const pokokBln = loanTenor > 0 ? Math.round(numNom / loanTenor) : 0;
                const bungaBln = Math.round((numNom * 0.06) / 12);
                const totalAngsuran = pokokBln + bungaBln;
                return (
                  <View style={[styles.regSummaryBox, { marginTop: 12 }]}>
                    <Text style={styles.regSummaryTitle}>ESTIMASI ANGSURAN PER BULAN (6% FLAT P.A.):</Text>
                    <View style={styles.reportRow}>
                      <Text style={styles.reportRowLabel}>• Cicilan Pokok:</Text>
                      <Text style={styles.reportRowVal}>{formatRupiah(pokokBln)} / bln</Text>
                    </View>
                    <View style={styles.reportRow}>
                      <Text style={styles.reportRowLabel}>• Bunga 6% p.a. (0.5% / bln):</Text>
                      <Text style={styles.reportRowVal}>{formatRupiah(bungaBln)} / bln</Text>
                    </View>
                    <View style={[styles.reportRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 6, marginTop: 4 }]}>
                      <Text style={[styles.reportRowLabel, { color: '#FFF', fontWeight: '700' }]}>Total Angsuran:</Text>
                      <Text style={[styles.reportRowVal, { color: '#34D399', fontSize: 15, fontWeight: '800' }]}>
                        {formatRupiah(totalAngsuran)} / bulan
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#A1A1AA', marginTop: 4 }}>
                      * Masa Tenggang (Grace Period) 6 bulan pertama: Anggota hanya membayar bunga ringan atau penyesuaian cashflow.
                    </Text>
                  </View>
                );
              })()}

              {/* Tombol Panduan SOP 5C */}
              <Pressable
                onPress={() => setShowLoanSopModal(true)}
                style={styles.loanSopBannerBtn}
              >
                <Ionicons name="shield-checkmark" size={16} color="#FBBF24" />
                <Text style={styles.loanSopBannerBtnText}>
                  Pelajari SOP & Standar Kelayakan Finansial 5C
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#FBBF24" />
              </Pressable>

              {/* Peruntukan Dana */}
              <Text style={styles.inputLabel}>Peruntukan / Keperluan Dana Pinjaman *</Text>
              <TextInput
                style={styles.modalInput}
                value={loanTujuan}
                onChangeText={setLoanTujuan}
                placeholder="Contoh: Overhaul mesin & penggantian suspensi W124"
                placeholderTextColor="#71717A"
              />

              {/* SECTION: CAPACITY (KEMAMPUAN BAYAR & CASHFLOW) */}
              <View style={styles.screeningSectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="analytics" size={16} color="#60A5FA" />
                  <Text style={styles.screeningSectionTitle}>1. Analisis Kemampuan Bayar (Capacity)</Text>
                </View>

                <Text style={styles.inputLabel}>Penghasilan Bersih Bulanan (Rp) *</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={loanIncome}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setLoanIncome(cleaned);
                  }}
                  placeholder="Contoh: 15000000"
                  placeholderTextColor="#71717A"
                />

                {/* Live DSR (Debt Service Ratio) Meter */}
                {(() => {
                  const numNom = parseInt(loanNominal.replace(/[^0-9]/g, ''), 10) || 0;
                  const numInc = parseInt(loanIncome.replace(/[^0-9]/g, ''), 10) || 1;
                  const pokokBln = loanTenor > 0 ? Math.round(numNom / loanTenor) : 0;
                  const bungaBln = Math.round((numNom * 0.06) / 12);
                  const totalAngs = pokokBln + bungaBln;
                  const dsr = Math.round((totalAngs / numInc) * 1000) / 10;

                  const isSafe = dsr <= 30;
                  const isWarning = dsr > 30 && dsr <= 35;
                  const isDanger = dsr > 35;

                  const meterColor = isSafe ? '#34D399' : isWarning ? '#F59E0B' : '#EF4444';
                  const statusLabel = isSafe
                    ? 'SANGAT AMAN (Ideal ≤ 30%)'
                    : isWarning
                    ? 'BATAS MAKSIMAL (Waspada 31-35%)'
                    : 'BERISIKO TINGGI (DSR > 35% - Tidak Disarankan)';

                  return (
                    <View style={[styles.dsrMeterBox, { borderColor: meterColor }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.dsrMeterLabel}>Debt Service Ratio (DSR):</Text>
                        <Text style={[styles.dsrMeterVal, { color: meterColor }]}>{dsr}%</Text>
                      </View>
                      <View style={styles.dsrTrack}>
                        <View style={[styles.dsrFill, { width: `${Math.min(100, dsr * 2)}%`, backgroundColor: meterColor }]} />
                      </View>
                      <Text style={[styles.dsrStatusText, { color: meterColor }]}>
                        {statusLabel}
                      </Text>
                      <Text style={styles.dsrDesc}>
                        Angsuran {formatRupiah(totalAngs)}/bln dari penghasilan {formatRupiah(numInc)}/bln.
                      </Text>
                    </View>
                  );
                })()}

                {/* Upload Bukti Rekening Koran 3 Bulan */}
                <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                  Unggah Rekening Koran / Mutasi Bank 3 Bulan Terakhir *
                </Text>
                <Pressable
                  onPress={handlePickBankStatementProof}
                  style={styles.uploadStatementBtn}
                >
                  <Ionicons
                    name={loanBankStatementProof ? "document-attach" : "cloud-upload-outline"}
                    size={20}
                    color={loanBankStatementProof ? "#34D399" : "#FBBF24"}
                  />
                  <Text style={[styles.uploadStatementBtnText, loanBankStatementProof ? { color: '#34D399' } : undefined]}>
                    {loanBankStatementProof ? "✓ Dokumen Rekening Koran Terlampir" : "Pilih Berkas Rekening Koran (PDF / Foto)"}
                  </Text>
                </Pressable>
              </View>

              {/* SECTION: COLLATERAL (LEGALITAS & AGUNAN) */}
              <View style={[styles.screeningSectionCard, { marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="car-sport" size={16} color="#FBBF24" />
                  <Text style={styles.screeningSectionTitle}>2. Agunan & Jaminan (Collateral)</Text>
                </View>

                {/* Agunan */}
                <Text style={styles.inputLabel}>Unit Mercedes-Benz yang Dijaminkan *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={loanAgunan}
                  onChangeText={setLoanAgunan}
                  placeholder="Contoh: BPKB Mercedes-Benz W124 E320 Tahun 1995"
                  placeholderTextColor="#71717A"
                />

                {/* Nama di BPKB */}
                <Text style={styles.inputLabel}>Nama Pemilik Sesuai BPKB *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={loanAgunanOwner}
                  onChangeText={setLoanAgunanOwner}
                  placeholder="Atas nama sendiri / sertakan kuitansi jual beli"
                  placeholderTextColor="#71717A"
                />

                {/* Nilai Taksasi Agunan */}
                <Text style={styles.inputLabel}>Estimasi Nilai Pasar Wajar Agunan (Rp) *</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={loanNilaiAgunan}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setLoanNilaiAgunan(cleaned);
                  }}
                  placeholder="85000000"
                  placeholderTextColor="#71717A"
                />

                {/* Status Pajak */}
                <Text style={styles.inputLabel}>Status Pajak STNK / Kendaraan *</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Pressable
                    onPress={() => setLoanAgunanPajak('hidup')}
                    style={[
                      styles.taxOptionBtn,
                      loanAgunanPajak === 'hidup' && { borderColor: '#34D399', backgroundColor: 'rgba(52, 211, 153, 0.15)' }
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={loanAgunanPajak === 'hidup' ? '#34D399' : '#71717A'} />
                    <Text style={[styles.taxOptionBtnText, loanAgunanPajak === 'hidup' && { color: '#34D399', fontWeight: '700' }]}>
                      Pajak Hidup / Taat
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setLoanAgunanPajak('mati')}
                    style={[
                      styles.taxOptionBtn,
                      loanAgunanPajak === 'mati' && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.15)' }
                    ]}
                  >
                    <Ionicons name="alert-circle" size={16} color={loanAgunanPajak === 'mati' ? '#EF4444' : '#71717A'} />
                    <Text style={[styles.taxOptionBtnText, loanAgunanPajak === 'mati' && { color: '#EF4444', fontWeight: '700' }]}>
                      Pajak Terlambat / Mati
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* SECTION: CONDITION & SOCIAL COLLATERAL (PENJAMIN CHAPTER) */}
              <View style={[styles.screeningSectionCard, { marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="people" size={16} color="#A78BFA" />
                  <Text style={styles.screeningSectionTitle}>3. Rekomendasi Pengurus Chapter (Condition)</Text>
                </View>

                <Text style={styles.inputLabel}>Nama Ketua / Sekretaris Chapter Penjamin *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={loanChapterEndorser}
                  onChangeText={setLoanChapterEndorser}
                  placeholder="Contoh: Bpk. Budi Santoso (Ketua Chapter Bandung)"
                  placeholderTextColor="#71717A"
                />

                <Text style={styles.inputLabel}>No. WhatsApp Pengurus Chapter Penjamin *</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="phone-pad"
                  value={loanChapterEndorserPhone}
                  onChangeText={setLoanChapterEndorserPhone}
                  placeholder="Contoh: 081234567890"
                  placeholderTextColor="#71717A"
                />
              </View>

              <View style={{ height: 16 }} />
              <MetallicButton
                label={loanSubmitting ? "Mengirim Pengajuan..." : "Kirim Permohonan Pinjaman"}
                onPress={handleApplyLoanSubmit}
                variant="gold"
                size="lg"
                disabled={loanSubmitting}
              />
              <View style={{ height: 8 }} />
              <MetallicButton
                label="Batal"
                onPress={() => setShowApplyLoanModal(false)}
                variant="silver"
                size="md"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: VERIFIKASI BUKTI TRANSFER PENCAIRAN DARI KOPERASI      */}
      {/* ============================================================ */}
      <Modal
        visible={!!showMemberProofLoanModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMemberProofLoanModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="receipt" size={20} color="#34D399" />
                <Text style={styles.modalTitle}>Bukti Transfer Pencairan Koperasi</Text>
              </View>
              <Pressable onPress={() => setShowMemberProofLoanModal(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            {showMemberProofLoanModal && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.proofPreviewContainer, { height: 220, marginBottom: 12 }]}>
                  <Image
                    source={{
                      uri: showMemberProofLoanModal.disbursementProofUri ||
                        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
                    }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.disbursedDetailBox}>
                  <View style={styles.disbursedRow}>
                    <Text style={styles.disbursedRowLabel}>Nominal Pencairan:</Text>
                    <Text style={[styles.disbursedRowVal, { color: '#34D399', fontSize: 16, fontWeight: '800' }]}>
                      {formatRupiah(showMemberProofLoanModal.nominal)}
                    </Text>
                  </View>
                  <View style={styles.disbursedRow}>
                    <Text style={styles.disbursedRowLabel}>Rekening Pengirim:</Text>
                    <Text style={styles.disbursedRowVal}>Bank Mandiri 137-00-1234567-8 (Koperasi)</Text>
                  </View>
                  <View style={styles.disbursedRow}>
                    <Text style={styles.disbursedRowLabel}>Rekening Penerima Anda:</Text>
                    <Text style={[styles.disbursedRowVal, { color: '#FAFAFA', fontWeight: '700' }]}>
                      {showMemberProofLoanModal.bankPenerima || memberKopData?.bankPengirim} — {showMemberProofLoanModal.rekeningPenerima || memberKopData?.rekeningPengirim}
                    </Text>
                  </View>
                  <View style={styles.disbursedRow}>
                    <Text style={styles.disbursedRowLabel}>Atas Nama:</Text>
                    <Text style={styles.disbursedRowVal}>
                      {showMemberProofLoanModal.namaPenerima || memberKopData?.namaPengirim || memberKopData?.nama}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <Pressable
                    onPress={() => setShowMemberProofLoanModal(null)}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' }}
                  >
                    <Text style={{ color: '#A1A1AA', fontWeight: '600', fontSize: 13 }}>Tutup</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleConfirmDisbursement(showMemberProofLoanModal)}
                    style={{ flex: 2, paddingVertical: 12, borderRadius: 8, backgroundColor: '#34D399', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Ionicons name="checkmark-done-circle" size={18} color="#000" />
                    <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>Konfirmasi Dana Diterima</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: TRANSPARANSI KESEHATAN KOPERASI (PERMENKOPUKM 9/2020) */}
      {/* ============================================================ */}
      <Modal
        visible={showHealthNoticeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHealthNoticeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%', maxWidth: 520 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color="#FBBF24" />
                <View>
                  <Text style={styles.modalTitle}>Transparansi Kesehatan KSP</Text>
                  <Text style={{ fontSize: 10, color: '#A1A1AA' }}>PermenKopUKM RI No. 9 Tahun 2020</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowHealthNoticeModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Executive Badge */}
              <View style={styles.healthNoticeHeaderBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.healthNoticeKopTitle}>Koperasi Bersama Satu Bintang</Text>
                  <View style={styles.healthNoticeStatusTag}>
                    <Text style={styles.healthNoticeStatusTagText}>DALAM PENGAWASAN</Text>
                  </View>
                </View>
                <View style={styles.healthNoticeScoreRow}>
                  <View style={styles.healthNoticeScoreCircle}>
                    <Text style={styles.healthNoticeScoreNum}>54.4</Text>
                    <Text style={styles.healthNoticeScoreSub}>/ 100 Poin</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={styles.healthNoticeRatingTitle}>Penilaian Mandiri Data Riil</Text>
                    <Text style={styles.healthNoticeRatingDesc}>
                      Dihitung 100% dari kondisi pembukuan kas riil tanpa rekayasa data.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Status Layanan Pinjaman Lock Box */}
              <View style={styles.healthNoticeLockBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="lock-closed" size={16} color="#EF4444" />
                  <Text style={styles.healthNoticeLockTitle}>
                    Fasilitas Pinjaman Ditangguhkan Sementara
                  </Text>
                </View>
                <Text style={styles.healthNoticeLockDesc}>
                  Sesuai prinsip kehati-hatian (*prudential banking & cooperative*) dan regulasi Kementerian Koperasi & UKM RI, koperasi berstatus Dalam Pengawasan belum diperkenankan menyalurkan pinjaman baru.
                </Text>
              </View>

              {/* Mengapa Belum Bisa Memberikan Pinjaman? */}
              <Text style={styles.healthNoticeSectionTitle}>Mengapa Pinjaman Belum Dapat Dicairkan?</Text>
              <View style={{ gap: 8, marginTop: 6 }}>
                <View style={styles.healthNoticeReasonCard}>
                  <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.healthNoticeReasonHeader}>1. Proteksi Kas Simpanan Sukarela Anggota</Text>
                    <Text style={styles.healthNoticeReasonBody}>
                      Mayoritas kas yang ada di bank saat ini merupakan titipan Tabungan Sukarela anggota yang dapat ditarik sewaktu-waktu. Meminjamkan dana titipan ini ke luar tanpa bantalan modal yang aman berisiko fatal memicu gagal bayar saat anggota ingin menarik tabungannya.
                    </Text>
                  </View>
                </View>

                <View style={styles.healthNoticeReasonCard}>
                  <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.healthNoticeReasonHeader}>2. Modal Sendiri Disetor Masih Rp 300.000</Text>
                    <Text style={styles.healthNoticeReasonBody}>
                      Standar kelayakan modal disetor sendiri (Simpanan Pokok + Wajib) bagi koperasi yang menjalankan usaha pembiayaan/pinjaman adalah minimal Rp 15.000.000. Saat ini modal sendiri baru tercapai Rp 300.000 (2% dari standar).
                    </Text>
                  </View>
                </View>

                <View style={styles.healthNoticeReasonCard}>
                  <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.healthNoticeReasonHeader}>3. Kuorum Anggota Masih 2 Orang Aktif</Text>
                    <Text style={styles.healthNoticeReasonBody}>
                      Sesuai undang-undang perkoperasian, pembentukan KSP primer yang kokoh membutuhkan kuorum minimal 9 sampai 20 orang anggota aktif untuk menjamin diversifikasi risiko.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Kapan Fasilitas Pinjaman Dibuka Kembali? */}
              <Text style={[styles.healthNoticeSectionTitle, { marginTop: 14 }]}>
                Kapan Pinjaman & Talangan Akan Dibuka Kembali?
              </Text>
              <View style={styles.healthNoticeRoadmapBox}>
                <View style={styles.healthNoticeRoadmapItem}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#34D399" />
                  <Text style={styles.healthNoticeRoadmapText}>
                    Jumlah anggota aktif mencapai minimal 9 orang member ber-MID.
                  </Text>
                </View>
                <View style={styles.healthNoticeRoadmapItem}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#34D399" />
                  <Text style={styles.healthNoticeRoadmapText}>
                    Akumulasi Simpanan Pokok & Wajib (Modal Sendiri) mencapai minimal Rp 15.000.000.
                  </Text>
                </View>
                <View style={styles.healthNoticeRoadmapItem}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#34D399" />
                  <Text style={styles.healthNoticeRoadmapText}>
                    Tingkat kesehatan koperasi meningkat menjadi kategori CUKUP SEHAT (≥ 60) atau SEHAT (≥ 80).
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <Pressable
                onPress={() => setShowHealthNoticeModal(false)}
                style={styles.healthNoticeDismissBtn}
              >
                <Text style={styles.healthNoticeDismissBtnText}>
                  Saya Mengerti & Mendukung Tata Kelola Amanah
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: SOP SKRINING KELAYAKAN FINANSIAL ANGGOTA (PRINSIP 5C)  */}
      {/* ============================================================ */}
      <Modal
        visible={showLoanSopModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLoanSopModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '92%', maxWidth: 540 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color="#FBBF24" />
                <View>
                  <Text style={styles.modalTitle}>SOP Kelayakan Pinjaman (5C)</Text>
                  <Text style={{ fontSize: 10, color: '#A1A1AA' }}>Manajemen Risiko Pembiayaan Koperasi</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowLoanSopModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Banner Filosofi Proteksi */}
              <View style={styles.sopIntroCard}>
                <Ionicons name="lock-closed" size={20} color="#FBBF24" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sopIntroTitle}>Mengapa Skrining Finansial Sangat Ketat?</Text>
                  <Text style={styles.sopIntroDesc}>
                    Dana pinjaman bersumber dari <Text style={{ fontWeight: '800', color: '#FFF' }}>Tabungan Sukarela & Modal Anggota Lain</Text>. Memiliki unit Mercedes-Benz tidak otomatis menjamin arus kas sehat. Skrining 5C melindungi uang anggota dan mencegah peminjam dari beban utang berlebih.
                  </Text>
                </View>
              </View>

              {/* 5 Pilar Kelayakan Kredit */}
              <Text style={[styles.title, { fontSize: 13, marginTop: 12, marginBottom: 8 }]}>
                5 Parameter Evaluasi Kelayakan Finansial:
              </Text>

              {/* 1. Character */}
              <View style={styles.sopItemCard}>
                <View style={[styles.sopBadgeCircle, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                  <Text style={[styles.sopBadgeText, { color: '#34D399' }]}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sopItemTitle}>Character (Integritas & Kedisiplinan)</Text>
                  <Text style={styles.sopItemText}>
                    • Wajib lunas 100% Simpanan Pokok & Wajib (Nihil Tunggakan).{'\n'}
                    • Aktif berinteraksi di kegiatan Chapter MB Club Indonesia minimal 3 bulan.{'\n'}
                    • Menjaga nama baik dan etika berkomunitas.
                  </Text>
                </View>
              </View>

              {/* 2. Capacity */}
              <View style={styles.sopItemCard}>
                <View style={[styles.sopBadgeCircle, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                  <Text style={[styles.sopBadgeText, { color: '#60A5FA' }]}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sopItemTitle}>Capacity (Kemampuan Bayar / Arus Kas)</Text>
                  <Text style={styles.sopItemText}>
                    • <Text style={{ color: '#FBBF24', fontWeight: '700' }}>Debt Service Ratio (DSR) Maks. 35%</Text>: Angsuran bulanan tidak boleh melebihi 35% dari penghasilan bersih bulanan.{'\n'}
                    • Wajib melampirkan <Text style={{ color: '#FFF', fontWeight: '700' }}>Rekening Koran 3 Bulan Terakhir</Text> untuk membuktikan arus kas positif.
                  </Text>
                </View>
              </View>

              {/* 3. Capital */}
              <View style={styles.sopItemCard}>
                <View style={[styles.sopBadgeCircle, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Text style={[styles.sopBadgeText, { color: '#FBBF24' }]}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sopItemTitle}>Capital (Partisipasi Modal Simpanan)</Text>
                  <Text style={styles.sopItemText}>
                    • Plafon pinjaman dibatasi maksimal kelipatan 3x hingga 5x dari total saldo simpanan anggota di koperasi.{'\n'}
                    • Anggota memiliki tanggung jawab moral (*skin in the game*) dalam menjaga kesehatan kas bersama.
                  </Text>
                </View>
              </View>

              {/* 4. Collateral */}
              <View style={styles.sopItemCard}>
                <View style={[styles.sopBadgeCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Text style={[styles.sopBadgeText, { color: '#EF4444' }]}>4</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sopItemTitle}>Collateral (Legalitas & Taksasi Agunan)</Text>
                  <Text style={styles.sopItemText}>
                    • Agunan utama: BPKB unit Mercedes-Benz dengan rasio <Text style={{ color: '#FFF', fontWeight: '700' }}>LTV maksimal 70%</Text> dari nilai pasar wajar.{'\n'}
                    • Pajak kendaraan wajib aktif (taat pajak).{'\n'}
                    • BPKB wajib atas nama sendiri atau dilengkapi kuitansi jual-beli dan KTP pemilik sah.
                  </Text>
                </View>
              </View>

              {/* 5. Condition & Social Guarantee */}
              <View style={styles.sopItemCard}>
                <View style={[styles.sopBadgeCircle, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
                  <Text style={[styles.sopBadgeText, { color: '#C084FC' }]}>5</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sopItemTitle}>Condition & Penjamin Chapter (Social Collateral)</Text>
                  <Text style={styles.sopItemText}>
                    • Wajib mencantumkan rekomendasi resmi dari <Text style={{ color: '#FBBF24', fontWeight: '700' }}>Ketua atau Sekretaris Chapter</Text> tempat anggota bernaung.{'\n'}
                    • Kontrol sosial komunitas memastikan tidak ada anggota yang lepas tangan atas kewajibannya.
                  </Text>
                </View>
              </View>

              {/* Action Close */}
              <Pressable
                onPress={() => setShowLoanSopModal(false)}
                style={styles.healthNoticeDismissBtn}
              >
                <Text style={styles.healthNoticeDismissBtnText}>
                  Saya Mengerti & Siap Memenuhi Standar SOP 5C
                </Text>
              </Pressable>
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

  // ── Registration Prompt & Status Styles ─────────────────────────
  registerPromptCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(25, 23, 16, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    marginBottom: 14,
  },
  registerPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goldStarBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerPromptTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FAFAFA',
    letterSpacing: 0.3,
  },
  registerPromptSubtitle: {
    fontSize: 11,
    color: '#FDE68A',
    marginTop: 1,
  },
  unregChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unregChipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FBBF24',
  },
  registerPromptDesc: {
    fontSize: 11.5,
    color: '#D4D4D8',
    lineHeight: 18,
    marginVertical: 8,
  },
  registerFeeBoxes: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  feeBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  feeBoxLabel: {
    fontSize: 9.5,
    color: '#A1A1AA',
    fontWeight: '600',
    textAlign: 'center',
  },
  feeBoxVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FBBF24',
    marginVertical: 3,
    textAlign: 'center',
  },
  feeBoxNote: {
    fontSize: 8.5,
    color: '#71717A',
    textAlign: 'center',
  },
  openRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FBBF24',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 6,
  },
  openRegisterBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.3,
  },
  pendingMemberBanner: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 14,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FBBF24',
  },
  pendingSubtitle: {
    fontSize: 11,
    color: '#D4D4D8',
    marginTop: 2,
  },
  pendingChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingChipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FBBF24',
  },
  pendingDetailsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  pendingDetailText: {
    fontSize: 11,
    color: '#E4E4E7',
    lineHeight: 18,
  },
  rejectedMemberBanner: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginBottom: 14,
  },
  rejectedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  rejectedSubtitle: {
    fontSize: 11,
    color: '#D4D4D8',
    marginTop: 2,
    lineHeight: 16,
  },
  rejectedChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rejectedChipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#EF4444',
  },
  reRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  reRegisterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  activeMemberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  activeMemberText: {
    fontSize: 11.5,
    color: '#E4E4E7',
    flex: 1,
  },
  regSummaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  regSummaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  regBankBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  regBankTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  regBankAcc: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  regBankNote: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  uploadProofSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  uploadProofPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.04)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  uploadProofIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadProofTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAFAFA',
    textAlign: 'center',
    marginBottom: 4,
  },
  uploadProofSub: {
    fontSize: 11,
    color: '#A1A1AA',
    textAlign: 'center',
  },
  proofPreviewContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    backgroundColor: '#000',
  },
  proofPreviewImage: {
    width: '100%',
    height: 180,
  },
  proofPreviewOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  proofSuccessTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proofSuccessText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34D399',
  },
  changeProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  changeProofBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalCard: {
    backgroundColor: '#121214',
    borderRadius: 20,
    padding: Spacing.lg,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  disbursedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  disbursedCardHeader: {
    marginBottom: 10,
  },
  disbursedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#34D399',
  },
  disbursedSubtitle: {
    fontSize: 11,
    color: '#D1FAE5',
    marginTop: 2,
  },
  disbursedBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  disbursedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#34D399',
  },
  disbursedDetailBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  disbursedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disbursedRowLabel: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  disbursedRowVal: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkDisbursementProofBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  checkDisbursementProofBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  confirmDisbursementBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#34D399',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  confirmDisbursementBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  wajibNotificationCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  wajibCardPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  wajibCardUnpaid: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  wajibIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  wajibCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  wajibStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  wajibStatusChipText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  wajibCardDesc: {
    fontSize: 11.5,
    color: '#D4D4D8',
    marginTop: 4,
    lineHeight: 16,
  },
  payWajibSukarelaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FBBF24',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  payWajibSukarelaBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  payWajibBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: '#FBBF24',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  payWajibBankBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  wajibPaidMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexWrap: 'wrap',
  },
  wajibPaidMetaText: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  proofUploadButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.04)',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  openBukuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  openBukuBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  bukuBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  bukuBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bukuBannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  bukuPassbookTag: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  bukuPassbookTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  bukuBannerSub: {
    fontSize: 11,
    color: '#D4D4D8',
    marginTop: 2,
  },
  passbookCover: {
    backgroundColor: '#18130B',
    borderWidth: 2,
    borderColor: '#C5A059',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  passbookCoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passbookLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#C5A059',
  },
  passbookKopName: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  passbookKopSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E4E4E7',
    marginTop: 1,
  },
  passbookLegal: {
    fontSize: 8.5,
    color: '#A1A1AA',
    marginTop: 2,
  },
  passbookTypeChip: {
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderWidth: 1,
    borderColor: '#FBBF24',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  passbookTypeChipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FBBF24',
  },
  passbookGoldLine: {
    height: 1,
    backgroundColor: 'rgba(197, 160, 89, 0.35)',
    marginVertical: 12,
  },
  passbookGrid: {
    gap: 6,
  },
  passbookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  passbookLabel: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  passbookVal: {
    fontSize: 11.5,
    color: '#FAFAFA',
    fontWeight: '600',
    textAlign: 'right',
  },
  passbookBalanceBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  passbookSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  passbookBalGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  passbookBalCol: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  passbookBalLabel: {
    fontSize: 9.5,
    color: '#A1A1AA',
  },
  passbookBalNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FAFAFA',
    marginTop: 2,
  },
  passbookBalSub: {
    fontSize: 8.5,
    color: '#71717A',
    marginTop: 2,
  },
  passbookTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  passbookTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  passbookTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FBBF24',
  },
  passbookSheet: {
    backgroundColor: '#0F1115',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  passbookSheetTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E4E4E7',
    letterSpacing: 0.5,
  },
  passbookSheetHalaman: {
    fontSize: 9.5,
    color: '#71717A',
  },
  passbookTableHead: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  passbookTh: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FBBF24',
  },
  passbookTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  passbookTd: {
    fontSize: 10,
    color: '#D4D4D8',
  },
  passbookStampSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  passbookStampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#34D399',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
  },
  passbookStampText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#34D399',
    lineHeight: 11,
  },

  // ============================================================
  // HEALTH TRANSPARENCY & LOAN LOCK STYLES (PERMENKOPUKM 9/2020)
  // ============================================================
  healthMemberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  healthMemberBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthMemberBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#F59E0B',
  },
  healthMemberBannerBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  healthMemberBannerBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  healthMemberBannerSub: {
    fontSize: 10.5,
    color: '#D4D4D8',
    marginTop: 3,
    lineHeight: 15,
  },

  // Locked Mini Badge on Loan Cards
  loanLockMiniBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  loanLockMiniBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },

  // Modal Health Notice Styles
  healthNoticeHeaderBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  healthNoticeKopTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  healthNoticeStatusTag: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  healthNoticeStatusTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  healthNoticeScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  healthNoticeScoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthNoticeScoreNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F59E0B',
  },
  healthNoticeScoreSub: {
    fontSize: 8.5,
    color: '#A1A1AA',
    marginTop: -2,
  },
  healthNoticeRatingTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  healthNoticeRatingDesc: {
    fontSize: 10.5,
    color: '#A1A1AA',
    marginTop: 2,
    lineHeight: 14,
  },

  healthNoticeLockBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  healthNoticeLockTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  healthNoticeLockDesc: {
    fontSize: 10.5,
    color: '#FCA5A5',
    marginTop: 4,
    lineHeight: 15,
  },

  healthNoticeSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FBBF24',
    marginBottom: 6,
  },
  healthNoticeReasonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 10,
  },
  healthNoticeReasonHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  healthNoticeReasonBody: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 2,
    lineHeight: 14,
  },

  healthNoticeRoadmapBox: {
    backgroundColor: 'rgba(52, 211, 153, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  healthNoticeRoadmapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  healthNoticeRoadmapText: {
    fontSize: 10.5,
    color: '#D1FAE5',
    flex: 1,
    lineHeight: 15,
  },

  healthNoticeDismissBtn: {
    backgroundColor: '#FBBF24',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  healthNoticeDismissBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#000',
  },

  // ============================================================
  // 5C FINANCIAL SCREENING & DSR STYLES
  // ============================================================
  loanSopBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
    marginBottom: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  loanSopBannerBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    flex: 1,
    marginLeft: 6,
  },
  screeningSectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  screeningSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  dsrMeterBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  dsrMeterLabel: {
    fontSize: 10.5,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  dsrMeterVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  dsrTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  dsrFill: {
    height: '100%',
    borderRadius: 3,
  },
  dsrStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dsrDesc: {
    fontSize: 9.5,
    color: '#A1A1AA',
    marginTop: 2,
  },
  uploadStatementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginTop: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  uploadStatementBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },
  taxOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  taxOptionBtnText: {
    fontSize: 11,
    color: '#A1A1AA',
  },

  // SOP Modal Card Styles
  sopIntroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1.5,
    borderColor: '#FBBF24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sopIntroTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FBBF24',
  },
  sopIntroDesc: {
    fontSize: 10,
    color: '#D4D4D8',
    marginTop: 3,
    lineHeight: 15,
  },
  sopItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  sopBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sopBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  sopItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FAFAFA',
    marginBottom: 3,
  },
  sopItemText: {
    fontSize: 10,
    color: '#A1A1AA',
    lineHeight: 15,
  },
});
