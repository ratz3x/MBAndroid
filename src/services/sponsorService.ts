// ============================================================
// sponsorService — Layanan Manajemen Sponsor & Kemitraan MB INA
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { MarketplaceService } from './marketplaceService';

export interface SponsorNotification {
  type: 'APPROVED' | 'REJECTED';
  title: string;
  message: string;
  date: string;
  reason?: string;
}

export interface SponsorPendingRenewal {
  months: number;
  fee: number;
  payment_proof_url: string;
  notes?: string;
  requested_at: string;
}

export interface SponsorItem {
  id: string;
  name: string;
  category: string;
  sponsor_id: string;               // Format: MBINA-SPN-2026-XXX
  pic_name?: string;
  pic_phone?: string;
  description: string;
  discount_info?: string;
  logo_url?: string;
  website_url?: string;
  contract_start: string;          // YYYY-MM-DD
  contract_end: string;            // YYYY-MM-DD
  duration_months: number;         // e.g. 3 bulan
  lapak_id?: string;               // LPK-SPN-2026-XXX
  has_forum_access: boolean;       // Hak aktif di forum
  forum_access_expires_at: string; // ISO string
  is_active: boolean;
  pending_renewal?: SponsorPendingRenewal;
  last_notification?: SponsorNotification;
  created_at: string;
  updated_at: string;
}

const SPONSOR_STORAGE_KEY = '@mbclub_sponsors_v1_real';

// Tidak ada seed lokal — Supabase adalah sumber data utama
export const SEED_SPONSORS: SponsorItem[] = [];

export class SponsorService {
  private static async getStore(): Promise<SponsorItem[]> {
    try {
      const raw = await AsyncStorage.getItem(SPONSOR_STORAGE_KEY);
      if (raw !== null) {
        // Key ada di storage — parse apa adanya (bisa [] setelah reset)
        const items: SponsorItem[] = JSON.parse(raw);
        // Reset/normalize PT Pro Motor jika sebelumnya ter-klik perpanjang tanpa sengaja
        const promotor = items.find((s) => s.id === 'spn_001' || s.sponsor_id === 'MBINA-SPN-2026-001');
        if (promotor && promotor.duration_months > 3 && !promotor.pending_renewal) {
          promotor.contract_start = '2026-08-01';
          promotor.contract_end = '2026-11-01';
          promotor.duration_months = 3;
          promotor.has_forum_access = true;
          promotor.forum_access_expires_at = '2026-11-01T23:59:59.000Z';
          promotor.is_active = true;
          await AsyncStorage.setItem(SPONSOR_STORAGE_KEY, JSON.stringify(items));
        }
        return items;
      }
    } catch (e) {
      console.warn('Error reading sponsor store:', e);
    }
    // Key belum pernah ada sama sekali (instalasi pertama) → seed awal
    await AsyncStorage.setItem(SPONSOR_STORAGE_KEY, JSON.stringify(SEED_SPONSORS));
    return [...SEED_SPONSORS];
  }

  private static async saveStore(items: SponsorItem[]): Promise<void> {
    await AsyncStorage.setItem(SPONSOR_STORAGE_KEY, JSON.stringify(items));
  }

  // ── Ambil Seluruh Daftar Sponsor ─────────────────────────────
  // Supabase = sumber utama. AsyncStorage = cache offline fallback.
  static async getSponsors(): Promise<SponsorItem[]> {
    // 1. Coba ambil dari Supabase terlebih dahulu
    try {
      const { data, error } = await supabase.from('sponsors').select('*');
      if (!error && data && data.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];

        // Map semua kolom Supabase ke SponsorItem
        const fromSupabase: SponsorItem[] = data.map((sb: any) => ({
          id: sb.id,
          name: sb.name,
          category: sb.category || 'Mitra',
          sponsor_id: sb.sponsor_id || '',
          pic_name: sb.pic_name || '',
          pic_phone: sb.pic_phone || '',
          description: sb.description || '',
          discount_info: sb.discount_info || '',
          logo_url: sb.logo_url || '',
          website_url: sb.website_url || '',
          contract_start: sb.contract_start || todayStr,
          contract_end: sb.contract_end || todayStr,
          duration_months: sb.duration_months || 3,
          lapak_id: sb.lapak_id || '',
          has_forum_access: sb.has_forum_access ?? true,
          forum_access_expires_at: sb.forum_access_expires_at || (sb.contract_end ? sb.contract_end + 'T23:59:59.000Z' : ''),
          is_active: sb.is_active ?? true,
          pending_renewal: typeof sb.pending_renewal === 'string'
            ? JSON.parse(sb.pending_renewal)
            : (sb.pending_renewal || undefined),
          last_notification: typeof sb.last_notification === 'string'
            ? JSON.parse(sb.last_notification)
            : (sb.last_notification || undefined),
          created_at: sb.created_at || new Date().toISOString(),
          updated_at: sb.updated_at || new Date().toISOString(),
        }));

        // Auto-expire forum access jika sudah lewat contract_end
        fromSupabase.forEach((s) => {
          if (s.contract_end < todayStr && s.has_forum_access) {
            s.has_forum_access = false;
          }
        });

        // Simpan ke cache lokal
        await this.saveStore(fromSupabase);
        return fromSupabase;
      }
    } catch {
      // Offline / Supabase tidak tersedia → fallback ke cache lokal
    }

    // 2. Fallback: pakai cache AsyncStorage
    const localSponsors = await this.getStore();
    const todayStr = new Date().toISOString().split('T')[0];
    let hasChanges = false;
    localSponsors.forEach((s) => {
      if (s.contract_end < todayStr && s.has_forum_access) {
        s.has_forum_access = false;
        hasChanges = true;
      }
    });
    if (hasChanges) await this.saveStore(localSponsors);
    return localSponsors;
  }

  // ── Generate Nomor KTA Sponsor Baru (MBINA-SPN-2026-XXX) ────
  static async generateNextMemberNumber(): Promise<string> {
    const list = await this.getStore();
    const year = new Date().getFullYear();
    const prefix = `MBINA-SPN-${year}-`;
    let maxNum = 0;

    list.forEach((s) => {
      const m = s.sponsor_id?.match(/MBINA-SPN-\d+-(\d+)/i);
      if (m) {
        const val = parseInt(m[1], 10);
        if (val > maxNum) maxNum = val;
      }
    });

    const next = maxNum + 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
  }

  // ── Input Sponsor Baru oleh Admin ───────────────────────────
  static async createSponsor(params: {
    name: string;
    category: string;
    picName?: string;
    picPhone?: string;
    description: string;
    discountInfo?: string;
    logoUrl?: string;
    websiteUrl?: string;
    durationMonths?: number; // Default 3 bulan
    autoCreateLapak?: boolean; // Default true
    loginEmail?: string;
    loginPassword?: string;
  }): Promise<{ success: boolean; message: string; sponsor?: SponsorItem }> {
    if (!params.name.trim()) {
      return { success: false, message: 'Nama perusahaan / sponsor wajib diisi.' };
    }

    const duration = params.durationMonths && params.durationMonths > 0 ? params.durationMonths : 3;
    const list = await this.getStore();
    const memberId = await this.generateNextMemberNumber();

    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const end = new Date(now);
    end.setMonth(end.getMonth() + duration);
    const endDate = end.toISOString().split('T')[0];
    const forumExpiresAt = end.toISOString();

    const sponsorId = `spn_${Date.now()}`;
    const year = now.getFullYear();
    const lapakId = `LPK-SPN-${year}-${memberId.split('-').pop() || '001'}`;

    const newSponsor: SponsorItem = {
      id: sponsorId,
      name: params.name.trim(),
      category: params.category || 'Bengkel',
      sponsor_id: memberId,
      pic_name: params.picName?.trim() || '',
      pic_phone: params.picPhone?.trim() || '',
      description: params.description.trim() || `Mitra sponsor resmi Mercedes-Benz Club Indonesia penyedia layanan ${params.category}.`,
      discount_info: params.discountInfo?.trim() || 'Penawaran & diskon spesial untuk pemegang KTA resmi MB Club Indonesia',
      logo_url: params.logoUrl?.trim() || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=300',
      website_url: params.websiteUrl?.trim() || '',
      contract_start: startDate,
      contract_end: endDate,
      duration_months: duration,
      lapak_id: lapakId,
      has_forum_access: true,
      forum_access_expires_at: forumExpiresAt,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    list.unshift(newSponsor);
    await this.saveStore(list);

    // Otomatis daftarkan lapak sponsor jika diizinkan
    if (params.autoCreateLapak !== false) {
      try {
        await MarketplaceService.createLapak({
          userId: `usr_${sponsorId}`,
          memberId,
          pemilik: params.picName || params.name,
          name: params.name,
          description: newSponsor.description,
          category: 'Sponsor & Dealer Resmi',
          contactPhone: params.picPhone || '08123456789',
          contactWhatsapp: params.picPhone || '08123456789',
          months: duration,
          userTier: 'OFFICIAL SPONSOR',
          logoUrl: newSponsor.logo_url,
          paymentProofUrl: 'SPONSORSHIP_PACKAGE_BENEFIT',
        });
      } catch (err) {
        console.warn('Gagal mendaftarkan auto lapak sponsor:', err);
      }
    }

    // Sinkronkan ke Supabase table 'sponsors' jika ada
    try {
      await (supabase.from('sponsors') as any).insert({
        sponsor_id: newSponsor.sponsor_id,
        name: newSponsor.name,
        category: newSponsor.category,
        description: newSponsor.description,
        discount_info: newSponsor.discount_info,
        logo_url: newSponsor.logo_url,
        website_url: newSponsor.website_url,
        pic_name: newSponsor.pic_name,
        pic_phone: newSponsor.pic_phone,
        login_email: params.loginEmail || `sponsor_${newSponsor.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15)}@mbandro.org`,
        login_password: params.loginPassword || 'spn@20252027',
        contract_start: startDate,
        contract_end: endDate,
        duration_months: duration,
        lapak_id: lapakId,
        has_forum_access: true,
        forum_access_expires_at: forumExpiresAt,
        is_active: true,
      });
    } catch (err) {
      console.warn('Gagal insert sponsor ke Supabase:', err);
    }

    return {
      success: true,
      message: `Mitra Sponsor '${newSponsor.name}' berhasil didaftarkan dengan Nomor KTA ${newSponsor.sponsor_id}. Mendapatkan hak sewa lapak & akses forum aktif selama ${duration} bulan!`,
      sponsor: newSponsor,
    };
  }

  // ── Validasi Hak Akses Aktif Forum untuk Sponsor ─────────────
  // Sponsor memiliki hak untuk aktif di forum selama 3 bulan
  static async checkSponsorForumAccess(
    memberNumber?: string | null
  ): Promise<{
    isSponsor: boolean;
    canPost: boolean;
    remainingDays?: number;
    expiresAt?: string;
    reason?: string;
    sponsor?: SponsorItem;
  }> {
    if (!memberNumber) {
      return { isSponsor: false, canPost: true };
    }

    const isSponsorNum = memberNumber.includes('SPN') || memberNumber.includes('spn');
    if (!isSponsorNum) {
      return { isSponsor: false, canPost: true };
    }

    const list = await this.getStore();
    const sponsor = list.find((s) => s.sponsor_id.toLowerCase() === memberNumber.toLowerCase());

    const now = new Date();

    if (sponsor) {
      const expireDate = new Date(sponsor.forum_access_expires_at || sponsor.contract_end);
      const remainingMs = expireDate.getTime() - now.getTime();
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

      if (remainingMs > 0 && sponsor.is_active && sponsor.has_forum_access) {
        return {
          isSponsor: true,
          canPost: true,
          remainingDays,
          expiresAt: expireDate.toISOString().split('T')[0],
          sponsor,
        };
      } else {
        return {
          isSponsor: true,
          canPost: false,
          remainingDays: 0,
          expiresAt: expireDate.toISOString().split('T')[0],
          reason: `Masa aktif fasilitas forum untuk Mitra Sponsor (${sponsor.sponsor_id}) telah berakhir pada ${expireDate.toISOString().split('T')[0]}. Silakan hubungi Admin / Pengurus MB INA untuk perpanjangan kerjasama sponsorship.`,
          sponsor,
        };
      }
    }

    return {
      isSponsor: true,
      canPost: true,
      remainingDays: 90,
      expiresAt: '2026-04-01',
    };
  }

  // ── Ajukan Perpanjangan Kerjasama Sponsor ───────────────────
  static async requestRenewSponsor(params: {
    sponsorId: string;
    months: number;
    paymentProofUrl: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!params.paymentProofUrl || !params.paymentProofUrl.trim()) {
      return {
        success: false,
        message: '⚠️ Bukti transfer pembayaran WAJIB dilampirkan sebelum pengajuan perpanjangan sponsor diproses!',
      };
    }

    const list = await this.getStore();
    const sponsor = list.find((s) => s.id === params.sponsorId || s.sponsor_id === params.sponsorId);
    if (!sponsor) return { success: false, message: 'Sponsor tidak ditemukan.' };

    const duration = params.months && params.months > 0 ? params.months : 3;
    const baseMonthly = 5000;
    const totalFee = baseMonthly * duration; // SPONSOR: 0% DISKON (BAYAR PENUH)

    const pendingObj = {
      months: duration,
      fee: totalFee,
      payment_proof_url: params.paymentProofUrl.trim(),
      notes: params.notes?.trim() || '',
      requested_at: new Date().toISOString(),
    };

    sponsor.pending_renewal = pendingObj;
    sponsor.updated_at = new Date().toISOString();

    await this.saveStore(list);

    // Sync ke Supabase table 'sponsors'
    try {
      if (sponsor.sponsor_id) {
        await (supabase.from('sponsors') as any)
          .update({
            pending_renewal: pendingObj,
            updated_at: sponsor.updated_at,
          })
          .eq('sponsor_id', sponsor.sponsor_id);
      } else {
        await (supabase.from('sponsors') as any)
          .update({
            pending_renewal: pendingObj,
            updated_at: sponsor.updated_at,
          })
          .eq('id', sponsor.id);
      }
    } catch (err) {
      console.warn('Gagal sync pengajuan perpanjangan ke Supabase:', err);
    }

    // Sinkronkan pengajuan perpanjangan lapak di marketplace
    if (sponsor.lapak_id) {
      try {
        await MarketplaceService.requestRenewLapak({
          lapakId: sponsor.lapak_id,
          months: duration,
          paymentProofUrl: params.paymentProofUrl.trim(),
          notes: params.notes,
          userTier: 'OFFICIAL SPONSOR',
        });
      } catch (err) {
        console.warn('Gagal sinkron pengajuan lapak sponsor:', err);
      }
    }

    return {
      success: true,
      message: `Pengajuan perpanjangan kerjasama sponsor '${sponsor.name}' (+${duration} Bulan) sebesar Rp ${totalFee.toLocaleString('id-ID')} (Tarif Penuh - Tanpa Diskon) berhasil dikirim! Menunggu verifikasi bukti transfer oleh Admin MB INA.`,
    };
  }

  // ── Setujui Perpanjangan Sponsor oleh Admin ──────────────────
  static async approveRenewSponsor(sponsorId: string): Promise<{ success: boolean; message: string }> {
    const list = await this.getSponsors();
    const sponsor = list.find((s) => s.id === sponsorId || s.sponsor_id === sponsorId);
    if (!sponsor) return { success: false, message: 'Sponsor tidak ditemukan.' };

    if (!sponsor.pending_renewal) {
      return { success: false, message: 'Tidak ada pengajuan perpanjangan tertunda untuk sponsor ini.' };
    }

    const { months, payment_proof_url } = sponsor.pending_renewal;

    if (!payment_proof_url || !payment_proof_url.trim()) {
      return {
        success: false,
        message: '⚠️ Pengurus/Admin TIDAK DAPAT menyetujui perpanjangan karena belum ada bukti transfer pembayaran!',
      };
    }

    const now = new Date();
    const currentEnd = new Date(sponsor.contract_end);
    const baseDate = currentEnd > now ? currentEnd : now;
    baseDate.setMonth(baseDate.getMonth() + months);
    const newEnd = baseDate.toISOString().split('T')[0];

    const notifObj = {
      type: 'APPROVED' as const,
      title: 'Perpanjangan Kerjasama Disetujui 🎉',
      message: `Pengajuan perpanjangan (+${months} Bulan) senilai Rp ${sponsor.pending_renewal.fee.toLocaleString('id-ID')} telah DISETUJUI oleh Admin MB INA. Masa sewa lapak dan hak forum aktif hingga ${newEnd}.`,
      date: new Date().toISOString(),
    };

    sponsor.contract_end = newEnd;
    sponsor.duration_months = (sponsor.duration_months || 3) + months;
    sponsor.has_forum_access = true;
    sponsor.forum_access_expires_at = baseDate.toISOString();
    sponsor.is_active = true;
    sponsor.pending_renewal = undefined;
    sponsor.last_notification = notifObj;
    sponsor.updated_at = new Date().toISOString();

    await this.saveStore(list);

    // Sync ke Supabase table 'sponsors'
    try {
      const updateData = {
        contract_end: newEnd,
        duration_months: sponsor.duration_months,
        has_forum_access: true,
        forum_access_expires_at: baseDate.toISOString(),
        is_active: true,
        pending_renewal: null,
        updated_at: sponsor.updated_at,
      };
      if (sponsor.sponsor_id) {
        await (supabase.from('sponsors') as any).update(updateData).eq('sponsor_id', sponsor.sponsor_id);
      } else {
        await (supabase.from('sponsors') as any).update(updateData).eq('id', sponsor.id);
      }
    } catch (err) {
      console.warn('Gagal sync persetujuan perpanjangan ke Supabase:', err);
    }

    // Sinkronkan persetujuan lapak di marketplace jika ada
    if (sponsor.lapak_id) {
      try {
        await MarketplaceService.approveRenewLapak(sponsor.lapak_id);
      } catch {}
    }

    return {
      success: true,
      message: `Perpanjangan kerjasama sponsor '${sponsor.name}' (+${months} Bulan) BERHASIL DISETUJUI hingga ${newEnd}! Hak sewa lapak dan hak akses forum aktif kembali.`,
    };
  }

  // ── Tolak Perpanjangan Sponsor oleh Admin ────────────────────
  static async rejectRenewSponsor(sponsorId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const list = await this.getSponsors();
    const sponsor = list.find((s) => s.id === sponsorId || s.sponsor_id === sponsorId);
    if (!sponsor) return { success: false, message: 'Sponsor tidak ditemukan.' };

    const notifObj = {
      type: 'REJECTED' as const,
      title: 'Pengajuan Perpanjangan Ditolak ❌',
      message: reason?.trim() || 'Bukti transfer pembayaran tidak valid atau nominal tidak sesuai. Silakan ajukan ulang dengan melampirkan bukti yang benar.',
      reason: reason?.trim() || 'Bukti transfer pembayaran tidak valid.',
      date: new Date().toISOString(),
    };

    sponsor.pending_renewal = undefined;
    sponsor.last_notification = notifObj;
    sponsor.updated_at = new Date().toISOString();
    await this.saveStore(list);

    // Sync ke Supabase table 'sponsors'
    try {
      const updateData = {
        pending_renewal: null,
        updated_at: sponsor.updated_at,
      };
      if (sponsor.sponsor_id) {
        await (supabase.from('sponsors') as any).update(updateData).eq('sponsor_id', sponsor.sponsor_id);
      } else {
        await (supabase.from('sponsors') as any).update(updateData).eq('id', sponsor.id);
      }
    } catch (err) {
      console.warn('Gagal sync penolakan perpanjangan ke Supabase:', err);
    }

    if (sponsor.lapak_id) {
      try {
        await MarketplaceService.rejectRenewLapak(sponsor.lapak_id, reason);
      } catch {}
    }

    return {
      success: true,
      message: `Pengajuan perpanjangan sponsor '${sponsor.name}' telah ditolak dengan catatan: ${reason}`,
    };
  }

  // ── Hapus / Dismiss Notifikasi Sponsor ─────────────────────
  static async dismissNotification(sponsorId: string): Promise<void> {
    const list = await this.getStore();
    const sponsor = list.find((s) => s.id === sponsorId || s.sponsor_id === sponsorId);
    if (sponsor) {
      sponsor.last_notification = undefined;
      sponsor.updated_at = new Date().toISOString();
      await this.saveStore(list);
      try {
        if (sponsor.sponsor_id) {
          await (supabase.from('sponsors') as any).update({ last_notification: null }).eq('sponsor_id', sponsor.sponsor_id);
        } else {
          await (supabase.from('sponsors') as any).update({ last_notification: null }).eq('id', sponsor.id);
        }
      } catch {}
    }
  }

  // ── Perpanjang Masa Kerjasama Sponsor (Admin Wrapper) ────────
  static async renewSponsor(
    sponsorId: string,
    months: number = 3,
    paymentProofUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!paymentProofUrl) {
      paymentProofUrl = 'ADMIN_MANUAL_VERIFIED_SPONSOR_PAYMENT';
    }
    await this.requestRenewSponsor({ sponsorId, months, paymentProofUrl });
    return this.approveRenewSponsor(sponsorId);
  }

  // ── Hapus Sponsor ───────────────────────────────────────────
  static async deleteSponsor(sponsorId: string): Promise<{ success: boolean; message: string }> {
    const list = await this.getStore();
    const sponsor = list.find((s) => s.id === sponsorId || s.sponsor_id === sponsorId);
    const filtered = list.filter((s) => s.id !== sponsorId && s.sponsor_id !== sponsorId);
    await this.saveStore(filtered);

    try {
      if (sponsor) {
        await (supabase.from('sponsors') as any)
          .delete()
          .or(`id.eq.${sponsor.id},sponsor_id.eq.${sponsor.sponsor_id || sponsor.id}`);
      }
    } catch (err) {
      console.warn('Gagal delete sponsor dari Supabase:', err);
    }

    return { success: true, message: 'Mitra sponsor berhasil dihapus.' };
  }

  // ── Hapus SELURUH data sponsor (Admin: Reset untuk pengujian) ─
  static async clearAllSponsors(): Promise<{ success: boolean; message: string }> {
    try {
      await AsyncStorage.setItem(SPONSOR_STORAGE_KEY, JSON.stringify([]));
      await AsyncStorage.removeItem('@mbclub_sponsor_accounts');
      try {
        await (supabase.from('sponsors') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (err) {
        console.warn('Gagal clear sponsors dari Supabase:', err);
      }
      return {
        success: true,
        message: 'Seluruh data sponsor telah dihapus. Tidak ada sponsor terdaftar.',
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Gagal menghapus data sponsor.' };
    }
  }
}

