// ============================================================
// Supabase Client Configuration
// Mercedes-Benz Club Indonesia
// ============================================================

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing environment variables. Copy .env.example to .env and fill in your credentials.'
  );
}

import { Platform } from 'react-native';

// ── Storage Adapter ──────────────────────────────────────────
const dummySSRStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const authStorage =
  Platform.OS === 'web'
    ? typeof window !== 'undefined'
      ? window.localStorage
      : dummySSRStorage
    : AsyncStorage;

// ── Typed Supabase Client ─────────────────────────────────────
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: authStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// ── Storage Helpers ───────────────────────────────────────────
export const STORAGE_BUCKETS = {
  AVATARS: process.env.EXPO_PUBLIC_STORAGE_BUCKET_AVATARS ?? 'avatars',
  GALLERY: process.env.EXPO_PUBLIC_STORAGE_BUCKET_GALLERY ?? 'gallery',
  DOCUMENTS: process.env.EXPO_PUBLIC_STORAGE_BUCKET_DOCUMENTS ?? 'documents',
} as const;

/**
 * Get public URL for a file in Supabase Storage
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a file to Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @param file - File as ArrayBuffer or Blob
 * @param contentType - MIME type
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: ArrayBuffer | Blob,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return getPublicUrl(bucket, path);
}

export default supabase;
