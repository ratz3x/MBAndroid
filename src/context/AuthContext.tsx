// ============================================================
// Auth Context — Supabase Session Management
// Mercedes-Benz Club Indonesia
// ============================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import type { Profile, Member, MemberRole } from '../types/database.types';

WebBrowser.maybeCompleteAuthSession();

// ── Akun Khusus Pengelola Keuangan Koperasi MBCI ───────────────
export const KOP_USER_ID = 'c00e5141-d35a-440c-b1d9-9cfcdb27470c';
export const KOP_EMAIL = 'Dummy_Kop1@mbandro.org';
export const KOP_PASSWORD = 'kop@20252027';

export const KOP_PROFILE: Profile = {
  id: KOP_USER_ID,
  full_name: 'Pengelola Keuangan Koperasi',
  email: KOP_EMAIL,
  phone: '081298765432',
  avatar_url: null,
  address: 'Office 88 Kota Kasablanka Unit 16B, Jakarta Selatan',
  city: 'Jakarta Selatan',
  province: 'DKI Jakarta',
  role: 'member',
  created_at: '2026-09-10T07:00:00Z',
  updated_at: '2026-09-10T07:00:00Z',
};

export const KOP_MEMBER: Member = {
  id: 'mem_kop_001',
  profile_id: KOP_USER_ID,
  member_number: 'MBINA-KOP-2026-000001',
  status: 'active',
  chapter: 'Koperasi Bersama Satu Bintang',
  join_date: '2026-01-01',
  car_brand: 'Mercedes-Benz',
  car_model: 'V-Class V250 Exclusive (Operasional Koperasi)',
  car_year: 2024,
  car_plate: 'B 1926 KOP',
  ktp_url: null,
  is_approved: true,
  approved_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
  approved_at: '2026-01-01T00:00:00Z',
  notes: 'Akun Khusus Pengelola & Bendahara Simpan Pinjam Koperasi Bersama Satu Bintang',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── Akun Khusus Mitra Sponsor Resmi MBCI ──────────────────────
export const SPONSOR_USER_ID = 'spn_user_promotor_001';
export const SPONSOR_EMAIL = 'sponsor_promotor@mbandro.org';
export const SPONSOR_PASSWORD = 'spn@20252027';

export const SPONSOR_PROFILE: Profile = {
  id: SPONSOR_USER_ID,
  full_name: 'PT Pro Motor Mercedes-Benz',
  email: SPONSOR_EMAIL,
  phone: '081298765432',
  avatar_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=300',
  address: 'Jl. TB Simatupang No. 18, Cilandak, Jakarta Selatan',
  city: 'Jakarta Selatan',
  province: 'DKI Jakarta',
  role: 'member',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

export const SPONSOR_MEMBER: Member = {
  id: 'mem_spn_001',
  profile_id: SPONSOR_USER_ID,
  member_number: 'MBINA-SPN-2026-001',
  status: 'active',
  chapter: 'Mitra Sponsor Resmi MB INA',
  join_date: '2026-08-01',
  car_brand: 'Mercedes-Benz',
  car_model: 'S-Class S450 Luxury (Authorized Dealer Unit)',
  car_year: 2025,
  car_plate: 'B 1 SPN',
  ktp_url: null,
  is_approved: true,
  approved_by: '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
  approved_at: '2026-08-01T00:00:00Z',
  notes: 'Akun Resmi Kemitraan Sponsorship PT Pro Motor Mercedes-Benz Indonesia',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

// ── Types ─────────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isKoperasiAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin =
    profile?.role === 'admin' ||
    profile?.role === 'super_admin' ||
    profile?.role === 'chapter_admin';

  const isKoperasiAdmin =
    user?.id === KOP_USER_ID ||
    profile?.email?.toLowerCase() === KOP_EMAIL.toLowerCase() ||
    user?.email?.toLowerCase() === KOP_EMAIL.toLowerCase() ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin';

  // ── Fetch user profile from DB ──────────────────────────────
  const fetchProfile = useCallback(async (userId: string, currentUser?: User | null) => {
    if (userId === KOP_USER_ID) {
      setProfile(KOP_PROFILE);
      return;
    }

    if (userId === SPONSOR_USER_ID) {
      setProfile(SPONSOR_PROFILE);
      return;
    }

    try {
      const rawSpn = await AsyncStorage.getItem('@mbclub_sponsor_session');
      if (rawSpn) {
        const parsed = JSON.parse(rawSpn);
        if (parsed?.profile?.id === userId) {
          setProfile(parsed.profile);
          return;
        }
      }
    } catch {}

    let profileData: Profile | null = null;
    const { data, error } = await (supabase
      .from('profiles') as any)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      profileData = data as Profile;
    } else if (currentUser) {
      // Auto-create profile in public.profiles if not yet created
      const fallbackName =
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split('@')[0] ||
        'Anggota MBCI';
      const fallbackAvatar =
        currentUser.user_metadata?.avatar_url ||
        currentUser.user_metadata?.picture ||
        null;

      const newProfile = {
        id: userId,
        email: currentUser.email || '',
        full_name: fallbackName,
        avatar_url: fallbackAvatar,
        role: 'member',
      };

      const { data: upserted, error: upsertErr } = await (supabase
        .from('profiles') as any)
        .upsert(newProfile)
        .select()
        .maybeSingle();

      if (!upsertErr && upserted) {
        profileData = upserted as Profile;
      } else {
        profileData = newProfile as Profile;
      }
    }

    if (!profileData) {
      if (error) console.error('[Auth] Profile fetch error:', error.message);
      return;
    }

    // Auto-sync Google OAuth avatar to profiles if missing or updated
    const oauthAvatar =
      currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture;
    if (oauthAvatar && (!profileData.avatar_url || profileData.avatar_url !== oauthAvatar)) {
      try {
        await (supabase
          .from('profiles') as any)
          .update({ avatar_url: oauthAvatar })
          .eq('id', userId);
        profileData.avatar_url = oauthAvatar;
      } catch (syncErr) {
        console.warn('[Auth] Error syncing OAuth avatar to profiles:', syncErr);
      }
    }

    setProfile(profileData);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id, user);
  }, [user, fetchProfile]);

  // ── Initialize session on mount ─────────────────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // 1. Check for PKCE code in query string (?code=...)
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get('code');
          if (code) {
            console.log('[Auth] Exchanging PKCE code for session...');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data.session && mounted) {
              setSession(data.session);
              setUser(data.session.user);
              if (data.session.user.id) {
                await fetchProfile(data.session.user.id, data.session.user);
              }
              window.history.replaceState(null, '', window.location.pathname);
              setLoading(false);
              return;
            }
          }

          // 2. Check for Implicit access_token in hash (#access_token=...)
          if (window.location.hash.includes('access_token')) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const access_token = hashParams.get('access_token');
            const refresh_token = hashParams.get('refresh_token');
            if (access_token && refresh_token) {
              console.log('[Auth] Setting session from URL hash tokens...');
              const { data, error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (!error && data.session && mounted) {
                setSession(data.session);
                setUser(data.session.user);
                if (data.session.user.id) {
                  await fetchProfile(data.session.user.id, data.session.user);
                }
                window.history.replaceState(null, '', window.location.pathname);
                setLoading(false);
                return;
              }
            }
          }
        }

        // Check special kop session
        try {
          const rawKop = await AsyncStorage.getItem('@mbclub_kop_session');
          if (rawKop) {
            const parsed = JSON.parse(rawKop);
            if (parsed && parsed.user && mounted) {
              setSession(parsed);
              setUser(parsed.user);
              setProfile(KOP_PROFILE);
              setLoading(false);
              return;
            }
          }
        } catch {}

        // Check special sponsor session
        try {
          const rawSpn = await AsyncStorage.getItem('@mbclub_sponsor_session');
          if (rawSpn) {
            const parsed = JSON.parse(rawSpn);
            if (parsed && parsed.user && mounted) {
              setSession(parsed);
              setUser(parsed.user);
              setProfile(parsed.profile || SPONSOR_PROFILE);
              setLoading(false);
              return;
            }
          }
        } catch {}

        // Standard session retrieval
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user?.id) {
            await fetchProfile(currentSession.user.id, currentSession.user);
          }
        }
      } catch (err) {
        console.error('[Auth] Session init error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (mounted) {
          try {
            const isKop = await AsyncStorage.getItem('@mbclub_kop_session');
            const isSpn = await AsyncStorage.getItem('@mbclub_sponsor_session');
            if ((isKop || isSpn) && !newSession) {
              return;
            }
          } catch {}
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user?.id) {
            await fetchProfile(newSession.user.id, newSession.user);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ── Auth Actions ────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if ((cleanEmail === KOP_EMAIL.toLowerCase() || cleanEmail === 'dummy_kop1@gmail.com') && password === KOP_PASSWORD) {
      const kopUser: User = {
        id: KOP_USER_ID,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { full_name: 'Pengelola Keuangan Koperasi', role: 'member' },
        aud: 'authenticated',
        created_at: '2026-09-10T07:00:00Z',
        email: KOP_EMAIL,
        phone: '081298765432',
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

      const kopSession: Session = {
        access_token: 'kop_session_token_' + Date.now(),
        refresh_token: 'kop_refresh_token_' + Date.now(),
        expires_in: 3600 * 24 * 365,
        token_type: 'bearer',
        user: kopUser,
      };

      try {
        await AsyncStorage.setItem('@mbclub_kop_session', JSON.stringify(kopSession));
      } catch {}

      setSession(kopSession);
      setUser(kopUser);
      setProfile(KOP_PROFILE);
      return { error: null };
    }

    // Check special seed sponsor account
    if (cleanEmail === SPONSOR_EMAIL.toLowerCase() && password === SPONSOR_PASSWORD) {
      const spnUser: User = {
        id: SPONSOR_USER_ID,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { full_name: SPONSOR_PROFILE.full_name, role: 'member' },
        aud: 'authenticated',
        created_at: '2026-08-01T00:00:00Z',
        email: SPONSOR_EMAIL,
        phone: SPONSOR_PROFILE.phone || '081298765432',
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

      const spnSession: Session = {
        access_token: 'spn_session_token_' + Date.now(),
        refresh_token: 'spn_refresh_token_' + Date.now(),
        expires_in: 3600 * 24 * 365,
        token_type: 'bearer',
        user: spnUser,
      };

      try {
        await AsyncStorage.setItem(
          '@mbclub_sponsor_session',
          JSON.stringify({ ...spnSession, profile: SPONSOR_PROFILE, member: SPONSOR_MEMBER })
        );
      } catch {}

      setSession(spnSession);
      setUser(spnUser);
      setProfile(SPONSOR_PROFILE);
      return { error: null };
    }

    // Check dynamic sponsor accounts registered by Admin
    try {
      const rawAccounts = await AsyncStorage.getItem('@mbclub_sponsor_accounts');
      if (rawAccounts) {
        const accounts = JSON.parse(rawAccounts);
        const matched = accounts.find(
          (acc: any) => acc.email?.toLowerCase() === cleanEmail && acc.password === password
        );
        if (matched) {
          const dynUser: User = {
            id: matched.id,
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: { full_name: matched.name, role: 'member' },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: matched.email,
            phone: matched.phone || '08123456789',
            role: 'authenticated',
            updated_at: new Date().toISOString(),
          };
          const dynSession: Session = {
            access_token: 'spn_session_token_' + Date.now(),
            refresh_token: 'spn_refresh_token_' + Date.now(),
            expires_in: 3600 * 24 * 365,
            token_type: 'bearer',
            user: dynUser,
          };
          const dynProfile: Profile = {
            id: matched.id,
            full_name: matched.name,
            email: matched.email,
            phone: matched.phone || '08123456789',
            avatar_url: matched.logo_url || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=300',
            address: matched.address || 'Mitra Sponsor MB Club Indonesia',
            city: 'Jakarta',
            province: 'DKI Jakarta',
            role: 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const dynMember: Member = {
            id: 'mem_' + matched.id,
            profile_id: matched.id,
            member_number: matched.sponsor_id,
            status: 'active',
            chapter: 'Mitra Sponsor Resmi MB INA',
            join_date: new Date().toISOString().split('T')[0],
            car_brand: 'Mercedes-Benz',
            car_model: 'Official Partner Unit',
            car_year: 2025,
            car_plate: 'B 1 SPN',
            ktp_url: null,
            is_approved: true,
            approved_by: 'admin',
            approved_at: new Date().toISOString(),
            notes: `Akun Kemitraan Sponsor ${matched.name}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          await AsyncStorage.setItem(
            '@mbclub_sponsor_session',
            JSON.stringify({ ...dynSession, profile: dynProfile, member: dynMember })
          );
          setSession(dynSession);
          setUser(dynUser);
          setProfile(dynProfile);
          return { error: null };
        }
      }
    } catch {}

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      // Create profile record after sign up
      if (!error && data.user) {
        await (supabase.from('profiles') as any).insert({
          id: data.user.id,
          email,
          full_name: fullName,
          role: 'member' as MemberRole,
        });
      }

      return { error };
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081',
            queryParams: {
              prompt: 'select_account',
            },
          },
        });
        return { error };
      } else {
        const redirectUrl = Linking.createURL('/');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
            queryParams: {
              prompt: 'select_account',
            },
          },
        });
        if (error) return { error };

        if (data?.url) {
          const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          if (res.type === 'success' && res.url) {
            // Extract tokens from hash or query
            const formattedUrl = res.url.includes('#') ? res.url.replace('#', '?') : res.url;
            const parsed = Linking.parse(formattedUrl);
            const accessToken = parsed.queryParams?.access_token as string;
            const refreshToken = parsed.queryParams?.refresh_token as string;
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            }
          }
        }
        return { error: null };
      }
    } catch (err: any) {
      return { error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('@mbclub_kop_session');
      await AsyncStorage.removeItem('@mbclub_sponsor_session');
    } catch {}
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin,
        isKoperasiAdmin,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
