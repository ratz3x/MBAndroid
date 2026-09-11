// ============================================================
// Gallery Service — Dokumentasi Kegiatan & Media
// Mercedes-Benz Club Indonesia
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { GalleryItem } from '../types/database.types';

export interface GalleryMediaItem {
  id: string;
  album_id: string;
  media_url: string;
  thumbnail_url?: string;
  media_type: 'image' | 'video';
  video_url?: string;
  uploaded_by: string;
  created_at: string;
}

export interface GalleryAlbum {
  id: string;
  title: string;                  // Metadata: Judul Kegiatan
  category: string;               // Metadata: Kategori
  cover_url: string;              // Foto Sampul Utama (16:9)
  location: string;               // Metadata: Kota / Lokasi
  year: string;                   // Metadata: Tahun
  chapter: string;                // Metadata: Chapter / Klub Penyelenggara
  description: string | null;     // Metadata: Deskripsi lengkap kegiatan
  created_at: string;
  created_by: string;
  is_featured?: boolean;
  items: GalleryMediaItem[];      // Seluruh media foto & video di dalam album
}

export interface EnrichedGalleryItem extends GalleryItem {
  category: string;
  location?: string;
  year?: string;
  chapter?: string;
  video_url?: string;
  is_featured?: boolean;
}

export const GALLERY_CATEGORIES = [
  { id: 'all', label: 'Semua', icon: 'grid-outline' },
  { id: 'touring', label: 'Touring & Rally', icon: 'car-sport-outline' },
  { id: 'jamnas', label: 'Jambore Nasional', icon: 'flag-outline' },
  { id: 'classic', label: 'Classic Concours', icon: 'ribbon-outline' },
  { id: 'track', label: 'Track Day & AMG', icon: 'speedometer-outline' },
  { id: 'social', label: 'Bakti Sosial', icon: 'heart-outline' },
  { id: 'video', label: 'Video Sinematik', icon: 'videocam-outline' },
] as const;

export type GalleryCategoryType = (typeof GALLERY_CATEGORIES)[number]['id'];

export const CURATED_GALLERY: EnrichedGalleryItem[] = [
  {
    id: 'gal-01',
    event_id: null,
    title: 'Jambore Nasional XXI · Banyuwangi',
    description:
      'Pertemuan akbar tahunan lebih dari 500 kendaraan Mercedes-Benz dari 110 klub dan chapter se-Indonesia di Pantai Marina Boom Banyuwangi.',
    media_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2024-10-18T10:00:00Z',
    category: 'Jambore Nasional',
    location: 'Banyuwangi, Jawa Timur',
    year: '2024',
    chapter: 'Pengurus Pusat MB INA',
    is_featured: true,
  },
  {
    id: 'gal-02',
    event_id: null,
    title: 'G-Class Adventure Overland Bromo',
    description:
      'Eksplorasi ketangguhan armada Mercedes-Benz G-Class menaklukkan lautan pasir berbisik dan savana Gunung Bromo bersama Mercedes-Benz Jip Indonesia (MJI).',
    media_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2024-09-12T14:30:00Z',
    category: 'Touring & Rally',
    location: 'Taman Nasional Bromo',
    year: '2024',
    chapter: 'Mercedes-Benz Jip Indonesia (MJI)',
  },
  {
    id: 'gal-03',
    event_id: null,
    title: 'Concours d’Elegance Mercedes-Benz Klasik',
    description:
      'Parade dan kontes restorasi orisinalitas mahakarya Mercedes-Benz legendaris era 1950–1970an oleh Mercedes-Benz Classic Club Indonesia (MCCI).',
    media_url: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2024-08-25T09:15:00Z',
    category: 'Classic Concours',
    location: 'The Dharmawangsa, Jakarta',
    year: '2024',
    chapter: 'Mercedes-Benz Classic Club Indonesia',
  },
  {
    id: 'gal-04',
    event_id: null,
    title: 'Mercedes-AMG Track Experience Sentul',
    description:
      'Sesi uji performa kecepatan tinggi, aerodinamika, dan handling presisi lini Mercedes-AMG di sirkuit aspal Sentul International Circuit.',
    media_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&q=85',
    media_type: 'video',
    thumbnail_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2025-01-20T11:00:00Z',
    category: 'Track Day & AMG',
    location: 'Sentul International Circuit',
    year: '2025',
    chapter: 'Mercedes-Benz Club Indonesia',
    video_url: 'https://www.youtube.com/watch?v=kQDkWf_f5xI',
  },
  {
    id: 'gal-05',
    event_id: null,
    title: 'Trans Java Grand Tour: Jakarta - Solo - Bali',
    description:
      'Touring jarak jauh melintasi tol Trans Jawa dengan konvoi teratur, etape persinggahan kuliner nusantara, hingga penyeberangan Selat Bali.',
    media_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2024-11-05T07:45:00Z',
    category: 'Touring & Rally',
    location: 'Lintas Tol Trans Jawa',
    year: '2024',
    chapter: 'Pengurus Pusat MB INA',
  },
  {
    id: 'gal-06',
    event_id: null,
    title: 'Gathering Nasional Boxer Club (W124)',
    description:
      'Kopdar akbar perayaan 20 tahun Boxer Club Indonesia (W124 MBCI) mengumpulkan lebih dari 150 unit Masterpiece dan Sportline dari seluruh Indonesia.',
    media_url: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2024-07-14T13:20:00Z',
    category: 'Classic Concours',
    location: 'Candi Prambanan, Yogyakarta',
    year: '2024',
    chapter: 'Mercedes-Benz Boxer Club Indonesia',
  },
  {
    id: 'gal-07',
    event_id: null,
    title: 'Bakti Sosial & Peduli Bencana Semeru',
    description:
      'Penyaluran donasi logistik, sembako, dan air bersih untuk warga terdampak bencana alam oleh tim Satgas Peduli MB Club INA.',
    media_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2024-12-02T10:30:00Z',
    category: 'Bakti Sosial',
    location: 'Lumajang, Jawa Timur',
    year: '2024',
    chapter: 'Satgas Peduli MB Club INA',
  },
  {
    id: 'gal-08',
    event_id: null,
    title: 'Cinematic Aftermovie Jamnas XXI (4K)',
    description:
      'Video kompilasi sinematik 4K merangkum momen spektakuler, drone aerial view konvoi pantai, dan malam keakraban Jambore Nasional XXI.',
    media_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=1200&q=85',
    media_type: 'video',
    thumbnail_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2024-10-25T16:00:00Z',
    category: 'Video Sinematik',
    location: 'Banyuwangi, Jawa Timur',
    year: '2024',
    chapter: 'Media & Publikasi MB INA',
    video_url: 'https://www.youtube.com/watch?v=kQDkWf_f5xI',
  },
  {
    id: 'gal-09',
    event_id: null,
    title: 'MTC Sunset Drive Pantai Indah Kapuk',
    description:
      'Cruising santai sore hari menikmati golden hour bersama puluhan unit klasik Mercedes-Benz Tiger Club Indonesia (W123).',
    media_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2025-02-08T17:40:00Z',
    category: 'Touring & Rally',
    location: 'PIK 2, Jakarta Utara',
    year: '2025',
    chapter: 'Mercedes-Benz Tiger Club (MTC)',
  },
  {
    id: 'gal-10',
    event_id: null,
    title: 'Delegasi MB Club INA di Museum Stuttgart',
    description:
      'Kunjungan resmi perwakilan pengurus pusat MB Club INA dalam rangka International President Club Meeting di Mercedes-Benz Museum, Stuttgart, Jerman.',
    media_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2024-06-19T11:20:00Z',
    category: 'Jambore Nasional',
    location: 'Stuttgart, Jerman',
    year: '2024',
    chapter: 'Pengurus Pusat MB INA',
  },
  {
    id: 'gal-11',
    event_id: null,
    title: 'Showcase Mercedes-AMG GT Black Series',
    description:
      'Pameran hypercar langka Mercedes-AMG GT Black Series dengan mesin V8 Bi-turbo flat-plane crank dalam gelaran Mercedes-Benz Star Expo.',
    media_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2025-01-15T15:00:00Z',
    category: 'Track Day & AMG',
    location: 'Senayan Park, Jakarta',
    year: '2025',
    chapter: 'Mercedes-Benz Club Indonesia',
  },
  {
    id: 'gal-12',
    event_id: null,
    title: 'W113 Pagoda Roadster Concours Restoration',
    description:
      'Karya seni restorasi tingkat dunia Mercedes-Benz 280SL Pagoda dengan sertifikasi orisinalitas komponen dari Mercedes-Benz Classic Center.',
    media_url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=85',
    media_type: 'image',
    thumbnail_url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&q=80',
    uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    created_at: '2024-05-11T14:10:00Z',
    category: 'Classic Concours',
    location: 'Bandung, Jawa Barat',
    year: '2024',
    chapter: 'Mercedes-Benz Classic Club Indonesia',
  },
];

export const CURATED_ALBUMS: GalleryAlbum[] = [
  {
    id: 'alb-01',
    title: 'Jambore Nasional XXI · Banyuwangi',
    category: 'Jambore Nasional',
    cover_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=85',
    location: 'Banyuwangi, Jawa Timur',
    year: '2024',
    chapter: 'Pengurus Pusat MB INA',
    description:
      'Pertemuan akbar tahunan lebih dari 500 kendaraan Mercedes-Benz dari 110 klub dan chapter se-Indonesia di Pantai Marina Boom Banyuwangi.',
    created_at: '2024-10-18T10:00:00Z',
    created_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    is_featured: true,
    items: [
      {
        id: 'med-01-01',
        album_id: 'alb-01',
        media_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-10-18T10:00:00Z',
      },
      {
        id: 'med-01-02',
        album_id: 'alb-01',
        media_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=600&q=80',
        media_type: 'video',
        video_url: 'https://www.youtube.com/watch?v=kQDkWf_f5xI',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-10-18T12:00:00Z',
      },
      {
        id: 'med-01-03',
        album_id: 'alb-01',
        media_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-10-18T14:30:00Z',
      },
      {
        id: 'med-01-04',
        album_id: 'alb-01',
        media_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-10-18T16:00:00Z',
      },
    ],
  },
  {
    id: 'alb-02',
    title: 'G-Class Adventure Overland Bromo',
    category: 'Touring & Rally',
    cover_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&q=85',
    location: 'Taman Nasional Bromo',
    year: '2024',
    chapter: 'Mercedes-Benz Jip Indonesia (MJI)',
    description:
      'Eksplorasi ketangguhan armada Mercedes-Benz G-Class menaklukkan lautan pasir berbisik dan savana Gunung Bromo bersama Mercedes-Benz Jip Indonesia (MJI).',
    created_at: '2024-09-12T14:30:00Z',
    created_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    items: [
      {
        id: 'med-02-01',
        album_id: 'alb-02',
        media_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-09-12T14:30:00Z',
      },
      {
        id: 'med-02-02',
        album_id: 'alb-02',
        media_url: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-09-12T16:00:00Z',
      },
    ],
  },
  {
    id: 'alb-03',
    title: 'Mercedes-AMG Track Experience Sentul',
    category: 'Track Day & AMG',
    cover_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&q=85',
    location: 'Sentul International Circuit',
    year: '2025',
    chapter: 'Mercedes-Benz Club Indonesia',
    description:
      'Sesi uji performa kecepatan tinggi, aerodinamika, dan handling presisi lini Mercedes-AMG di sirkuit aspal Sentul International Circuit.',
    created_at: '2025-01-20T11:00:00Z',
    created_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    items: [
      {
        id: 'med-03-01',
        album_id: 'alb-03',
        media_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&q=80',
        media_type: 'video',
        video_url: 'https://www.youtube.com/watch?v=kQDkWf_f5xI',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2025-01-20T11:00:00Z',
      },
      {
        id: 'med-03-02',
        album_id: 'alb-03',
        media_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2025-01-20T13:30:00Z',
      },
    ],
  },
  {
    id: 'alb-04',
    title: 'Concours d’Elegance Mercedes-Benz Klasik',
    category: 'Classic Concours',
    cover_url: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1200&q=85',
    location: 'The Dharmawangsa, Jakarta',
    year: '2024',
    chapter: 'Mercedes-Benz Classic Club Indonesia',
    description:
      'Parade dan kontes restorasi orisinalitas mahakarya Mercedes-Benz legendaris era 1950–1970an oleh Mercedes-Benz Classic Club Indonesia (MCCI).',
    created_at: '2024-08-25T09:15:00Z',
    created_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    items: [
      {
        id: 'med-04-01',
        album_id: 'alb-04',
        media_url: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-08-25T09:15:00Z',
      },
      {
        id: 'med-04-02',
        album_id: 'alb-04',
        media_url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-08-25T11:00:00Z',
      },
    ],
  },
  {
    id: 'alb-05',
    title: 'Trans Java Grand Tour: Jakarta - Solo - Bali',
    category: 'Touring & Rally',
    cover_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&q=85',
    location: 'Lintas Tol Trans Jawa',
    year: '2024',
    chapter: 'Pengurus Pusat MB INA',
    description:
      'Touring jarak jauh melintasi tol Trans Jawa dengan konvoi teratur, etape persinggahan kuliner nusantara, hingga penyeberangan Selat Bali.',
    created_at: '2024-11-05T07:45:00Z',
    created_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    items: [
      {
        id: 'med-05-01',
        album_id: 'alb-05',
        media_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-11-05T07:45:00Z',
      },
      {
        id: 'med-05-02',
        album_id: 'alb-05',
        media_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-11-05T10:00:00Z',
      },
    ],
  },
  {
    id: 'alb-06',
    title: 'Gathering Nasional Boxer Club (W124)',
    category: 'Classic Concours',
    cover_url: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=1200&q=85',
    location: 'Candi Prambanan, Yogyakarta',
    year: '2024',
    chapter: 'Mercedes-Benz Boxer Club Indonesia',
    description:
      'Kopdar akbar perayaan 20 tahun Boxer Club Indonesia (W124 MBCI) mengumpulkan lebih dari 150 unit Masterpiece dan Sportline dari seluruh Indonesia.',
    created_at: '2024-07-14T13:20:00Z',
    created_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    items: [
      {
        id: 'med-06-01',
        album_id: 'alb-06',
        media_url: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-07-14T13:20:00Z',
      },
    ],
  },
  {
    id: 'alb-07',
    title: 'Bakti Sosial & Peduli Bencana Semeru',
    category: 'Bakti Sosial',
    cover_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=1200&q=85',
    location: 'Lumajang, Jawa Timur',
    year: '2024',
    chapter: 'Satgas Peduli MB Club INA',
    description:
      'Penyaluran donasi logistik, sembako, dan air bersih untuk warga terdampak bencana alam oleh tim Satgas Peduli MB Club INA.',
    created_at: '2024-12-02T10:30:00Z',
    created_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
    items: [
      {
        id: 'med-07-01',
        album_id: 'alb-07',
        media_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=1200&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&q=80',
        media_type: 'image',
        uploaded_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
        created_at: '2024-12-02T10:30:00Z',
      },
    ],
  },
];

const STORAGE_KEY_GALLERY = '@mbclub_gallery_cache';
const STORAGE_KEY_ALBUMS = '@mbclub_gallery_albums_cache_v2';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const galleryService = {
  /**
   * Mengunggah file gambar lokal ke Supabase Storage (bucket gallery)
   */
  async uploadImageAsync(uri: string): Promise<string> {
    if (!uri) return '';
    // Jika sudah berupa URL online publik (bukan lokal/blob/file), langsung gunakan
    if (
      (uri.startsWith('http://') || uri.startsWith('https://')) &&
      !uri.startsWith('http://localhost') &&
      !uri.startsWith('blob:')
    ) {
      return uri;
    }

    try {
      const filename = `gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('gallery')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage.from('gallery').getPublicUrl(filename);
        if (publicData?.publicUrl) {
          console.log('[Gallery Storage] Upload success! Public URL:', publicData.publicUrl);
          return publicData.publicUrl;
        }
      } else if (error) {
        console.warn('[Gallery Storage] Upload error:', error.message);
      }
    } catch (e: any) {
      console.warn('[Gallery Storage] Storage upload exception:', e?.message || e);
    }
    return uri;
  },

  /**
   * Mengambil album dari penyimpanan lokal
   */
  async getLocalAlbums(): Promise<GalleryAlbum[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_ALBUMS);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  /**
   * Menyimpan album ke penyimpanan lokal
   */
  async saveLocalAlbums(albums: GalleryAlbum[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_ALBUMS, JSON.stringify(albums));
    } catch (e) {
      console.warn('Error saving albums to AsyncStorage:', e);
    }
  },

  /**
   * Mengambil semua Album Kegiatan (Local + Cloud + Curated)
   */
  async getAlbums(): Promise<GalleryAlbum[]> {
    const localAlbums = await this.getLocalAlbums();

    // Coba ambil item dari Supabase Cloud table gallery
    let cloudItems: GalleryItem[] = [];
    try {
      const { data, error } = await (supabase.from('gallery') as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        cloudItems = data as GalleryItem[];
      }
    } catch {
      // Offline fallback
    }

    // Bangun daftar album yang menggabungkan: local, cloud, dan curated
    const albumMap = new Map<string, GalleryAlbum>();

    // 1. Masukkan curated albums sebagai baseline
    for (const alb of CURATED_ALBUMS) {
      albumMap.set(alb.id, { ...alb, items: [...alb.items] });
    }

    // 2. Masukkan cloud items jika ada event_id atau title yang cocok
    for (const row of cloudItems) {
      const targetAlbumId = row.event_id || 'alb-01';
      let existingAlbum = albumMap.get(targetAlbumId);
      if (!existingAlbum) {
        // Buat album baru dari item cloud jika belum ada
        existingAlbum = {
          id: targetAlbumId,
          title: row.title,
          category: row.media_type === 'video' ? 'Video Sinematik' : 'Touring & Rally',
          cover_url: row.thumbnail_url || row.media_url,
          location: 'Indonesia',
          year: new Date(row.created_at).getFullYear().toString(),
          chapter: 'Mercedes-Benz Club Indonesia',
          description: row.description,
          created_at: row.created_at,
          created_by: row.uploaded_by,
          items: [],
        };
        albumMap.set(targetAlbumId, existingAlbum);
      }

      // Masukkan media item ke album jika belum ada
      if (!existingAlbum.items.some((i) => i.id === row.id || i.media_url === row.media_url)) {
        existingAlbum.items.push({
          id: row.id,
          album_id: existingAlbum.id,
          media_url: row.media_url,
          thumbnail_url: row.thumbnail_url || row.media_url,
          media_type: row.media_type,
          video_url: row.media_type === 'video' ? row.media_url : undefined,
          uploaded_by: row.uploaded_by,
          created_at: row.created_at,
        });
      }
    }

    // 3. Masukkan local albums (yang baru dibuat admin di perangkat ini)
    for (const localAlb of localAlbums) {
      const existing = albumMap.get(localAlb.id);
      if (existing) {
        // Update data album
        existing.title = localAlb.title || existing.title;
        existing.category = localAlb.category || existing.category;
        existing.cover_url = localAlb.cover_url || existing.cover_url;
        existing.location = localAlb.location || existing.location;
        existing.year = localAlb.year || existing.year;
        existing.chapter = localAlb.chapter || existing.chapter;
        existing.description = localAlb.description || existing.description;

        // Gabungkan items
        for (const item of localAlb.items) {
          if (!existing.items.some((i) => i.id === item.id || i.media_url === item.media_url)) {
            existing.items.unshift(item);
          }
        }
      } else {
        albumMap.set(localAlb.id, localAlb);
      }
    }

    // Urutkan album terbaru paling atas
    const allAlbums = Array.from(albumMap.values());
    allAlbums.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allAlbums;
  },

  /**
   * Membuat Album Kegiatan Baru oleh Admin
   * (Semua metadata kegiatan: Judul, Kategori, Lokasi, Tahun, Chapter, Deskripsi diisi di sini)
   */
  async createAlbum(albumData: {
    title: string;
    category: string;
    cover_url: string;
    location: string;
    year: string;
    chapter: string;
    description?: string;
    created_by: string;
  }): Promise<GalleryAlbum> {
    const id = generateUUID();
    const created_at = new Date().toISOString();

    let finalCoverUrl = albumData.cover_url;
    if (
      finalCoverUrl.startsWith('file:') ||
      finalCoverUrl.startsWith('blob:') ||
      finalCoverUrl.startsWith('data:')
    ) {
      finalCoverUrl = await this.uploadImageAsync(finalCoverUrl);
    }

    const firstMediaId = generateUUID();
    const newAlbum: GalleryAlbum = {
      id,
      title: albumData.title.trim(),
      category: albumData.category,
      cover_url: finalCoverUrl,
      location: albumData.location.trim() || 'Indonesia',
      year: albumData.year.trim() || new Date().getFullYear().toString(),
      chapter: albumData.chapter.trim() || 'Mercedes-Benz Club Indonesia',
      description: albumData.description?.trim() || null,
      created_at,
      created_by: albumData.created_by,
      items: [
        {
          id: firstMediaId,
          album_id: id,
          media_url: finalCoverUrl,
          thumbnail_url: finalCoverUrl,
          media_type: 'image',
          uploaded_by: albumData.created_by,
          created_at,
        },
      ],
    };

    // 1. Simpan ke local persistent storage
    const currentLocal = await this.getLocalAlbums();
    await this.saveLocalAlbums([newAlbum, ...currentLocal]);

    // 2. Simpan cover ke Supabase Cloud table gallery (event_id = album.id)
    try {
      await (supabase.from('gallery') as any).insert([
        {
          id: firstMediaId,
          event_id: newAlbum.id,
          title: newAlbum.title,
          description: newAlbum.description,
          media_url: newAlbum.cover_url,
          media_type: 'image',
          thumbnail_url: newAlbum.cover_url,
          uploaded_by: newAlbum.created_by,
          created_at,
        },
      ]);
    } catch (err: any) {
      console.warn('[Gallery Service] Cloud sync album warning:', err.message);
    }

    return newAlbum;
  },

  /**
   * Menambahkan Foto atau Video ke Album Kegiatan yang Sudah Ada
   * TANPA FORM REPETITIF! Hanya butuh media_url dan media_type.
   */
  async addMediaToAlbum(params: {
    album_id: string;
    media_url: string;
    media_type: 'image' | 'video';
    video_url?: string;
    uploaded_by: string;
  }): Promise<GalleryMediaItem> {
    const id = generateUUID();
    const created_at = new Date().toISOString();

    let finalUrl = params.media_url;
    if (
      params.media_type === 'image' &&
      (finalUrl.startsWith('file:') || finalUrl.startsWith('blob:') || finalUrl.startsWith('data:'))
    ) {
      finalUrl = await this.uploadImageAsync(finalUrl);
    }

    const newMedia: GalleryMediaItem = {
      id,
      album_id: params.album_id,
      media_url: finalUrl,
      thumbnail_url: finalUrl,
      media_type: params.media_type,
      video_url: params.video_url,
      uploaded_by: params.uploaded_by,
      created_at,
    };

    // 1. Update ke local storage album
    const localAlbums = await this.getLocalAlbums();
    const targetIdx = localAlbums.findIndex((a) => a.id === params.album_id);
    if (targetIdx !== -1) {
      localAlbums[targetIdx].items.unshift(newMedia);
      await this.saveLocalAlbums([...localAlbums]);
    } else {
      const all = await this.getAlbums();
      const match = all.find((a) => a.id === params.album_id);
      if (match) {
        match.items.unshift(newMedia);
        await this.saveLocalAlbums([match, ...localAlbums]);
      }
    }

    // 2. Simpan ke Supabase Cloud table gallery
    try {
      await (supabase.from('gallery') as any).insert([
        {
          id: newMedia.id,
          event_id: newMedia.album_id,
          title: `Media Dokumentasi Kegiatan`,
          description: null,
          media_url: newMedia.media_url,
          media_type: newMedia.media_type,
          thumbnail_url: newMedia.thumbnail_url,
          uploaded_by: newMedia.uploaded_by,
          created_at,
        },
      ]);
    } catch (err: any) {
      console.warn('[Gallery Service] Cloud sync media item warning:', err.message);
    }

    return newMedia;
  },

  // Backward compatibility methods
  async getLocalItems(): Promise<EnrichedGalleryItem[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_GALLERY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  async saveLocalItems(items: EnrichedGalleryItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(items));
    } catch (e) {
      console.warn('Error saving gallery to AsyncStorage:', e);
    }
  },

  async getGalleryItems(): Promise<EnrichedGalleryItem[]> {
    const albums = await this.getAlbums();
    const allItems: EnrichedGalleryItem[] = [];
    for (const alb of albums) {
      for (const item of alb.items) {
        allItems.push({
          id: item.id,
          event_id: alb.id,
          title: alb.title,
          description: alb.description,
          media_url: item.media_url,
          media_type: item.media_type,
          thumbnail_url: item.thumbnail_url || item.media_url,
          uploaded_by: item.uploaded_by,
          created_at: item.created_at,
          category: alb.category,
          location: alb.location,
          year: alb.year,
          chapter: alb.chapter,
          video_url: item.video_url,
          is_featured: alb.is_featured,
        });
      }
    }
    return allItems;
  },

  async addGalleryItem(
    item: Omit<EnrichedGalleryItem, 'id' | 'created_at'>
  ): Promise<EnrichedGalleryItem> {
    const albums = await this.getAlbums();
    let targetAlbum = albums[0];
    if (!targetAlbum) {
      targetAlbum = await this.createAlbum({
        title: item.title,
        category: item.category,
        cover_url: item.media_url,
        location: item.location || 'Indonesia',
        year: item.year || new Date().getFullYear().toString(),
        chapter: item.chapter || 'Mercedes-Benz Club Indonesia',
        description: item.description || undefined,
        created_by: item.uploaded_by || '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
      });
      return {
        ...item,
        id: targetAlbum.items[0].id,
        created_at: targetAlbum.created_at,
      };
    }

    const newMedia = await this.addMediaToAlbum({
      album_id: targetAlbum.id,
      media_url: item.media_url,
      media_type: item.media_type,
      video_url: item.video_url,
      uploaded_by: item.uploaded_by,
    });

    return {
      ...item,
      id: newMedia.id,
      created_at: newMedia.created_at,
    };
  },
};



