// ============================================================
// marketplaceService — Layanan Toko & Marketplace MB INA
// Mengadopsi Proses Bisnis Modul M7 MBCINA
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TierService } from './tierService';

export type LapakStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REJECTED' | 'REVISION';
export type ProductStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'REVISION';
export type ProductCondition = 'NEW' | 'USED';

export interface LapakPendingRenewal {
  months: number;
  original_fee: number;
  tier_discount: number;
  final_fee: number;
  payment_proof_url: string;
  notes?: string;
  requested_at: string;
}

export interface Lapak {
  id: string; // Format: LPK-MEM-YYYY-XXX atau LPK-SPN-YYYY-XXX
  user_id: string;
  member_id: string;
  pemilik: string;
  name: string;
  description: string;
  category: string;
  contact_phone: string;
  contact_whatsapp: string;
  logo_url: string;
  banner_url: string;
  sewa_start_date: string;
  sewa_end_date: string;
  sewa_status: LapakStatus;
  sewa_fee: number;
  original_fee: number;
  tier_discount: number;
  final_fee: number;
  sewa_paid_status: 'PAID' | 'UNPAID';
  is_active: boolean;
  is_verified: boolean;
  created_by: string;
  payment_proof_url?: string;
  rejection_reason?: string;
  pending_renewal?: LapakPendingRenewal;
  created_at: string;
  updated_at: string;
}

export interface LapakProduct {
  id: string;
  lapak_id: string;
  lapak_name?: string;
  name: string;
  description: string;
  price: number;
  condition: ProductCondition;
  location: string;
  images: string[];
  views: number;
  status: ProductStatus;
  is_published: boolean;
  category: string;
  contact_whatsapp: string;
  user_id: string;
  seller_name: string;
  member_id: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface LapakReview {
  id: string;
  lapak_id: string;
  lapak_name?: string;
  user_id: string;
  user_name: string;
  member_id: string;
  rating: number; // 1-5
  content: string;
  created_at: string;
}

export interface LapakSewaLog {
  id: string;
  lapak_id: string;
  lapak_name?: string;
  action: 'SEWA' | 'PERPANJANG';
  period_start: string;
  period_end: string;
  fee: number;
  payment_status: 'PAID' | 'UNPAID';
  notes: string;
  created_by: string;
  created_at: string;
}

export interface LapakInteraction {
  lapak_id: string;
  lapak_name: string;
  contact_person: string;
  product_name: string;
  interaction_date: string;
  interaction_type: string;
  reviewed: boolean;
}

const STORAGE_KEY = '@mbclub_marketplace_v6_spn_real';
const INTERACTIONS_KEY = '@mbclub_marketplace_interactions_v6_spn_real';

// ── Data Lapak Real (Hanya Member Real & Sponsor Resmi) ─────
const SEED_LAPAK: Lapak[] = [
  {
    id: 'LPK-MEM-2026-004',
    user_id: '2089ee31-71e8-43d7-bb76-d218c10f932d',
    member_id: 'MBINA-JBR-2026-000002',
    pemilik: 'Ayesha Fairuz Fajr',
    name: 'Garasi FayFay',
    description: 'Memberikan pelayanan spesialis service radiator, tune up, & overhaul mesin Mercedes-Benz klasik & modern.',
    category: 'Jasa & Bengkel',
    contact_phone: '082129709696',
    contact_whatsapp: '082129709696',
    logo_url: 'https://lh3.googleusercontent.com/a/ACg8ocJoTM8NW0WR_Uak2DYhjLI0bQgTjSkkrH8CPiJa6AeLutmCJ9Pj=s96-c',
    banner_url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200',
    sewa_start_date: '2026-08-15',
    sewa_end_date: '2027-08-15',
    sewa_status: 'ACTIVE',
    original_fee: 60000,
    tier_discount: 20,
    sewa_fee: 48000,
    final_fee: 48000,
    sewa_paid_status: 'PAID',
    is_active: true,
    is_verified: true,
    created_by: '2089ee31-71e8-43d7-bb76-d218c10f932d',
    payment_proof_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    created_at: '2026-08-15T11:00:00Z',
    updated_at: '2026-08-15T11:00:00Z',
  },
  {
    id: 'LPK-SPN-2026-001',
    user_id: 'usr_spn_001',
    member_id: 'MBINA-SPN-2026-001',
    pemilik: 'PT Panji Rama Otomotif (Pro Motor)',
    name: 'Mercedes-Benz Pro Motor Official Store',
    description: 'Official Authorized Dealer & Service Partner Mercedes-Benz Club Indonesia. Menjual suku cadang asli OEM & merchandise resmi pabrikan.',
    category: 'Sponsor & Dealer Resmi',
    contact_phone: '021-7279888',
    contact_whatsapp: '081198765432',
    logo_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=300',
    banner_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200',
    sewa_start_date: '2026-08-01',
    sewa_end_date: '2026-11-01',
    sewa_status: 'ACTIVE',
    original_fee: 15000,
    tier_discount: 100,
    sewa_fee: 0,
    final_fee: 0,
    sewa_paid_status: 'PAID',
    is_active: true,
    is_verified: true,
    created_by: 'usr_spn_001',
    payment_proof_url: 'SPONSORSHIP_PACKAGE_BENEFIT',
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },
];

const SEED_PRODUCTS: LapakProduct[] = [
  {
    id: 'prod_007',
    lapak_id: 'LPK-MEM-2026-004',
    lapak_name: 'Garasi FayFay',
    name: 'Paket Overhaul Radiator & Coolant Mercedes-Benz',
    description: 'Paket pembersihan saluran radiator, ganti selang bypass OEM, dan kuras pendingin menggunakan Mercedes-Benz Genuine Coolant Blue/Pink.',
    price: 650000,
    condition: 'NEW',
    location: 'Bandung',
    images: ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600'],
    views: 180,
    status: 'APPROVED',
    is_published: true,
    category: 'Jasa & Bengkel',
    contact_whatsapp: '082129709696',
    user_id: '2089ee31-71e8-43d7-bb76-d218c10f932d',
    seller_name: 'Ayesha Fairuz Fajr',
    member_id: 'MBINA-JBR-2026-000002',
    created_at: '2026-08-16T15:00:00Z',
    updated_at: '2026-08-16T15:00:00Z',
  },
  {
    id: 'prod_008',
    lapak_id: 'LPK-MEM-2026-004',
    lapak_name: 'Garasi FayFay',
    name: 'Koleksi Eksklusif Merchandise MB INA Platinum 2026',
    description: 'Kaos polo katun premium combed 30s dengan bordir logo emas Mercedes-Benz Club Indonesia. Sesuai thread pre-order di forum resmi.',
    price: 185000,
    condition: 'NEW',
    location: 'Bandung',
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600'],
    views: 95,
    status: 'APPROVED',
    is_published: true,
    category: 'Merchandise Resmi',
    contact_whatsapp: '082129709696',
    user_id: '2089ee31-71e8-43d7-bb76-d218c10f932d',
    seller_name: 'Ayesha Fairuz Fajr',
    member_id: 'MBINA-JBR-2026-000002',
    created_at: '2026-08-17T10:00:00Z',
    updated_at: '2026-08-17T10:00:00Z',
  },
  {
    id: 'prod_spn_001',
    lapak_id: 'LPK-SPN-2026-001',
    lapak_name: 'Mercedes-Benz Pro Motor Official Store',
    name: 'Paket Servis Berkala A & B Class Mercedes-Benz OEM',
    description: 'Servis resmi berkala di bengkel resmi Pro Motor menggunakan Star Diagnosis dan suku cadang asli Mercedes-Benz pabrikan.',
    price: 3200000,
    condition: 'NEW',
    location: 'Jakarta Selatan',
    images: ['https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600'],
    views: 310,
    status: 'APPROVED',
    is_published: true,
    category: 'Sponsor & Dealer Resmi',
    contact_whatsapp: '081198765432',
    user_id: 'usr_spn_001',
    seller_name: 'PT Panji Rama Otomotif (Pro Motor)',
    member_id: 'MBINA-SPN-2026-001',
    created_at: '2026-08-10T09:00:00Z',
    updated_at: '2026-08-10T09:00:00Z',
  },
];

const SEED_REVIEWS: LapakReview[] = [];

const SEED_SEWA_LOGS: LapakSewaLog[] = [
  {
    id: 'log_003',
    lapak_id: 'LPK-MEM-2026-004',
    lapak_name: 'Garasi FayFay',
    action: 'SEWA',
    period_start: '2026-08-15',
    period_end: '2027-08-15',
    fee: 48000,
    payment_status: 'PAID',
    notes: 'Sewa lapak resmi 12 bulan (Garasi FayFay - Ayesha Fairuz Fajr)',
    created_by: '2089ee31-71e8-43d7-bb76-d218c10f932d',
    created_at: '2026-08-15T11:00:00Z',
  },
  {
    id: 'log_spn_001',
    lapak_id: 'LPK-SPN-2026-001',
    lapak_name: 'Mercedes-Benz Pro Motor Official Store',
    action: 'SEWA',
    period_start: '2026-01-01',
    period_end: '2026-04-01',
    fee: 0,
    payment_status: 'PAID',
    notes: 'Sewa lapak mitra sponsor resmi 3 bulan (GRATIS 3 Bulan Paket Benefit Sponsor - PT Panji Rama Otomotif)',
    created_by: 'usr_spn_001',
    created_at: '2026-01-01T08:00:00Z',
  },
];

interface MarketplaceStoreData {
  lapak: Lapak[];
  products: LapakProduct[];
  reviews: LapakReview[];
  sewaLogs: LapakSewaLog[];
}

export class MarketplaceService {
  // ── 1. Inisialisasi Storage Persisten ────────────────────────
  private static async getStore(): Promise<MarketplaceStoreData> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const store: MarketplaceStoreData = JSON.parse(raw);
        // Otomatisasi pengecekan jatuh tempo sewa lapak
        const todayStr = new Date().toISOString().split('T')[0];
        let hasExpiredChanges = false;
        store.lapak.forEach((l) => {
          if (l.sewa_status === 'ACTIVE' && l.sewa_end_date < todayStr) {
            l.sewa_status = 'EXPIRED';
            l.is_active = false;
            hasExpiredChanges = true;
          }
        });

        // Reset/normalize lapak sponsor jika sebelumnya ter-klik perpanjang tanpa sengaja
        const promotorLapak = store.lapak.find((l) => l.id === 'LPK-SPN-2026-001');
        if (promotorLapak && promotorLapak.sewa_end_date > '2026-11-01' && !promotorLapak.pending_renewal) {
          promotorLapak.sewa_start_date = '2026-08-01';
          promotorLapak.sewa_end_date = '2026-11-01';
          promotorLapak.sewa_status = 'ACTIVE';
          promotorLapak.is_active = true;
          hasExpiredChanges = true;
        }

        if (hasExpiredChanges) {
          await this.saveStore(store);
        }
        return store;
      }
    } catch {}

    // Inisialisasi dari seed resmi MBCINA
    const initial: MarketplaceStoreData = {
      lapak: SEED_LAPAK,
      products: SEED_PRODUCTS,
      reviews: SEED_REVIEWS,
      sewaLogs: SEED_SEWA_LOGS,
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch {}
    return initial;
  }

  private static async saveStore(data: MarketplaceStoreData): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ── 2. Kalkulasi Biaya Perpanjangan Sewa (Member vs Sponsor) ──
  // Aturan Federasi:
  // - Biaya Dasar: Rp 5.000 / bulan
  // - Sponsor: TIDAK DIBERI DISKON (0% Diskon, Bayar Penuh Tarif Normal)
  // - Member: Diberikan diskon sesuai tier keanggotaan (Bronze 5%, Silver 10%, Gold 15%, Platinum 20%)
  static calculateRenewalFee(months: number, userTier: string = 'BRONZE', isSponsor: boolean = false) {
    const baseMonthly = 5000;
    const originalFee = baseMonthly * months;

    if (isSponsor) {
      return {
        months,
        tier: 'OFFICIAL SPONSOR',
        discountPercent: 0,
        baseMonthly,
        originalFee,
        discountAmount: 0,
        finalFee: originalFee,
        monthlyRate: baseMonthly,
        isSponsorNoDiscount: true,
      };
    }

    const tier = (userTier || 'BRONZE').toUpperCase();
    let discountPercent = 5;
    if (tier === 'PLATINUM') discountPercent = 20;
    else if (tier === 'GOLD') discountPercent = 15;
    else if (tier === 'SILVER') discountPercent = 10;
    else if (tier === 'BRONZE') discountPercent = 5;

    const discountAmount = Math.round(originalFee * (discountPercent / 100));
    const finalFee = originalFee - discountAmount;
    const monthlyRate = Math.round(finalFee / months);

    return {
      months,
      tier,
      discountPercent,
      baseMonthly,
      originalFee,
      discountAmount,
      finalFee,
      monthlyRate,
      isSponsorNoDiscount: false,
    };
  }

  // ── 2. Kalkulasi Biaya Sewa & Diskon Tier ───────────────────
  // Aturan MBCINA: Biaya Dasar Rp 5.000 / bulan
  // Diskon Tier Member: Bronze 5%, Silver 10%, Gold 15%, Platinum 20%
  // Aturan Sponsor Resmi (MBINA-SPN-2026-XXX): GRATIS sewa lapak 3 bulan pertama!
  static calculateSewaFee(months: number, userTier: string = 'BRONZE', memberId?: string) {
    const isSponsor = !!(memberId && (memberId.includes('SPN') || memberId.includes('spn')));
    const tier = (userTier || 'BRONZE').toUpperCase();
    let discountPercent = 5;
    if (tier === 'PLATINUM') discountPercent = 20;
    else if (tier === 'GOLD') discountPercent = 15;
    else if (tier === 'SILVER') discountPercent = 10;
    else if (tier === 'BRONZE') discountPercent = 5;

    const baseMonthly = 5000;
    const originalFee = baseMonthly * months;

    // Fasilitas Kemitraan Sponsor Resmi:
    if (isSponsor) {
      if (months <= 3) {
        return {
          months,
          tier: 'OFFICIAL SPONSOR',
          discountPercent: 100,
          baseMonthly,
          originalFee,
          discountAmount: originalFee,
          finalFee: 0,
          monthlyRate: 0,
          isSponsorFree: true,
          sponsorFreeMonths: months,
        };
      } else {
        const payableMonths = months - 3;
        const payableOriginal = baseMonthly * payableMonths;
        const discountAmount = Math.round(payableOriginal * (discountPercent / 100));
        const finalFee = payableOriginal - discountAmount;
        const monthlyRate = Math.round(finalFee / months);

        return {
          months,
          tier: 'OFFICIAL SPONSOR',
          discountPercent,
          baseMonthly,
          originalFee,
          discountAmount: originalFee - finalFee,
          finalFee,
          monthlyRate,
          isSponsorFree: true,
          sponsorFreeMonths: 3,
        };
      }
    }

    const discountAmount = Math.round(originalFee * (discountPercent / 100));
    const finalFee = originalFee - discountAmount;
    const monthlyRate = Math.round(finalFee / months);

    return {
      months,
      tier,
      discountPercent,
      baseMonthly,
      originalFee,
      discountAmount,
      finalFee,
      monthlyRate,
      isSponsorFree: false,
      sponsorFreeMonths: 0,
    };
  }

  // ── 3. Operasi Lapak ────────────────────────────────────────
  static async getLapakList(filterCategory?: string, filterStatus?: string, search?: string): Promise<Lapak[]> {
    const store = await this.getStore();
    let list = [...store.lapak];

    if (filterCategory && filterCategory !== 'ALL') {
      list = list.filter((l) => l.category === filterCategory);
    }
    if (filterStatus && filterStatus !== 'ALL') {
      list = list.filter((l) => l.sewa_status === filterStatus);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q) ||
          l.pemilik.toLowerCase().includes(q) ||
          l.member_id.toLowerCase().includes(q)
      );
    }
    return list;
  }

  static async getLapakById(lapakId: string): Promise<Lapak | null> {
    const store = await this.getStore();
    return store.lapak.find((l) => l.id === lapakId) || null;
  }

  static async getLapakByUserId(userId?: string | null, memberId?: string | null): Promise<Lapak | null> {
    const store = await this.getStore();
    return (
      store.lapak.find(
        (l) =>
          (userId && l.user_id === userId) ||
          (memberId && l.member_id === memberId) ||
          (userId && l.created_by === userId)
      ) || null
    );
  }

  // Aturan 1: Wajib Member Ber-KTA
  // Aturan 2: 1 Member = 1 Lapak Resmi
  static async createLapak(params: {
    userId: string;
    memberId: string;
    pemilik: string;
    name: string;
    description: string;
    category: string;
    contactPhone: string;
    contactWhatsapp: string;
    logoUrl?: string;
    bannerUrl?: string;
    months: number;
    userTier?: string;
    paymentProofUrl?: string;
  }): Promise<{ success: boolean; message: string; lapak?: Lapak }> {
    // Validasi KTA
    if (!params.memberId || !params.memberId.startsWith('MBINA-')) {
      return {
        success: false,
        message: '⚠️ Pengajuan sewa lapak hanya diperuntukkan bagi Anggota resmi MB INA yang telah memiliki Nomor KTA aktif!',
      };
    }

    // Hitung biaya sewa & diskon tier / benefit sponsor resmi
    const feeCalc = this.calculateSewaFee(params.months, params.userTier, params.memberId);
    const isFullyFree = feeCalc.finalFee === 0;

    // Validasi Wajib Bukti Transfer ke Rekening Resmi Bank Mandiri MB INA (Kecuali jika gratis/benefit sponsor)
    if (!isFullyFree && (!params.paymentProofUrl || !params.paymentProofUrl.trim())) {
      return {
        success: false,
        message: '⚠️ Pengajuan sewa lapak wajib melampirkan bukti transfer pembayaran ke rekening resmi Bank Mandiri MB INA (137-00-1234567-8 a.n. MERCEDES-BENZ CLUB INDONESIA). Pengurus/Admin tidak dapat menyetujui tanpa bukti transfer!',
      };
    }

    const store = await this.getStore();

    // Validasi 1 Member = 1 Lapak
    const existing = store.lapak.find(
      (l) => l.user_id === params.userId || l.member_id === params.memberId
    );
    if (existing) {
      return {
        success: false,
        message: `⚠️ Sesuai aturan federasi MB INA, 1 Nomor Anggota (KTA) hanya berhak memiliki 1 Lapak Resmi (${existing.name} — ${existing.id}). Anda dapat menambahkan banyak produk dagangan pada lapak Anda yang sudah aktif!`,
      };
    }

    // Generate kode lapak: LPK-SPN-YYYY-XXX untuk sponsor, atau LPK-MEM-YYYY-XXX untuk member
    const isSponsor = params.memberId.includes('SPN') || params.memberId.includes('spn');
    const year = new Date().getFullYear();
    const prefix = isSponsor ? `LPK-SPN-${year}-` : `LPK-MEM-${year}-`;
    const matchedLapaks = store.lapak.filter((l) => l.id.startsWith(prefix));
    let nextNum = 1;
    matchedLapaks.forEach((l) => {
      const match = l.id.match(/LPK-(?:MEM|SPN)-\d+-(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= nextNum) nextNum = val + 1;
      }
    });
    const lapakId = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const end = new Date(now);
    end.setMonth(end.getMonth() + params.months);
    const endDate = end.toISOString().split('T')[0];

    const newLapak: Lapak = {
      id: lapakId,
      user_id: params.userId,
      member_id: params.memberId,
      pemilik: params.pemilik,
      name: params.name,
      description: params.description,
      category: isSponsor ? 'Sponsor & Dealer Resmi' : params.category,
      contact_phone: params.contactPhone || params.contactWhatsapp,
      contact_whatsapp: params.contactWhatsapp,
      logo_url: params.logoUrl || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=300',
      banner_url: params.bannerUrl || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200',
      sewa_start_date: startDate,
      sewa_end_date: endDate,
      sewa_status: isFullyFree ? 'ACTIVE' : 'PENDING',
      original_fee: feeCalc.originalFee,
      tier_discount: feeCalc.discountPercent,
      sewa_fee: feeCalc.finalFee,
      final_fee: feeCalc.finalFee,
      sewa_paid_status: isFullyFree ? 'PAID' : 'UNPAID',
      is_active: isFullyFree,
      is_verified: isFullyFree,
      created_by: params.userId,
      payment_proof_url: isFullyFree ? 'SPONSORSHIP_PACKAGE_BENEFIT' : params.paymentProofUrl?.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newLog: LapakSewaLog = {
      id: `log_${Date.now()}`,
      lapak_id: lapakId,
      lapak_name: params.name,
      action: 'SEWA',
      period_start: startDate,
      period_end: endDate,
      fee: feeCalc.finalFee,
      payment_status: isFullyFree ? 'PAID' : 'UNPAID',
      notes: isFullyFree
        ? `Sewa lapak mitra sponsor resmi ${params.months} bulan (GRATIS 3 Bulan Paket Benefit Sponsor)`
        : `Sewa lapak baru ${params.months} bulan (Diskon ${feeCalc.tier} ${feeCalc.discountPercent}% - Menunggu Verifikasi Bukti Transfer)`,
      created_by: params.userId,
      created_at: new Date().toISOString(),
    };

    store.lapak.unshift(newLapak);
    store.sewaLogs.unshift(newLog);
    await this.saveStore(store);

    return {
      success: true,
      message: isFullyFree
        ? `Lapak mitra sponsor resmi '${newLapak.name}' (${newLapak.id}) berhasil diaktifkan dengan benefit GRATIS 3 bulan!`
        : 'Pengajuan sewa lapak & bukti transfer berhasil dikirim! Menunggu verifikasi Admin MB INA.',
      lapak: newLapak,
    };
  }

  // Verifikasi Lapak oleh Admin (Approve / Reject)
  static async verifyLapak(
    lapakId: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ): Promise<{ success: boolean; message: string; earnedPoints?: number }> {
    const store = await this.getStore();
    const lapak = store.lapak.find((l) => l.id === lapakId);
    if (!lapak) return { success: false, message: 'Lapak tidak ditemukan!' };

    // Aturan Federasi: Tanpa bukti transfer, Admin/Pengurus tidak dapat menyetujui
    // Pengecualian: Mitra sponsor resmi dengan fasilitas sewa gratis (SPONSORSHIP_PACKAGE_BENEFIT atau final_fee === 0)
    const isSponsorFree =
      lapak.final_fee === 0 ||
      lapak.payment_proof_url === 'SPONSORSHIP_PACKAGE_BENEFIT' ||
      lapak.member_id.includes('SPN');

    if (status === 'APPROVED' && !isSponsorFree && (!lapak.payment_proof_url || !lapak.payment_proof_url.trim())) {
      return {
        success: false,
        message: '⚠️ Pengurus/Admin TIDAK DAPAT menyetujui permohonan sewa lapak ini karena penyewa belum melampirkan bukti transfer pembayaran!',
      };
    }

    lapak.sewa_status = status === 'APPROVED' ? 'ACTIVE' : 'REJECTED';
    lapak.is_active = status === 'APPROVED';
    lapak.is_verified = status === 'APPROVED';
    lapak.sewa_paid_status = status === 'APPROVED' ? 'PAID' : 'UNPAID';
    if (reason) lapak.rejection_reason = reason;
    lapak.updated_at = new Date().toISOString();

    // Update sewa logs
    const log = store.sewaLogs.find((sl) => sl.lapak_id === lapakId && sl.payment_status === 'UNPAID');
    if (log && status === 'APPROVED') {
      log.payment_status = 'PAID';
    }

    // Poin Loyalitas untuk Pemilik Lapak saat Disetujui:
    // Pemilik lapak mendapatkan poin sebanyak biaya sewa (contoh: Rp 48.000 = 48 point)
    let earnedPoints = 0;
    if (status === 'APPROVED') {
      const fee = lapak.final_fee || lapak.sewa_fee || 0;
      earnedPoints = Math.round(fee / 1000);
      if (earnedPoints > 0 && lapak.user_id) {
        try {
          await TierService.addPoints(
            lapak.user_id,
            earnedPoints,
            `Sewa Lapak Resmi Disetujui: ${lapak.name} (Biaya Rp ${fee.toLocaleString('id-ID')})`
          );
        } catch (err) {
          console.warn('Gagal memberikan poin sewa lapak:', err);
        }
      }
    }

    await this.saveStore(store);

    const message = status === 'APPROVED'
      ? `Lapak ${lapak.name} berhasil disetujui & aktif! (+${earnedPoints} Poin Loyalitas dihadiahkan ke pemilik lapak)`
      : `Lapak ${lapak.name} berhasil ditolak dengan catatan: ${reason || '-'}.`;

    return {
      success: true,
      message,
      earnedPoints,
    };
  }

  // ── Ajukan Perpanjangan Sewa Lapak (Member / Sponsor) ────────
  // Aturan Federasi:
  // - Wajib melampirkan bukti transfer pembayaran
  // - Sponsor tidak diberi diskon (0% Diskon, Bayar Penuh)
  // - Member mendapatkan diskon sesuai tier keanggotaan
  // - Masa aktif TIDAK bertambah sampai Admin menyetujui
  static async requestRenewLapak(params: {
    lapakId: string;
    months: number;
    paymentProofUrl: string;
    notes?: string;
    userTier?: string;
  }): Promise<{ success: boolean; message: string; lapak?: Lapak }> {
    if (!params.paymentProofUrl || !params.paymentProofUrl.trim()) {
      return {
        success: false,
        message: '⚠️ Bukti transfer pembayaran WAJIB dilampirkan sebelum pengajuan perpanjangan diproses!',
      };
    }

    const store = await this.getStore();
    const lapak = store.lapak.find((l) => l.id === params.lapakId);
    if (!lapak) return { success: false, message: 'Lapak tidak ditemukan!' };

    const isSponsor = lapak.member_id.includes('SPN') || lapak.member_id.includes('spn');
    const feeCalc = this.calculateRenewalFee(params.months, params.userTier || 'GOLD', isSponsor);

    lapak.pending_renewal = {
      months: params.months,
      original_fee: feeCalc.originalFee,
      tier_discount: feeCalc.discountPercent,
      final_fee: feeCalc.finalFee,
      payment_proof_url: params.paymentProofUrl.trim(),
      notes: params.notes?.trim() || '',
      requested_at: new Date().toISOString(),
    };
    lapak.updated_at = new Date().toISOString();

    const newLog: LapakSewaLog = {
      id: `log_${Date.now()}`,
      lapak_id: lapak.id,
      lapak_name: lapak.name,
      action: 'PERPANJANG',
      period_start: lapak.sewa_end_date,
      period_end: lapak.sewa_end_date,
      fee: feeCalc.finalFee,
      payment_status: 'UNPAID',
      notes: `Pengajuan perpanjangan ${params.months} bulan (Rp ${feeCalc.finalFee.toLocaleString('id-ID')} - Diskon ${feeCalc.discountPercent}%${isSponsor ? ' [Sponsor Tanpa Diskon]' : ''}) - Menunggu Verifikasi Bukti Transfer`,
      created_by: lapak.user_id,
      created_at: new Date().toISOString(),
    };
    store.sewaLogs.unshift(newLog);

    await this.saveStore(store);

    return {
      success: true,
      message: `Pengajuan perpanjangan sewa ${params.months} bulan sebesar Rp ${feeCalc.finalFee.toLocaleString('id-ID')} berhasil diajukan! Menunggu verifikasi bukti transfer oleh Admin MB INA.`,
      lapak,
    };
  }

  // ── Setujui Perpanjangan Sewa Lapak oleh Admin ───────────────
  static async approveRenewLapak(
    lapakId: string
  ): Promise<{ success: boolean; message: string; earnedPoints?: number; lapak?: Lapak }> {
    const store = await this.getStore();
    const lapak = store.lapak.find((l) => l.id === lapakId);
    if (!lapak) return { success: false, message: 'Lapak tidak ditemukan!' };

    if (!lapak.pending_renewal) {
      return { success: false, message: 'Tidak ada pengajuan perpanjangan tertunda untuk lapak ini!' };
    }

    const { months, final_fee, payment_proof_url } = lapak.pending_renewal;

    // Pastikan bukti transfer ada
    if (!payment_proof_url || !payment_proof_url.trim()) {
      return {
        success: false,
        message: '⚠️ Pengurus/Admin TIDAK DAPAT menyetujui perpanjangan sewa lapak karena belum ada bukti transfer pembayaran!',
      };
    }

    const currentEnd = new Date(lapak.sewa_end_date);
    const now = new Date();
    const baseDate = currentEnd > now ? currentEnd : now;
    baseDate.setMonth(baseDate.getMonth() + months);
    const newEnd = baseDate.toISOString().split('T')[0];

    lapak.sewa_end_date = newEnd;
    lapak.sewa_status = 'ACTIVE';
    lapak.is_active = true;
    lapak.is_verified = true;
    lapak.sewa_paid_status = 'PAID';
    lapak.payment_proof_url = payment_proof_url;
    lapak.sewa_fee = final_fee;
    lapak.final_fee = final_fee;
    lapak.pending_renewal = undefined;
    lapak.updated_at = new Date().toISOString();

    // Update log sewa
    const log = store.sewaLogs.find((sl) => sl.lapak_id === lapakId && sl.action === 'PERPANJANG' && sl.payment_status === 'UNPAID');
    if (log) {
      log.payment_status = 'PAID';
      log.period_end = newEnd;
      log.notes += ' - DISETUJUI ADMIN';
    }

    // Loyalitas Poin untuk Member (Sponsor dikecualikan dari poin member biasa)
    let earnedPoints = 0;
    const isSponsor = lapak.member_id.includes('SPN') || lapak.member_id.includes('spn');
    if (!isSponsor && final_fee > 0 && lapak.user_id) {
      earnedPoints = Math.round(final_fee / 1000);
      try {
        await TierService.addPoints(
          lapak.user_id,
          earnedPoints,
          `Perpanjangan Sewa Lapak Disetujui: ${lapak.name} (+${months} Bulan)`
        );
      } catch {}
    }

    await this.saveStore(store);

    return {
      success: true,
      message: `Perpanjangan sewa lapak '${lapak.name}' (+${months} Bulan) BERHASIL DISETUJUI hingga ${newEnd}!`,
      earnedPoints,
      lapak,
    };
  }

  // ── Tolak Perpanjangan Sewa Lapak oleh Admin ─────────────────
  static async rejectRenewLapak(
    lapakId: string,
    reason: string
  ): Promise<{ success: boolean; message: string; lapak?: Lapak }> {
    const store = await this.getStore();
    const lapak = store.lapak.find((l) => l.id === lapakId);
    if (!lapak) return { success: false, message: 'Lapak tidak ditemukan!' };

    if (!lapak.pending_renewal) {
      return { success: false, message: 'Tidak ada pengajuan perpanjangan tertunda untuk lapak ini!' };
    }

    lapak.rejection_reason = reason;
    lapak.pending_renewal = undefined;
    lapak.updated_at = new Date().toISOString();

    const log = store.sewaLogs.find((sl) => sl.lapak_id === lapakId && sl.action === 'PERPANJANG' && sl.payment_status === 'UNPAID');
    if (log) {
      log.notes += ` - DITOLAK ADMIN: ${reason}`;
    }

    await this.saveStore(store);

    return {
      success: true,
      message: `Pengajuan perpanjangan sewa lapak '${lapak.name}' telah ditolak dengan catatan: ${reason}`,
      lapak,
    };
  }

  // Wrapper untuk backward compatibility
  static async renewLapakSewa(lapakId: string, months: number, userTier: string = 'BRONZE', paymentProofUrl?: string): Promise<{ success: boolean; message: string }> {
    if (!paymentProofUrl) {
      // Jika dipanggil langsung oleh admin tanpa alur pending, setujui langsung dengan catatan admin
      paymentProofUrl = 'ADMIN_MANUAL_EXTENSION_VERIFIED';
    }
    await this.requestRenewLapak({ lapakId, months, paymentProofUrl, userTier });
    const res = await this.approveRenewLapak(lapakId);
    return { success: res.success, message: res.message };
  }

  static async deleteLapak(lapakId: string): Promise<{ success: boolean; message: string }> {
    const store = await this.getStore();
    store.lapak = store.lapak.filter((l) => l.id !== lapakId);
    store.products = store.products.filter((p) => p.lapak_id !== lapakId);
    await this.saveStore(store);
    return { success: true, message: 'Lapak dan semua produk di dalamnya berhasil dihapus.' };
  }

  // ── 4. Operasi Produk & Iklan ────────────────────────────────
  static async getProducts(filters?: {
    lapakId?: string;
    category?: string;
    condition?: string;
    status?: ProductStatus;
    search?: string;
    onlyPublished?: boolean;
    userId?: string;
  }): Promise<LapakProduct[]> {
    const store = await this.getStore();
    let list = [...store.products];

    // Hubungkan lapak_name jika belum terisi
    list = list.map((p) => {
      if (!p.lapak_name) {
        const l = store.lapak.find((x) => x.id === p.lapak_id);
        return { ...p, lapak_name: l?.name || 'Lapak MB INA' };
      }
      return p;
    });

    if (filters?.lapakId && filters.lapakId !== 'ALL') {
      list = list.filter((p) => p.lapak_id === filters.lapakId);
    }
    if (filters?.category && filters.category !== 'ALL') {
      list = list.filter((p) => p.category === filters.category);
    }
    if (filters?.condition && filters.condition !== 'ALL') {
      list = list.filter((p) => p.condition === filters.condition);
    }
    if (filters?.status && (filters.status as any) !== 'ALL') {
      list = list.filter((p) => p.status === filters.status);
    }
    if (filters?.onlyPublished) {
      list = list.filter((p) => p.is_published && p.status === 'APPROVED');
    }
    if (filters?.userId) {
      list = list.filter((p) => p.user_id === filters.userId);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.lapak_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  static async getProductById(productId: string): Promise<LapakProduct | null> {
    const store = await this.getStore();
    const p = store.products.find((x) => x.id === productId);
    if (!p) return null;
    const l = store.lapak.find((x) => x.id === p.lapak_id);
    return { ...p, lapak_name: l?.name || 'Lapak MB INA' };
  }

  // Tambah Iklan Produk Baru
  static async createProduct(params: {
    lapakId: string;
    name: string;
    description: string;
    price: number;
    condition: ProductCondition;
    location: string;
    category: string;
    contactWhatsapp: string;
    images: string[];
    userId: string;
    sellerName: string;
    memberId: string;
    isAdmin?: boolean;
  }): Promise<{ success: boolean; message: string; product?: LapakProduct }> {
    const store = await this.getStore();
    const lapak = store.lapak.find((l) => l.id === params.lapakId);
    const lapakName = lapak?.name || 'Lapak MB INA';

    const prodId = `prod_${Date.now()}`;
    const initialStatus: ProductStatus = params.isAdmin ? 'APPROVED' : 'PENDING';
    const initialPublished = params.isAdmin ? true : false;

    const newProduct: LapakProduct = {
      id: prodId,
      lapak_id: params.lapakId,
      lapak_name: lapakName,
      name: params.name,
      description: params.description,
      price: params.price,
      condition: params.condition,
      location: params.location,
      images: params.images.length > 0 ? params.images : ['https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600'],
      views: 0,
      status: initialStatus,
      is_published: initialPublished,
      category: params.category,
      contact_whatsapp: params.contactWhatsapp,
      user_id: params.userId,
      seller_name: params.sellerName,
      member_id: params.memberId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.products.unshift(newProduct);
    await this.saveStore(store);

    const msg = params.isAdmin
      ? 'Iklan produk & foto berhasil disimpan dan DITERBITKAN ke Katalog Marketplace!'
      : 'Iklan produk berhasil diajukan dan MENUNGGU VERIFIKASI / MODERASI Admin MB INA!';

    return { success: true, message: msg, product: newProduct };
  }

  // Moderasi Produk Iklan oleh Admin
  static async verifyProduct(
    productId: string,
    status: ProductStatus,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const store = await this.getStore();
    const prod = store.products.find((p) => p.id === productId);
    if (!prod) return { success: false, message: 'Produk tidak ditemukan!' };

    prod.status = status;
    prod.is_published = status === 'APPROVED';
    if (reason) prod.rejection_reason = reason;
    prod.updated_at = new Date().toISOString();

    await this.saveStore(store);
    return {
      success: true,
      message: `Iklan produk "${prod.name}" berhasil di-${status === 'APPROVED' ? 'setujui dan tayang di Katalog' : 'moderasi'}!`,
    };
  }

  static async deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
    const store = await this.getStore();
    store.products = store.products.filter((p) => p.id !== productId);
    await this.saveStore(store);
    return { success: true, message: 'Iklan produk berhasil dihapus.' };
  }

  // ── 5. Operasi Ulasan & Penilaian ────────────────────────────
  static async getReviews(lapakId?: string): Promise<LapakReview[]> {
    const store = await this.getStore();
    let list = [...store.reviews];
    if (lapakId) {
      list = list.filter((r) => r.lapak_id === lapakId);
    }
    return list;
  }

  static async createReview(params: {
    lapakId: string;
    userId: string;
    userName: string;
    memberId: string;
    rating: number;
    content: string;
  }): Promise<{ success: boolean; message: string }> {
    const store = await this.getStore();
    const lapak = store.lapak.find((l) => l.id === params.lapakId);

    const newRev: LapakReview = {
      id: `rev_${Date.now()}`,
      lapak_id: params.lapakId,
      lapak_name: lapak?.name || 'Lapak MB INA',
      user_id: params.userId,
      user_name: params.userName,
      member_id: params.memberId,
      rating: params.rating,
      content: params.content,
      created_at: new Date().toISOString(),
    };

    store.reviews.unshift(newRev);
    await this.saveStore(store);

    // Update status interaksi menjadi reviewed
    await this.markInteractionReviewed(params.lapakId);

    // Hitung poin loyalitas berdasarkan aturan federasi:
    // +10 poin bila memberi ulasan pada toko sponsor resmi setelah transaksi
    // +5 poin bila memberi ulasan pada toko anggota setelah transaksi
    const isSponsor =
      params.lapakId.startsWith('LPK-SPN-') ||
      (lapak?.category && lapak.category.toLowerCase().includes('sponsor')) ||
      (lapak?.name && lapak.name.toLowerCase().includes('official'));

    const points = isSponsor ? 10 : 5;
    const storeTypeLabel = isSponsor ? 'Toko Sponsor Resmi' : 'Toko Anggota';

    if (params.userId) {
      try {
        await TierService.addPoints(
          params.userId,
          points,
          `Ulasan & Penilaian pada ${storeTypeLabel} (${lapak?.name || 'Lapak MB INA'})`
        );
      } catch (err) {
        console.warn('Gagal menambah poin tier ulasan:', err);
      }
    }

    return {
      success: true,
      message: `Review & Rating bintang berhasil dikirim! (+${points} Poin Loyalitas ${storeTypeLabel})`,
    };
  }

  // ── 6. Interaksi & Transaksi Terverifikasi (Ulasan) ───────────
  static async getInteractions(): Promise<LapakInteraction[]> {
    try {
      const raw = await AsyncStorage.getItem(INTERACTIONS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}

    const defaults: LapakInteraction[] = [
      {
        lapak_id: 'LPK-MEM-2026-001',
        lapak_name: 'Andi Parts Store',
        contact_person: 'Andi Pratama',
        product_name: 'Velg AMG 18" Monoblock Original',
        interaction_date: '05/09/2026',
        interaction_type: 'TRANSAKSI_SELESAI',
        reviewed: false,
      },
      {
        lapak_id: 'LPK-MEM-2026-004',
        lapak_name: 'Garasi FayFay',
        contact_person: 'Ayesha Fairuz Fajr',
        product_name: 'Paket Overhaul Radiator & Coolant',
        interaction_date: '02/09/2026',
        interaction_type: 'CHAT_SELLER',
        reviewed: true,
      },
    ];
    try {
      await AsyncStorage.setItem(INTERACTIONS_KEY, JSON.stringify(defaults));
    } catch {}
    return defaults;
  }

  static async recordInteraction(lapakId: string, lapakName: string, contactPerson: string, productName: string): Promise<void> {
    const list = await this.getInteractions();
    const existing = list.find((x) => x.lapak_id === lapakId);
    const dateStr = new Date().toLocaleDateString('id-ID');

    if (existing) {
      existing.interaction_date = dateStr;
      if (productName) existing.product_name = productName;
    } else {
      list.unshift({
        lapak_id: lapakId,
        lapak_name: lapakName,
        contact_person: contactPerson,
        product_name: productName,
        interaction_date: dateStr,
        interaction_type: 'CHAT_SELLER',
        reviewed: false,
      });
    }
    await AsyncStorage.setItem(INTERACTIONS_KEY, JSON.stringify(list));
  }

  private static async markInteractionReviewed(lapakId: string): Promise<void> {
    const list = await this.getInteractions();
    const item = list.find((x) => x.lapak_id === lapakId);
    if (item) {
      item.reviewed = true;
      await AsyncStorage.setItem(INTERACTIONS_KEY, JSON.stringify(list));
    }
  }

  // ── 7. Laporan Sewa & Keuangan ───────────────────────────────
  static async getSewaReports() {
    const store = await this.getStore();
    const totalLapak = store.lapak.length;
    const activeLapak = store.lapak.filter((l) => l.sewa_status === 'ACTIVE').length;
    const pendingLapak = store.lapak.filter((l) => l.sewa_status === 'PENDING').length;
    const expiredLapak = store.lapak.filter((l) => l.sewa_status === 'EXPIRED').length;

    const totalIncome = store.sewaLogs
      .filter((sl) => sl.payment_status === 'PAID')
      .reduce((acc, sl) => acc + (sl.fee || 0), 0);

    return {
      totalLapak,
      activeLapak,
      pendingLapak,
      expiredLapak,
      totalIncome,
      logs: store.sewaLogs,
    };
  }
}
