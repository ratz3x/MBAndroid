// ============================================================
// Native Ads & Sponsorship Service — Mercedes-Benz Club Indonesia
// Integrasi Iklan Menyatu (Native) berestetika MBUX Modern Luxury
// ============================================================

import type { GalleryAlbum } from './galleryService';

export interface NativeAdItem {
  id: string;
  is_ad: true;
  sponsor_name: string;       // Nama mitra/brand resmi
  badge_label: string;        // Contoh: "SPONSOR RESMI", "MITRA RESMI"
  title: string;              // Judul promosi
  tagline: string;            // Slogan penawaran
  description: string;        // Detail ringkas
  image_url: string;          // Foto proporsional 16:9
  cta_text: string;           // Teks tombol, misal: "Lihat Promo ↗"
  cta_url: string;            // Link eksternal tujuan
  category: string;           // Kategori mitra
  discount_tag?: string;      // Label diskon khusus member KTA
}

export type GalleryFeedItem = GalleryAlbum | NativeAdItem;

export function isNativeAd(item: GalleryFeedItem): item is NativeAdItem {
  return 'is_ad' in item && item.is_ad === true;
}

// Koleksi Iklan Sponsor Resmi (Mitra Otomotif & Luxury Terpercaya)
export const CURATED_NATIVE_ADS: NativeAdItem[] = [
  {
    id: 'ad-mb-collection-01',
    is_ad: true,
    sponsor_name: 'Mercedes-Benz Collection',
    badge_label: 'MITRA RESMI',
    title: 'Koleksi Aksesoris & Apparel Eksklusif 2026',
    tagline: 'Merchandise Resmi Bintang Tiga',
    description: 'Dapatkan diskon khusus bagi pemegang KTA resmi Mercedes-Benz Club Indonesia di seluruh Authorized Dealer.',
    image_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=1200&auto=format&fit=crop',
    cta_text: 'Lihat Katalog ↗',
    cta_url: 'https://www.mercedes-benz.co.id',
    category: 'Merchandise & Apparel',
    discount_tag: 'Diskon 15% Member',
  },
  {
    id: 'ad-petronas-02',
    is_ad: true,
    sponsor_name: 'Petronas Syntium',
    badge_label: 'SPONSOR RESMI',
    title: 'Petronas Syntium with CoolTech™',
    tagline: 'Perlindungan Suhu Ekstrem Mesin Bintang',
    description: 'Pelumas teknologi juara dunia Formula 1 untuk performa mesin Mercedes-Benz yang lebih dingin dan bertenaga di setiap rute touring.',
    image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1200&auto=format&fit=crop',
    cta_text: 'Voucher Servis ↗',
    cta_url: 'https://www.pli-petronas.com',
    category: 'Pelumas Performa',
    discount_tag: 'Gratis Filter Oli',
  },
  {
    id: 'ad-pirelli-03',
    is_ad: true,
    sponsor_name: 'Pirelli Indonesia',
    badge_label: 'SPONSOR RESMI',
    title: 'Pirelli P Zero & Scorpion OE Mercedes',
    tagline: 'Presisi Cengkeraman Maksimal',
    description: 'Ban bersertifikasi tanda MO (Mercedes Original) dengan garansi Tyrelife™ perlindungan kerusakan 1 tahun penuh.',
    image_url: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?q=80&w=1200&auto=format&fit=crop',
    cta_text: 'Pilih Ukuran ↗',
    cta_url: 'https://www.pirelli.com',
    category: 'Ban Performa Tinggi',
    discount_tag: 'Garansi 1 Tahun',
  },
  {
    id: 'ad-bca-prioritas-04',
    is_ad: true,
    sponsor_name: 'BCA Prioritas',
    badge_label: 'MITRA FINANSIAL',
    title: 'Privilege Pembiayaan Unit Mercedes-Benz',
    tagline: 'Kemudahan Finansial Eksklusif',
    description: 'Bunga spesial dan approval prioritas untuk pembiayaan Mercedes-Benz Dream Cars bagi seluruh member MB Club INA.',
    image_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=1200&auto=format&fit=crop',
    cta_text: 'Info Prioritas ↗',
    cta_url: 'https://prioritas.bca.co.id',
    category: 'Layanan Finansial',
    discount_tag: 'Bunga Khusus',
  },
];

/**
 * Menyisipkan Native Ads secara teratur ke dalam daftar album
 * @param albums Daftar album kegiatan
 * @param frequency Frekuensi penempatan ad (default: setiap 5 album)
 * @returns Array gabungan album dan native ad
 */
export function mergeAlbumsWithNativeAds(
  albums: GalleryAlbum[],
  frequency: number = 5
): GalleryFeedItem[] {
  if (!albums || albums.length === 0) return [];
  if (CURATED_NATIVE_ADS.length === 0) return albums;

  const result: GalleryFeedItem[] = [];
  let adIndex = 0;

  for (let i = 0; i < albums.length; i++) {
    result.push(albums[i]);

    // Selipkan 1 iklan setiap N album (jika bukan item terakhir)
    if ((i + 1) % frequency === 0 && i !== albums.length - 1) {
      const selectedAd = CURATED_NATIVE_ADS[adIndex % CURATED_NATIVE_ADS.length];
      result.push(selectedAd);
      adIndex++;
    }
  }

  return result;
}

// Koleksi Iklan Khusus Halaman Forum (Fokus: Bengkel, Pelumas, & Restorasi)
export const CURATED_FORUM_ADS: NativeAdItem[] = [
  {
    id: 'ad-forum-petronas-01',
    is_ad: true,
    sponsor_name: 'Petronas Syntium Indonesia',
    badge_label: 'MITRA TEKNIS RESMI',
    title: 'Konsultasi Perawatan Mesin & Rekomendasi Pelumas Original',
    tagline: 'Solusi Suhu Dingin CoolTech™ Mesin Seri Classic & Modern',
    description: 'Dapatkan pemeriksaan gratis 24 titik mesin dan voucher penggantian oli khusus anggota aktif Mercedes-Benz Club Indonesia di seluruh bengkel rekanan.',
    image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1200&auto=format&fit=crop',
    cta_text: 'Klaim Voucher ↗',
    cta_url: 'https://www.pli-petronas.com',
    category: 'Konsultasi Mesin',
    discount_tag: 'Gratis 24-Point Check',
  },
  {
    id: 'ad-forum-bengkel-02',
    is_ad: true,
    sponsor_name: 'Authorized Mercedes-Benz Workshop',
    badge_label: 'BENGKEL REKANAN',
    title: 'Diskon 20% Suku Cadang Original & Jasa Restorasi',
    tagline: 'Teknisi Tersertifikasi Mercedes-Benz Star Diagnosis',
    description: 'Spesialis servis berkala, perbaikan transmisi, hingga restorasi total Mercedes-Benz Classic (W123, W124, W126, W140) dengan garansi resmi suku cadang.',
    image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1200&auto=format&fit=crop',
    cta_text: 'Booking Servis ↗',
    cta_url: 'https://www.mercedes-benz.co.id',
    category: 'Restorasi & Servis',
    discount_tag: 'Diskon 20% Sparepart',
  },
];

export function getForumNativeAd(index: number = 0): NativeAdItem {
  return CURATED_FORUM_ADS[index % CURATED_FORUM_ADS.length];
}

