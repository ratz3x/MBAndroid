// ============================================================
// Supabase Database Type Definitions
// Mercedes-Benz Club Indonesia
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums ────────────────────────────────────────────────────
export type MemberStatus = 'active' | 'pending' | 'suspended' | 'inactive';
export type MemberRole = 'member' | 'admin' | 'super_admin' | 'chapter_admin';
export type EventType = 'nasional' | 'chapter' | 'online';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type ForumCategory =
  | 'teknis_restorasi'
  | 'pasaran_mobil'
  | 'nongkrong_santai'
  | 'pengumuman'
  | 'koperasi';
export type TransactionType = 'simpanan' | 'pinjaman' | 'cicilan' | 'dagang';
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

// ── Table: profiles ───────────────────────────────────────────
export interface Profile {
  id: string;                     // UUID, FK → auth.users.id
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  role: MemberRole;
  created_at: string;
  updated_at: string;
}

// ── Table: members ────────────────────────────────────────────
export interface Member {
  id: string;                     // UUID
  profile_id: string;             // FK → profiles.id
  member_number: string | null;   // e.g. "MBINA-JKT-2026-000001", NULL while pending
  status: MemberStatus;
  chapter: string | null;         // e.g. "MBC Palembang", "MBC Jakarta"
  join_date: string;              // ISO date
  // Vehicle Data
  car_brand: string;              // "Mercedes-Benz"
  car_model: string;              // e.g. "C-Class W205"
  car_year: number;
  car_plate: string;
  // Documents
  ktp_url: string | null;         // Foto resmi member
  // Flags & Approval
  is_approved: boolean;
  approved_by: string | null;     // FK → profiles.id
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Table: events ─────────────────────────────────────────────
export interface Event {
  id: string;                     // UUID
  event_code?: string | null;     // e.g. "EVT-2026-001"
  title: string;
  description: string | null;
  type: EventType | string;
  status: EventStatus | string;
  chapter: string | null;
  location: string;
  location_url: string | null;    // Google Maps URL
  start_date: string;             // ISO datetime
  end_date: string;               // ISO datetime
  thumbnail_url: string | null;
  max_participants: number | null;
  rsvp_deadline: string | null;
  // PIC (Person In Charge) & Panitia
  pic_name?: string | null;
  pic_phone?: string | null;
  pic_club?: string | null;
  pic_role?: string | null;
  // RAB & Pricing
  budget_estimated?: number | null;
  fee_member?: number | null;
  fee_non_member?: number | null;
  created_by?: string | null;     // FK → profiles.id
  created_at?: string;
  updated_at?: string;
}

// ── Table: event_rsvps ────────────────────────────────────────
export interface EventRsvp {
  id: string;
  event_id: string;
  member_id: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
  registered_at: string;
  notes: string | null;
}

// ── Table: gallery ────────────────────────────────────────────
export interface GalleryItem {
  id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  uploaded_by: string;
  created_at: string;
}

// ── Table: forum_threads ──────────────────────────────────────
export interface ForumThread {
  id: string;
  category: ForumCategory;
  title: string;
  content: string;
  author_id: string;              // FK → profiles.id
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  view_count: number;
  like_count: number;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Table: forum_likes ────────────────────────────────────────
export interface ForumLike {
  id: string;
  thread_id: string;
  user_id: string;
  created_at: string;
}

// ── Table: forum_replies ──────────────────────────────────────
export interface ForumReply {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  updated_at: string;
}

// ── Table: sponsors ───────────────────────────────────────────
export interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  category: string;               // e.g. "Bengkel", "Asuransi", "Aksesoris"
  website_url: string | null;
  discount_info: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Table: products ───────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: 'merchandise' | 'spare_parts' | 'aksesoris';
  price: number;
  stock: number;
  image_url: string | null;
  is_available: boolean;
  sku: string | null;
  created_at: string;
  updated_at: string;
}

// ── Table: koperasi_transactions ─────────────────────────────
export interface KoperasiTransaction {
  id: string;
  member_id: string;              // FK → members.id
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string | null;
  reference_number: string;
  due_date: string | null;
  processed_by: string | null;    // FK → profiles.id
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Table: koperasi_balances ──────────────────────────────────
export interface KoperasiBalance {
  id: string;
  member_id: string;
  simpanan_pokok: number;
  simpanan_wajib: number;
  simpanan_sukarela: number;
  total_balance: number;
  active_loan: number | null;
  loan_remaining: number | null;
  updated_at: string;
}

// ── Table: sos_alerts ─────────────────────────────────────────
export type SOSStatus = 'pending' | 'in_progress' | 'resolved' | 'cancelled';

export interface SOSAlert {
  id: string;
  profile_id: string | null;
  member_id: string | null;
  full_name: string | null;
  member_number: string | null;
  chapter: string | null;
  car_model: string | null;
  car_plate: string | null;
  phone: string | null;
  emergency_type: string;
  latitude: number | null;
  longitude: number | null;
  location_notes: string | null;
  notes: string | null;
  status: SOSStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Database Schema Type (for Supabase client typing) ─────────
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      members: {
        Row: Member;
        Insert: Omit<Member, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Member, 'id' | 'created_at'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Event, 'id' | 'created_at'>>;
      };
      event_rsvps: {
        Row: EventRsvp;
        Insert: Omit<EventRsvp, 'id' | 'registered_at'>;
        Update: Partial<EventRsvp>;
      };
      gallery: {
        Row: GalleryItem;
        Insert: Omit<GalleryItem, 'id' | 'created_at'>;
        Update: Partial<GalleryItem>;
      };
      forum_threads: {
        Row: ForumThread;
        Insert: Omit<ForumThread, 'id' | 'created_at' | 'updated_at' | 'reply_count' | 'view_count'>;
        Update: Partial<Omit<ForumThread, 'id' | 'created_at'>>;
      };
      forum_replies: {
        Row: ForumReply;
        Insert: Omit<ForumReply, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ForumReply>;
      };
      sponsors: {
        Row: Sponsor;
        Insert: Omit<Sponsor, 'id' | 'created_at'>;
        Update: Partial<Sponsor>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at'>>;
      };
      koperasi_transactions: {
        Row: KoperasiTransaction;
        Insert: Omit<KoperasiTransaction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<KoperasiTransaction, 'id' | 'created_at'>>;
      };
      koperasi_balances: {
        Row: KoperasiBalance;
        Insert: Omit<KoperasiBalance, 'id'>;
        Update: Partial<KoperasiBalance>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      member_status: MemberStatus;
      member_role: MemberRole;
      event_type: EventType;
      forum_category: ForumCategory;
      transaction_type: TransactionType;
    };
  };
}
