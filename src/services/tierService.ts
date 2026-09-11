// ============================================================
// tierService — Sistem Tier & Loyalitas Anggota Mercedes-Benz
// Berbasis Kehadiran Event, Aktivitas Komunitas & Transaksi Real
// MBCI Official Tier Schema (Bronze, Silver, Gold, Platinum)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type MemberTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TierInfo {
  tier: MemberTier;
  title: string;
  minPoints: number;
  maxPoints: number;
  badgeColor: string;
  sewaDiscount: number;
  privileges: string[];
}

export interface PointLog {
  id: string;
  points: number;
  reason: string;
  date: string;
}

export interface MemberTierData {
  userId: string;
  points: number;
  tier: MemberTier;
  history: PointLog[];
}

// ── Definisi Skema Tier Resmi MBCI ────────────────────────────
export const TIER_CONFIG: Record<MemberTier, TierInfo> = {
  BRONZE: {
    tier: 'BRONZE',
    title: 'Star Explorer',
    minPoints: 0,
    maxPoints: 600,
    badgeColor: '#CD7F32',
    sewaDiscount: 5,
    privileges: [
      'Akses KTA Digital resmi',
      'Gratis hadir di seluruh event komunitas',
      'Diskon sewa lapak toko 5%',
      'Akses forum diskusi & marketplace',
    ],
  },
  SILVER: {
    tier: 'SILVER',
    title: 'Star Voyager',
    minPoints: 601,
    maxPoints: 1400,
    badgeColor: '#E4E4E7',
    sewaDiscount: 10,
    privileges: [
      'Seluruh benefit tier Bronze',
      'Diskon sewa lapak toko 10%',
      'Badge Silver di Profil & Forum',
      'Prioritas slot display mobil di gathering chapter',
    ],
  },
  GOLD: {
    tier: 'GOLD',
    title: 'Star Ambassador',
    minPoints: 1401,
    maxPoints: 3200,
    badgeColor: '#FBBF24',
    sewaDiscount: 15,
    privileges: [
      'Seluruh benefit tier Silver',
      'Diskon sewa lapak toko 15%',
      'Slot parkir VIP (Paddock) di event gathering resmi',
      'Posisi barisan depan pada konvoi touring',
      'Ekstra kupon undian doorprize gathering tahunan',
    ],
  },
  PLATINUM: {
    tier: 'PLATINUM',
    title: 'Star Legend / VIP Pillar',
    minPoints: 3201,
    maxPoints: 999999,
    badgeColor: '#38BDF8',
    sewaDiscount: 20,
    privileges: [
      'Seluruh benefit tier Gold',
      'Diskon sewa lapak toko 20%',
      'Meja kehormatan (VIP Lounge) di Gala Dinner / Munas',
      'Plakat apresiasi pilar komunitas dari Pengurus Pusat',
      'Merchandise eksklusif edisi terbatas Jamnas MBCI',
    ],
  },
};

const STORAGE_PREFIX = '@mbclub_tier_data_v5_real_';
const MARKETPLACE_STORAGE_KEY = '@mbclub_marketplace_v6_spn_real';

export class TierService {
  // ── 1. Menentukan Tier dari Akumulasi Poin ────────────────────
  static getTierFromPoints(points: number): MemberTier {
    if (points >= 3201) return 'PLATINUM';
    if (points >= 1401) return 'GOLD';
    if (points >= 601) return 'SILVER';
    return 'BRONZE';
  }

  // ── 2. Mengambil Detail & Progres Menuju Tier Berikutnya ─────
  static getTierProgress(points: number) {
    const currentTier = this.getTierFromPoints(points);
    const config = TIER_CONFIG[currentTier];

    let nextTier: MemberTier | null = null;
    let pointsNeeded = 0;
    let progressPercent = 100;

    if (currentTier === 'BRONZE') {
      nextTier = 'SILVER';
      const range = 601 - 0;
      const current = Math.max(0, points);
      progressPercent = Math.min(100, Math.round((current / range) * 100));
      pointsNeeded = Math.max(0, 601 - points);
    } else if (currentTier === 'SILVER') {
      nextTier = 'GOLD';
      const range = 1401 - 601;
      const current = points - 601;
      progressPercent = Math.min(100, Math.round((current / range) * 100));
      pointsNeeded = Math.max(0, 1401 - points);
    } else if (currentTier === 'GOLD') {
      nextTier = 'PLATINUM';
      const range = 3201 - 1401;
      const current = points - 1401;
      progressPercent = Math.min(100, Math.round((current / range) * 100));
      pointsNeeded = Math.max(0, 3201 - points);
    } else {
      nextTier = null;
      pointsNeeded = 0;
      progressPercent = 100;
    }

    return {
      currentTier,
      config,
      nextTier,
      pointsNeeded,
      progressPercent,
    };
  }

  // ── 3. Mengambil Data Poin Member (Persisten & Real) ─────────
  static async getMemberTierData(userId: string): Promise<MemberTierData> {
    if (!userId) {
      return {
        userId: 'guest',
        points: 0,
        tier: 'BRONZE',
        history: [],
      };
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + userId);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.tier = this.getTierFromPoints(parsed.points);
        return parsed;
      }
    } catch (e) {
      console.warn('[TierService] Error reading stored tier data:', e);
    }

    // Jika belum ada di storage v5_real, lakukan hitung ulang otomatis dari database real
    return await this.recalculateRealPoints(userId);
  }

  // ── 4. Hitung Ulang Total Poin Sesuai Data Real ───────────────
  static async recalculateRealPoints(userId: string): Promise<MemberTierData> {
    if (!userId) {
      return { userId: 'guest', points: 0, tier: 'BRONZE', history: [] };
    }

    const history: PointLog[] = [];

    // A. Hitung Thread Forum Real (+1 poin per thread)
    try {
      const { data: threads } = await (supabase.from('forum_threads') as any)
        .select('id, title, created_at')
        .eq('author_id', userId);

      if (Array.isArray(threads)) {
        for (const t of threads) {
          history.push({
            id: `th_${t.id}`,
            points: 1,
            reason: `Membuat Thread: "${(t.title || 'Diskusi Komunitas').slice(0, 45)}"`,
            date: t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID'),
          });
        }
      }
    } catch (err) {
      console.warn('[TierService] Error recalculating forum threads:', err);
    }

    // B. Hitung Balasan Forum Real (+1 poin per komentar)
    try {
      const { data: replies } = await (supabase.from('forum_replies') as any)
        .select('id, thread_id, content, created_at')
        .eq('author_id', userId);

      if (Array.isArray(replies)) {
        for (const r of replies) {
          const snippet = (r.content || '').slice(0, 35);
          history.push({
            id: `rep_${r.id}`,
            points: 1,
            reason: `Membalas Thread Forum${snippet ? `: "${snippet}..."` : ''}`,
            date: r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID'),
          });
        }
      }
    } catch (err) {
      console.warn('[TierService] Error recalculating forum replies:', err);
    }

    // C. Hitung Sewa Lapak Toko Real yang Disetujui (+1 poin per Rp 1.000 sewa)
    // D. Hitung Ulasan Toko Real (+10 poin sponsor, +5 poin toko member)
    try {
      const rawMarketplace = await AsyncStorage.getItem(MARKETPLACE_STORAGE_KEY);
      if (rawMarketplace) {
        const parsed = JSON.parse(rawMarketplace);

        // Sewa Lapak
        if (Array.isArray(parsed.lapak)) {
          for (const lapak of parsed.lapak) {
            if (
              (lapak.user_id === userId || lapak.created_by === userId) &&
              lapak.sewa_status === 'ACTIVE' &&
              lapak.is_verified === true
            ) {
              const fee = lapak.final_fee || lapak.sewa_fee || 0;
              const pointsFromRent = Math.round(fee / 1000);
              if (pointsFromRent > 0) {
                history.push({
                  id: `lapak_${lapak.id}`,
                  points: pointsFromRent,
                  reason: `Sewa Lapak Disetujui: "${lapak.name}" (Rp ${fee.toLocaleString('id-ID')})`,
                  date: lapak.created_at ? new Date(lapak.created_at).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID'),
                });
              }
            }
          }
        }

        // Real Reviews
        if (Array.isArray(parsed.reviews)) {
          for (const rev of parsed.reviews) {
            if (rev.user_id === userId) {
              const isSponsor = rev.lapak_id && (rev.lapak_id.includes('SPN') || rev.lapak_id.includes('spn'));
              const revPoints = isSponsor ? 10 : 5;
              history.push({
                id: `rev_${rev.id}`,
                points: revPoints,
                reason: isSponsor
                  ? `Ulasan Toko Sponsor Resmi: "${rev.lapak_name || 'Mitra'}"`
                  : `Ulasan Toko Anggota: "${rev.lapak_name || 'Lapak Member'}"`,
                date: rev.created_at ? new Date(rev.created_at).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID'),
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[TierService] Error recalculating marketplace points:', err);
    }

    // E. Kehadiran Event Resmi (+100 poin per kehadiran)
    try {
      const { data: rsvps } = await (supabase.from('event_rsvps') as any)
        .select('id, event_id, status, registered_at, events(title)')
        .eq('member_id', userId)
        .eq('status', 'confirmed');

      if (Array.isArray(rsvps)) {
        for (const r of rsvps) {
          const eventTitle = r.events?.title || 'Event Resmi MBCI';
          history.push({
            id: `ev_${r.id}`,
            points: 100,
            reason: `Kehadiran Event Resmi: "${eventTitle}"`,
            date: r.registered_at ? new Date(r.registered_at).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID'),
          });
        }
      }
    } catch (err) {
      console.warn('[TierService] Error recalculating event RSVPs:', err);
    }

    // Hitung total poin
    const totalPoints = history.reduce((sum, item) => sum + item.points, 0);
    const tier = this.getTierFromPoints(totalPoints);

    const result: MemberTierData = {
      userId,
      points: totalPoints,
      tier,
      history,
    };

    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(result));
    } catch (err) {
      console.warn('[TierService] Failed to cache recalculated tier data:', err);
    }

    return result;
  }

  // ── 5. Menambah Poin Member & Auto-Upgrade Tier Secara Dinamis ──
  static async addPoints(
    userId: string,
    amount: number,
    reason: string
  ): Promise<{ newPoints: number; newTier: MemberTier; isUpgraded: boolean }> {
    if (!userId || amount <= 0) {
      return { newPoints: 0, newTier: 'BRONZE', isUpgraded: false };
    }

    const data = await this.getMemberTierData(userId);
    const oldTier = data.tier;

    data.points += amount;
    data.tier = this.getTierFromPoints(data.points);
    data.history.unshift({
      id: `pt_${Date.now()}`,
      points: amount,
      reason,
      date: new Date().toLocaleDateString('id-ID'),
    });

    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(data));
    } catch (e) {
      console.warn('[TierService] Failed to update points:', e);
    }

    const isUpgraded = data.tier !== oldTier;

    return {
      newPoints: data.points,
      newTier: data.tier,
      isUpgraded,
    };
  }

  // ── 6. Presensi Kehadiran Event (+ Bonus Tamu/Keluarga) ───────
  static async recordEventAttendance(
    userId: string,
    eventName: string,
    companionCount: number = 0
  ): Promise<{ earnedPoints: number; newTotal: number; newTier: MemberTier }> {
    const basePoints = 100;
    const companionBonus = Math.max(0, companionCount) * 25;
    const totalEarned = basePoints + companionBonus;

    const reason =
      companionCount > 0
        ? `Kehadiran Event "${eventName}" (+${companionCount} Tamu/Keluarga)`
        : `Kehadiran Event "${eventName}"`;

    const result = await this.addPoints(userId, totalEarned, reason);

    return {
      earnedPoints: totalEarned,
      newTotal: result.newPoints,
      newTier: result.newTier,
    };
  }

  // ── 7. Reset & Sinkronisasi Ulang Semua Member Real ───────────
  static async resetAndRecalculateAll(): Promise<Record<string, MemberTierData>> {
    const results: Record<string, MemberTierData> = {};
    const realUserIds = [
      '6c5ee3db-97be-445e-ab99-d03175ad7bc6', // Derist Touriano (Admin)
      '2089ee31-71e8-43d7-bb76-d218c10f932d', // Ayesha Fairuz Fajr (Member)
    ];

    for (const uid of realUserIds) {
      results[uid] = await this.recalculateRealPoints(uid);
    }

    return results;
  }
}
