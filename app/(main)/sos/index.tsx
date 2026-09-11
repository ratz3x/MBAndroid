// ============================================================
// SOS & Roadside Assistance — MBCI Rescue
// Mercedes-Benz Club Indonesia (Emergency & Rescue Dispatch)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../src/context/AuthContext';
import { useProfile } from '../../../src/hooks/useProfile';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../../src/constants/theme';
import { LuxuryCard } from '../../../src/components/ui/LuxuryCard';

// ── Emergency Types ──────────────────────────────────────────
const EMERGENCY_TYPES = [
  { id: 'mogok', label: 'Mogok / Mesin Mati', icon: 'flash-off-outline' },
  { id: 'overheat', label: 'Mesin Overheat', icon: 'flame-outline' },
  { id: 'towing', label: 'Butuh Derek Towing', icon: 'car-sport-outline' },
  { id: 'ban', label: 'Ban Bocor / Pecah', icon: 'disc-outline' },
  { id: 'transmisi', label: 'Transmisi / Kelistrikan', icon: 'hardware-chip-outline' },
  { id: 'laka', label: 'Kecelakaan / Laka Lantas', icon: 'warning-outline' },
  { id: 'medis', label: 'Bantuan Medis Darurat', icon: 'medkit-outline' },
  { id: 'kejahatan', label: 'Kejahatan di Jalan Raya', icon: 'shield-outline' },
] as const;

// ── National Emergency Numbers ───────────────────────────────
const EMERGENCY_CONTACTS = [
  {
    name: 'Derek Tol Jasa Marga',
    phone: '14080',
    desc: 'Bantuan derek resmi seluruh ruas jalan tol',
    icon: 'car-outline',
    badge: 'TOL 24 JAM',
  },
  {
    name: 'Polisi Lalu Lintas',
    phone: '110',
    desc: 'Laporan darurat kepolisian & laka lantas',
    icon: 'shield-outline',
    badge: 'POLRI',
  },
  {
    name: 'Ambulans & Medis Darurat',
    phone: '119',
    desc: 'Penanganan gawat darurat & rumah sakit',
    icon: 'medkit-outline',
    badge: 'KEMENKES',
  },
  {
    name: 'Hotline Rescue MBCI',
    phone: '082129709595',
    wa: '6282129709595',
    desc: 'Koordinator rescue touring & chapter MBCI',
    icon: 'call-outline',
    badge: 'MBCI PUSAT',
  },
];

// ── Bengkel Rekanan & Towing Spesialis Mercedes-Benz ──────────
const WORKSHOPS = [
  {
    name: 'Karya Bintang Mandiri (KBM) Motor',
    region: 'Jabodetabek',
    kota: 'Jakarta Selatan',
    phone: '081288881240',
    desc: 'Spesialis mesin, elektrikal & transmisi Mercedes-Benz (W124, W210, W211, W204, W205, W212, W221)',
    is24h: true,
  },
  {
    name: 'Star Auto Service BSD',
    region: 'Jabodetabek',
    kota: 'Tangerang Selatan',
    phone: '081399990190',
    desc: 'Scan Star Diagnosis, servis berkala, suspensi udara (Airmatic) & kaki-kaki Mercy',
    is24h: false,
  },
  {
    name: 'Garasi Bintang Bandung',
    region: 'Jawa Barat',
    kota: 'Bandung',
    phone: '081220008899',
    desc: 'Spesialis Mercedes-Benz klasik & modern, towing gendong flatdeck 24 jam Bandung - Cipularang',
    is24h: true,
  },
  {
    name: 'Solo Star Motor',
    region: 'Jateng & DIY',
    kota: 'Solo / Surakarta',
    phone: '081226001234',
    desc: 'Bengkel rujukan MBC Solo Raya & Jalur Tol Trans Jawa (Solo - Kertosono)',
    is24h: true,
  },
  {
    name: 'Bintang Timur Motor',
    region: 'Jawa Timur & Bali',
    kota: 'Surabaya',
    phone: '081133334567',
    desc: 'Spesialis Mercy Jawa Timur, towing hidrolik flatbed Surabaya - Malang - Banyuwangi',
    is24h: true,
  },
  {
    name: 'Sumatera Star Rescue (Jambi & Palembang)',
    region: 'Sumatera',
    kota: 'Jambi / Palembang',
    phone: '082129709595',
    desc: 'Penanganan touring lintas Sumatera, derek towing flatdeck & mekanik keliling',
    is24h: true,
  },
];

// ── Quick Troubleshooting Tips ───────────────────────────────
const QUICK_TIPS = [
  {
    title: 'Mesin Overheat (Suhu Tinggi)',
    icon: 'flame-outline',
    content:
      '1. Segera nyalakan lampu hazard dan menepi ke tempat aman.\n2. JANGAN langsung membuka tutup reservoir/radiator saat mendidih (bahaya semburan uap panas bertekanan).\n3. Biarkan mesin mendingin minimal 30 menit dengan kap mesin terbuka.\n4. Cek level coolant dan kebocoran selang radiator setelah mesin dingin.',
  },
  {
    title: 'Jumper Aki Mercy (Battery Jump Start)',
    icon: 'battery-charging-outline',
    content:
      '1. Gunakan terminal jumper khusus di ruang mesin (jangan langsung cabut aki utama).\n2. Pastikan mobil penolong dalam kondisi mesin mati saat kabel dipasang untuk melindungi modul SAM & ECU sensitif.\n3. Hubungkan Positif (+) ke Positif (+), lalu Negatif (-) ke ground bodi mobil.\n4. Hidupkan mobil penolong, diamkan 5 menit, baru start mobil Anda.',
  },
  {
    title: 'Transmisi Terkunci di Posisi P saat Mogok',
    icon: 'key-outline',
    content:
      '1. Jika aki drop, transmisi otomatis Mercy tidak bisa digeser ke N.\n2. Buka penutup konsol tuas transmisi dan tekan tombol darurat (Shift Lock Override) menggunakan obeng/kunci.\n3. Geser ke posisi N agar mobil bisa diderek towing flatdeck dengan aman tanpa merusak girboks.',
  },
];

export default function SOSScreen() {
  const router = useRouter();
  const { user, profile: authProfile } = useAuth();
  const { member } = useProfile(user?.id);
  const [localMember, setLocalMember] = useState<any>(null);

  // Form State
  const [selectedType, setSelectedType] = useState<string>('mogok');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingGps, setLoadingGps] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'sos' | 'contacts' | 'workshops' | 'tips'>('sos');
  const [selectedRegion, setSelectedRegion] = useState<string>('Semua');

  // Load fallback local storage
  useEffect(() => {
    async function loadCache() {
      if (!user?.id) return;
      try {
        const cached = await AsyncStorage.getItem('mb_local_member_' + user.id);
        if (cached) setLocalMember(JSON.parse(cached));
      } catch {}
    }
    loadCache();
  }, [user?.id]);

  const activeMember = member || localMember;

  // Auto fetch GPS location on mount
  const fetchLocation = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setLoadingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setLoadingGps(false);
        },
        (err) => {
          console.warn('[SOS] Geolocation error:', err);
          setLoadingGps(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Direct Phone Call
  const handleCall = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert('Gagal Memanggil', `Silakan hubungi manual ke nomor: ${phoneNumber}`);
    });
  };

  // Dispatch SOS WhatsApp
  const handleSendSOS = () => {
    const currentEmergency = EMERGENCY_TYPES.find((t) => t.id === selectedType);
    const memberName = authProfile?.full_name || 'Member MBCI';
    const memberNo = activeMember?.member_number || 'KTA Belum Diterbitkan';
    const chapter = activeMember?.chapter || 'Pusat / Domisili';
    const carInfo = `${activeMember?.car_brand || 'Mercedes-Benz'} ${activeMember?.car_model || ''} (${activeMember?.car_plate || 'Plat belum terdaftar'})`.trim();
    const phone = authProfile?.phone || '-';

    let mapsLink = '';
    if (gpsCoords) {
      mapsLink = `https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}`;
    }

    const message = `🚨 *[SOS DARURAT MBCI - ROAD ASSISTANCE]* 🚨\n\n` +
      `*Nama Member:* ${memberName}\n` +
      `*Nomor KTA:* ${memberNo}\n` +
      `*Chapter:* ${chapter}\n` +
      `*Kendaraan:* ${carInfo}\n` +
      `*Kontak HP/WA:* ${phone}\n\n` +
      `*Jenis Kendala:* ⚠️ ${currentEmergency?.label || 'Kendala Darurat'}\n` +
      (customNotes.trim() ? `*Detail Kendala:* ${customNotes.trim()}\n` : '') +
      (locationName.trim() ? `*Patokan Lokasi:* ${locationName.trim()}\n` : '') +
      (mapsLink ? `*Titik GPS Maps:* ${mapsLink}\n\n` : '\n') +
      `_Mohon bantuan rescue team, towing flatdeck, atau chapter MBCI terdekat!_`;

    const rescueWA = '6282129709595'; // Hotline Rescue MBCI
    const waUrl = `https://wa.me/${rescueWA}?text=${encodeURIComponent(message)}`;

    Linking.openURL(waUrl).catch(() => {
      Alert.alert('Gagal Membuka WhatsApp', 'Silakan hubungi Hotline Rescue langsung via telepon: 0821-2970-9595');
    });
  };

  const filteredWorkshops = WORKSHOPS.filter(
    (w) => selectedRegion === 'Semua' || w.region === selectedRegion
  );

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerTitleBox}>
          <View style={styles.emergencyLiveDot} />
          <Text style={styles.headerTitle}>SOS & Road Assistance</Text>
        </View>
        <Pressable
          onPress={() => handleCall('14080')}
          style={styles.quickCallTollBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="call" size={14} color="#FFF" />
          <Text style={styles.quickCallTollText}>TOL 14080</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'sos', label: '🚨 Sinyal SOS' },
          { key: 'contacts', label: '📞 Kontak Darurat' },
          { key: 'workshops', label: '🔧 Bengkel & Derek' },
          { key: 'tips', label: '💡 Panduan Cepat' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* TAB 1: SINYAL SOS DISPATCH */}
        {activeTab === 'sos' && (
          <View>
            {/* Alert Banner */}
            <View style={styles.heroAlertBox}>
              <View style={styles.heroIconBox}>
                <Ionicons name="warning" size={26} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Pusat Bantuan Darurat MBCI</Text>
                <Text style={styles.heroDesc}>
                  Mengalami mogok, overheat, atau butuh towing? Kirim sinyal SOS darurat lengkap dengan GPS & data kendaraan langsung ke Tim Rescue.
                </Text>
              </View>
            </View>

            {/* Step 1: Jenis Kendala */}
            <Text style={styles.sectionLabel}>1. PILIH JENIS KENDALA DARURAT</Text>
            <View style={styles.typesGrid}>
              {EMERGENCY_TYPES.map((t) => {
                const isSelected = selectedType === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedType(t.id)}
                    style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={20}
                      color={isSelected ? '#EF4444' : Colors.text.tertiary}
                    />
                    <Text style={[styles.typeCardText, isSelected && styles.typeCardTextSelected]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Step 2: Lokasi & GPS */}
            <Text style={styles.sectionLabel}>2. LOKASI KEJADIAN & GPS</Text>
            <LuxuryCard variant="gold" style={styles.gpsCard}>
              <View style={styles.gpsHeaderRow}>
                <View style={styles.gpsIconCircle}>
                  <Ionicons name="location" size={18} color={Colors.brand.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gpsStatusTitle}>
                    {gpsCoords ? 'Titik Koordinat GPS Terkunci' : 'Menunggu Sinyal GPS...'}
                  </Text>
                  <Text style={styles.gpsCoordsText}>
                    {gpsCoords
                      ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`
                      : 'Aktifkan izin lokasi browser/ponsel untuk presisi maksimal'}
                  </Text>
                </View>
                <Pressable onPress={fetchLocation} style={styles.gpsRefreshBtn} disabled={loadingGps}>
                  {loadingGps ? (
                    <ActivityIndicator size="small" color={Colors.brand.gold} />
                  ) : (
                    <Ionicons name="refresh" size={18} color={Colors.brand.gold} />
                  )}
                </Pressable>
              </View>

              <TextInput
                style={styles.locationInput}
                placeholder="Patokan lokasi (contoh: KM 85 Tol Cipularang arah Bandung)"
                placeholderTextColor={Colors.text.disabled}
                value={locationName}
                onChangeText={setLocationName}
              />
            </LuxuryCard>

            {/* Step 3: Catatan Tambahan */}
            <Text style={styles.sectionLabel}>3. CATATAN / KELUHAN (OPSIONAL)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Contoh: Asap putih keluar dari kap, indikator suhu mentok 120°C..."
              placeholderTextColor={Colors.text.disabled}
              value={customNotes}
              onChangeText={setCustomNotes}
              multiline
              numberOfLines={3}
            />

            {/* Dispatch SOS Button */}
            <Pressable
              onPress={handleSendSOS}
              style={({ pressed }) => [
                styles.sosDispatchBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.sosPulseRing}>
                <Ionicons name="alert-circle" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sosDispatchBtnTitle}>KIRIM SINYAL SOS KE TIM RESCUE</Text>
                <Text style={styles.sosDispatchBtnSubtitle}>
                  Kirim koordinat GPS & data kendaraan via WhatsApp 24 Jam
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </Pressable>

            {/* Info Box */}
            <View style={styles.memberIdentBox}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.brand.gold} style={{ marginRight: 6 }} />
              <Text style={styles.memberIdentText}>
                Data KTA ({activeMember?.member_number || 'Non-KTA'}) dan plat kendaraan ({activeMember?.car_plate || '-'}) otomatis terlampir dalam sinyal darurat.
              </Text>
            </View>
          </View>
        )}

        {/* TAB 2: KONTAK DARURAT NASIONAL */}
        {activeTab === 'contacts' && (
          <View>
            <Text style={styles.sectionHeaderTitle}>Panggilan Cepat Darurat Nasional</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Tekan tombol hijau untuk langsung terhubung ke layanan darurat resmi 24 jam.
            </Text>

            <View style={styles.contactsList}>
              {EMERGENCY_CONTACTS.map((item) => (
                <LuxuryCard key={item.name} variant="default" style={styles.contactCard}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactIconBox}>
                      <Ionicons name={item.icon as any} size={22} color={Colors.brand.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.badgeRow}>
                        <Text style={styles.contactBadge}>{item.badge}</Text>
                      </View>
                      <Text style={styles.contactName}>{item.name}</Text>
                      <Text style={styles.contactDesc}>{item.desc}</Text>
                      <Text style={styles.contactNumber}>{item.phone}</Text>
                    </View>

                    <Pressable
                      onPress={() => handleCall(item.phone)}
                      style={styles.callBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="call" size={18} color="#000" />
                      <Text style={styles.callBtnText}>Panggil</Text>
                    </Pressable>
                  </View>
                </LuxuryCard>
              ))}
            </View>
          </View>
        )}

        {/* TAB 3: BENGKEL REKANAN & DEREK */}
        {activeTab === 'workshops' && (
          <View>
            <Text style={styles.sectionHeaderTitle}>Bengkel Rekanan & Towing Flatdeck</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Daftar bengkel spesialis Mercedes-Benz terpercaya dan jasa derek gendong rekanan komunitas.
            </Text>

            {/* Region Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroll}>
              {['Semua', 'Jabodetabek', 'Jawa Barat', 'Jateng & DIY', 'Jawa Timur & Bali', 'Sumatera'].map(
                (reg) => {
                  const isSel = selectedRegion === reg;
                  return (
                    <Pressable
                      key={reg}
                      onPress={() => setSelectedRegion(reg)}
                      style={[styles.regionPill, isSel && styles.regionPillActive]}
                    >
                      <Text style={[styles.regionPillText, isSel && styles.regionPillTextActive]}>
                        {reg}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            {/* Workshop Cards */}
            <View style={styles.workshopsList}>
              {filteredWorkshops.map((w) => (
                <LuxuryCard key={w.name} variant="default" style={styles.workshopCard}>
                  <View style={styles.workshopHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.workshopBadgeRow}>
                        <Text style={styles.workshopRegionBadge}>{w.region}</Text>
                        {w.is24h && <Text style={styles.workshop24Badge}>24 JAM DEREK</Text>}
                      </View>
                      <Text style={styles.workshopName}>{w.name}</Text>
                      <View style={styles.workshopCityRow}>
                        <Ionicons name="location-outline" size={13} color={Colors.text.tertiary} />
                        <Text style={styles.workshopCity}>{w.kota}</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => handleCall(w.phone)}
                      style={styles.workshopCallBtn}
                    >
                      <Ionicons name="call" size={16} color="#000" />
                      <Text style={styles.workshopCallBtnText}>Hubungi</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.workshopDesc}>{w.desc}</Text>
                </LuxuryCard>
              ))}
            </View>
          </View>
        )}

        {/* TAB 4: PANDUAN CEPAT DARURAT */}
        {activeTab === 'tips' && (
          <View>
            <Text style={styles.sectionHeaderTitle}>Panduan Darurat Mercedes-Benz</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Prosedur keselamatan dan tips penanganan awal saat mengalami kendala teknis di jalan raya.
            </Text>

            <View style={styles.tipsList}>
              {QUICK_TIPS.map((tip) => (
                <LuxuryCard key={tip.title} variant="gold" style={styles.tipCard}>
                  <View style={styles.tipHeader}>
                    <View style={styles.tipIconRing}>
                      <Ionicons name={tip.icon as any} size={20} color={Colors.brand.gold} />
                    </View>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                  </View>
                  <Text style={styles.tipContent}>{tip.content}</Text>
                </LuxuryCard>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0D0E12',
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emergencyLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  headerTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  quickCallTollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  quickCallTollText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#121318',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#EF4444',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: '#EF4444',
  },

  content: {
    padding: Spacing.base,
  },

  // Hero Alert
  heroAlertBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: 12,
    alignItems: 'flex-start',
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: '#F87171',
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 12,
    color: '#E4E4E7',
    lineHeight: 18,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.secondary,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 10,
  },

  // Types Grid
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  typeCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17181F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  typeCardSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  typeCardText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
    flex: 1,
  },
  typeCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // GPS Card
  gpsCard: {
    marginBottom: Spacing.md,
    padding: Spacing.base,
  },
  gpsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  gpsCoordsText: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  gpsRefreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  locationInput: {
    backgroundColor: '#121318',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 12,
  },

  notesInput: {
    backgroundColor: '#17181F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },

  // SOS Dispatch Button
  sosDispatchBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: Spacing.md,
  },
  sosPulseRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosDispatchBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  sosDispatchBtnSubtitle: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },

  memberIdentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.sm,
  },
  memberIdentText: {
    fontSize: 11,
    color: Colors.text.tertiary,
    flex: 1,
    lineHeight: 16,
  },

  // Contacts Tab
  sectionHeaderTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  sectionHeaderSubtitle: {
    fontSize: Typography.sm,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base,
    lineHeight: 20,
  },
  contactsList: {
    gap: 10,
  },
  contactCard: {
    padding: Spacing.base,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  contactBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.brand.gold,
    letterSpacing: 0.5,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  contactDesc: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  contactNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E7',
    marginTop: 4,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    gap: 4,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },

  // Workshops Tab
  regionScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
  },
  regionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#17181F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  regionPillActive: {
    backgroundColor: Colors.brand.gold,
    borderColor: Colors.brand.gold,
  },
  regionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  regionPillTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  workshopsList: {
    gap: 12,
  },
  workshopCard: {
    padding: Spacing.base,
  },
  workshopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  workshopBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  workshopRegionBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.brand.gold,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  workshop24Badge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  workshopName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  workshopCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  workshopCity: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  workshopDesc: {
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  workshopCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.gold,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 4,
  },
  workshopCallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },

  // Tips Tab
  tipsList: {
    gap: 12,
  },
  tipCard: {
    padding: Spacing.base,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  tipIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  tipContent: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});
