// ============================================================
// useEvents — Fetch events from Supabase
// Mercedes-Benz Club Indonesia
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { eventService } from '../services/eventService';
import type { Event, EventRsvp } from '../types/database.types';

interface UseEventsOptions {
  chapter?: string;
  status?: Event['status'] | string;
  limit?: number;
}

interface UseEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await eventService.getEvents({
        status: options.status,
        chapter: options.chapter,
      });
      setEvents(data);
    } catch (err: any) {
      setError(err.message ?? 'Gagal memuat data event');
    } finally {
      setLoading(false);
    }
  }, [options.chapter, options.status, options.limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

// ── useEventRsvp ──────────────────────────────────────────────
interface UseEventRsvpReturn {
  rsvp: EventRsvp | null;
  loading: boolean;
  rsvpEvent: (eventId: string, memberId: string) => Promise<void>;
  cancelRsvp: (rsvpId: string) => Promise<void>;
}

export function useEventRsvp(): UseEventRsvpReturn {
  const [rsvp, setRsvp] = useState<EventRsvp | null>(null);
  const [loading, setLoading] = useState(false);

  const rsvpEvent = useCallback(async (eventId: string, memberId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('event_rsvps') as any)
        .insert({ event_id: eventId, member_id: memberId, status: 'confirmed' })
        .select()
        .single();

      if (error) throw error;
      setRsvp(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelRsvp = useCallback(async (rsvpId: string) => {
    setLoading(true);
    try {
      await (supabase
        .from('event_rsvps') as any)
        .update({ status: 'cancelled' })
        .eq('id', rsvpId);
      setRsvp(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { rsvp, loading, rsvpEvent, cancelRsvp };
}
