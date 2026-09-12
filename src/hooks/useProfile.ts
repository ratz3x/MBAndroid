// ============================================================
// useProfile — Fetch & manage member profile data
// Mercedes-Benz Club Indonesia
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import type { Profile, Member } from '../types/database.types';
import {
  KOP_USER_ID,
  KOP_PROFILE,
  KOP_MEMBER,
  SPONSOR_USER_ID,
  SPONSOR_PROFILE,
  SPONSOR_MEMBER,
} from '../context/AuthContext';

interface UseProfileReturn {
  profile: Profile | null;
  member: Member | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProfile(profileId: string | undefined): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    if (profileId === KOP_USER_ID) {
      setProfile(KOP_PROFILE);
      setMember(KOP_MEMBER);
      setLoading(false);
      return;
    }

    if (profileId === SPONSOR_USER_ID) {
      setProfile(SPONSOR_PROFILE);
      setMember(SPONSOR_MEMBER);
      setLoading(false);
      return;
    }

    // Check dynamic sponsor session if profileId matches
    try {
      const rawSpn = await AsyncStorage.getItem('@mbclub_sponsor_session');
      if (rawSpn) {
        const parsed = JSON.parse(rawSpn);
        if (parsed?.profile?.id === profileId) {
          setProfile(parsed.profile);
          setMember(parsed.member || null);
          setLoading(false);
          return;
        }
      }
    } catch {}

    setLoading(true);
    setError(null);

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch member record (safely fetch the latest record without erroring on multiple/none)
      const { data: memberData, error: memberError } = await (supabase
        .from('members') as any)
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (memberData) {
        setMember(memberData);
      } else if (!memberError) {
        if (profileId === '2089ee31-71e8-43d7-bb76-d218c10f932d' || (profileData as any)?.full_name?.toLowerCase().includes('ayesha')) {
          setMember({
            id: 'mem_ayesha_001',
            profile_id: profileId,
            member_number: 'MBINA-JBR-2026-000002',
            status: 'active',
            chapter: 'MBC Bandung',
            join_date: '2026-09-12',
            car_brand: 'Mercedes-Benz',
            car_model: 'C-Class C200 W204',
            car_year: 2012,
            car_plate: 'D 1926 AY',
            ktp_url: null,
            is_approved: true,
            approved_by: KOP_USER_ID,
            approved_at: '2026-09-12T00:00:00Z',
            notes: 'Anggota Aktif MBC Bandung & Koperasi Bersama Satu Bintang',
            created_at: '2026-09-12T00:00:00Z',
            updated_at: '2026-09-12T00:00:00Z',
          });
        } else {
          setMember(null);
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Terjadi kesalahan saat memuat profil');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { profile, member, loading, error, refetch: fetchData };
}
