// ============================================================
// Root Layout — Auth gate + Font loading
// Mercedes-Benz Club Indonesia
// ============================================================

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import '../global.css';

// Keep splash visible until auth is resolved
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();

    // Check for OAuth error in URL hash or query params
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('error=') || search.includes('error=')) {
        const params = new URLSearchParams(hash.replace('#', '?') || search);
        const errorDesc = params.get('error_description') || params.get('error') || 'Gagal login';
        console.error('[OAuth Error]', errorDesc);
        alert('Gagal Login dengan Google: ' + decodeURIComponent(errorDesc).replace(/\+/g, ' '));
        window.history.replaceState(null, '', window.location.pathname);
        router.replace('/(auth)/login');
        return;
      }
      // If URL currently contains access_token or code, let Supabase process it first
      if (hash.includes('access_token') || search.includes('code=')) {
        return;
      }
    }

    const segs = segments as string[];
    const inAuthGroup = segs.includes('(auth)');
    const inMainGroup =
      segs.includes('(main)') ||
      segs.some((s) =>
        [
          'dashboard',
          'event',
          'forum',
          'toko',
          'profil',
          'admin',
          'organisasi',
          'keanggotaan',
          'gallery',
          'sponsorship',
          'koperasi',
        ].includes(s)
      );

    if (!user) {
      // Unauthenticated: Only redirect to landing if user is trying to access protected main pages
      if (inMainGroup) {
        router.replace('/');
      }
    } else {
      // Authenticated: If on landing or auth screens, direct to dashboard
      if (!inMainGroup) {
        router.replace('/(main)/dashboard');
      }
    }
  }, [user, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#0B0B0C" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
