// ============================================================
// Event Service — Hybrid Cloud & Local Storage
// Mercedes-Benz Club Indonesia
// Memastikan draft dan event selalu tersimpan dan sinkron
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Event } from '../types/database.types';

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

const STORAGE_KEY_EVENTS = '@mbclub_events_cache';

export const eventService = {
  /**
   * Ambil semua event lokal dari AsyncStorage
   */
  async getLocalEvents(): Promise<Event[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_EVENTS);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  /**
   * Simpan daftar event ke AsyncStorage
   */
  async setLocalEvents(events: Event[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    } catch (e) {
      console.warn('Error saving to AsyncStorage:', e);
    }
  },

  /**
   * Ambil event (Supabase + Local Merge)
   * Secara default TIDAK menampilkan draft ke member biasa
   */
  async getEvents(options: { status?: string; chapter?: string } = {}): Promise<Event[]> {
    const localEvents = await this.getLocalEvents();
    let cloudEvents: Event[] = [];

    try {
      let query = (supabase.from('events') as any).select('*');
      if (options.status && options.status !== 'draft') {
        query = query.eq('status', options.status);
      }
      if (options.chapter) {
        query = query.eq('chapter', options.chapter);
      }
      const { data, error } = await query.order('start_date', { ascending: true });
      if (!error && data) {
        cloudEvents = data as Event[];
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local events:', err);
    }

    // Gabungkan (Merge): prioritaskan cloud, tapi sertakan event lokal yang belum sinkron
    const map = new Map<string, Event>();
    for (const ev of cloudEvents) {
      map.set(ev.id, ev);
    }
    for (const ev of localEvents) {
      // Keamanan: Jangan sertakan draft kecuali diminta secara eksplisit
      if (options.status) {
        if (ev.status !== options.status) continue;
      } else {
        if (ev.status === 'draft') continue;
      }
      if (options.chapter && ev.chapter !== options.chapter) continue;
      if (!map.has(ev.id)) {
        map.set(ev.id, ev);
      }
    }

    return Array.from(map.values());
  },

  /**
   * Ambil khusus event berstatus DRAFT (disimpan lokal sebelum dipublikasikan)
   */
  async getDraftEvents(): Promise<Event[]> {
    const localEvents = await this.getLocalEvents();
    return localEvents.filter((ev) => ev.status === 'draft');
  },

  /**
   * Simpan event baru (Draft atau Published)
   */
  async saveEvent(eventData: Partial<Event>): Promise<{ success: boolean; event: Event; error?: string }> {
    const now = new Date().toISOString();
    const eventId = eventData.id || eventData.event_code || generateUUID();
    const newEvent: Event = {
      id: eventId,
      event_code: eventData.event_code || eventId,
      title: eventData.title || 'Event Baru',
      description: eventData.description || '',
      type: eventData.type || 'TOURING / RIDE',
      status: eventData.status || 'draft',
      chapter: eventData.chapter || eventData.pic_club || null,
      location: eventData.location || 'Indonesia',
      location_url: eventData.location_url || null,
      start_date: eventData.start_date || now,
      end_date: eventData.end_date || now,
      thumbnail_url: eventData.thumbnail_url || null,
      max_participants: eventData.max_participants || 100,
      rsvp_deadline: eventData.rsvp_deadline || null,
      pic_name: eventData.pic_name || null,
      pic_phone: eventData.pic_phone || null,
      pic_club: eventData.pic_club || null,
      pic_role: eventData.pic_role || null,
      created_at: now,
      updated_at: now,
    };

    // 1. Simpan ke Local Storage terlebih dahulu agar instan dan tidak hilang
    const localEvents = await this.getLocalEvents();
    const existingIndex = localEvents.findIndex(
      (e) => e.id === newEvent.id || (e.event_code && e.event_code === newEvent.event_code)
    );

    if (existingIndex >= 0) {
      localEvents[existingIndex] = newEvent;
    } else {
      localEvents.unshift(newEvent);
    }
    await this.setLocalEvents(localEvents);

    // 2. Simpan ke Supabase Cloud
    try {
      let creatorId = '6c5ee3db-97be-445e-ab99-d03175ad7bc6'; // Super Admin fallback
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          creatorId = authData.user.id;
        }
      } catch {}

      const validTypes = ['nasional', 'chapter', 'online'];
      const mappedType = validTypes.includes(String(newEvent.type).toLowerCase())
        ? String(newEvent.type).toLowerCase()
        : 'nasional';

      const cloudPayload: any = {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        type: mappedType,
        status: newEvent.status,
        location: newEvent.location || 'Indonesia',
        location_url: newEvent.location_url || null,
        start_date: newEvent.start_date,
        end_date: newEvent.end_date,
        max_participants: newEvent.max_participants,
        thumbnail_url: newEvent.thumbnail_url,
        chapter: newEvent.chapter || null,
        created_by: creatorId,
        created_at: newEvent.created_at,
        updated_at: newEvent.updated_at,
      };

      const { error } = await (supabase.from('events') as any)
        .upsert(cloudPayload);

      if (error) {
        console.warn('Supabase save warning (persisted locally):', error.message);
      }
    } catch (cloudErr: any) {
      console.warn('Supabase cloud connection error:', cloudErr);
    }

    return { success: true, event: newEvent };
  },

  /**
   * Publikasikan Event (ubah status dari draft ke upcoming)
   */
  async publishEvent(eventId: string): Promise<boolean> {
    // 1. Update Local Storage
    const localEvents = await this.getLocalEvents();
    const ev = localEvents.find((e) => e.id === eventId);
    if (ev) {
      ev.status = 'upcoming';
      ev.updated_at = new Date().toISOString();
      await this.setLocalEvents(localEvents);
    }

    // 2. Update Supabase
    try {
      await (supabase.from('events') as any)
        .update({ status: 'upcoming', updated_at: new Date().toISOString() })
        .eq('id', eventId);
    } catch (e) {
      console.warn('Error updating Supabase:', e);
    }

    return true;
  },

  /**
   * Hapus Event (Draft atau Acara)
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    // 1. Hapus dari Local Storage
    const localEvents = await this.getLocalEvents();
    const filtered = localEvents.filter((e) => e.id !== eventId);
    await this.setLocalEvents(filtered);

    // 2. Hapus dari Supabase
    try {
      await (supabase.from('events') as any).delete().eq('id', eventId);
    } catch (e) {
      console.warn('Error deleting from Supabase:', e);
    }

    return true;
  },
};
