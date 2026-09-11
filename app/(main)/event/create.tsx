// ============================================================
// Proposal Event & Tambah Event Baru
// Mercedes-Benz Club Indonesia
// Sesuai Spesifikasi M6 Engine & Formulir Identitas Event + PIC
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Alert,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../src/services/supabase';
import { eventService } from '../../../src/services/eventService';
import { useAuth } from '../../../src/hooks/useAuth';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { CLUB_CHAPTERS } from '../../../src/constants/chapters';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../../src/constants/theme';

const DEFAULT_BANNER = require('../../../assets/images/hero-gwagon.jpg');
const JAMNAS_BANNER = require('../../../assets/images/jamnas-xxi-press-conf.png');
const DEFAULT_BANNER_URI = 'assets/images/jamnas-xxi-press-conf.png';

type EventCategory = 'nasional' | 'chapter' | 'online';

// Kategori / Cakupan Event
const EVENT_CATEGORIES = [
  {
    value: 'nasional' as EventCategory,
    label: 'Nasional',
    desc: 'Skala Nasional',
    icon: 'globe-outline',
  },
  {
    value: 'chapter' as EventCategory,
    label: 'Chapter',
    desc: 'Regional / Chapter',
    icon: 'business-outline',
  },
  {
    value: 'online' as EventCategory,
    label: 'Online',
    desc: 'Webinar & Virtual',
    icon: 'videocam-outline',
  },
];

// Format / Tipe Kegiatan
const EVENT_TYPES = [
  { value: 'RIDE', label: 'TOURING / RIDE', icon: 'car-sport-outline' },
  { value: 'JAMBORE', label: 'JAMBORE NASIONAL', icon: 'ribbon-outline' },
  { value: 'MEETING', label: 'MEETING / RAKERNAS', icon: 'business-outline' },
  { value: 'CHARITY', label: 'CHARITY / BAKTI SOSIAL', icon: 'heart-outline' },
  { value: 'GATHERING', label: 'GATHERING / SILATURAHMI', icon: 'people-outline' },
  { value: 'TRACKDAY', label: 'TRACK DAY / MOTORSPORT', icon: 'speedometer-outline' },
];

export default function CreateEventScreen() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  // ── State Form ──────────────────────────────────────────────
  const [eventCode, setEventCode] = useState('EVT-2026-001');
  const [title, setTitle] = useState('Konferensi Pers Jamnas XXI & 22nd Anniversary MB Club INA');
  const [category, setCategory] = useState<EventCategory>('nasional');
  const [eventChapter, setEventChapter] = useState('MBC Jakarta');
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('');
  const [selectedType, setSelectedType] = useState('MEETING');
  const [venue, setVenue] = useState('Top Golf Fatmawati');
  const [city, setCity] = useState('Jakarta Selatan');
  const [locationUrl, setLocationUrl] = useState('https://maps.google.com/?q=Top+Golf+Fatmawati');
  const [description, setDescription] = useState(
    'Konferensi Pers Jambore Nasional XXI & 22nd Anniversary Mercedes-Benz Club Indonesia di Top Golf Fatmawati. Pukul 14.00 - 17.00 WIB (Pendaftaran 13.30 WIB).'
  );
  const [startDate, setStartDate] = useState('05/09/2026 14:00');
  const [endDate, setEndDate] = useState('05/09/2026 17:00');
  const [capacity, setCapacity] = useState('100');
  const [bannerPath, setBannerPath] = useState(DEFAULT_BANNER_URI);
  const [bannerLocalUri, setBannerLocalUri] = useState<string | null>(null);

  // ── Date/Time Picker Modal State ─────────────────────────────
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end'>('start');
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(8); // 0-indexed (8 = September)
  const [pickerDay, setPickerDay] = useState(13);
  const [pickerHour, setPickerHour] = useState('08');
  const [pickerMinute, setPickerMinute] = useState('00');

  // ── State PIC (Person In Charge) ─────────────────────────────
  const [picName, setPicName] = useState('Derist Touriano');
  const [picPhone, setPicPhone] = useState('0812-3456-7890');
  const [picClub, setPicClub] = useState('MBC Palembang');
  const [picRole, setPicRole] = useState('Ketua Panitia Pelaksana / PIC Event');

  // ── Modal State ─────────────────────────────────────────────
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [clubModalVisible, setClubModalVisible] = useState(false);
  const [clubPickerTarget, setClubPickerTarget] = useState<'pic' | 'chapter'>('pic');
  const [clubSearch, setClubSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    title: string;
    eventCode: string;
    status: 'PUBLISHED' | 'DRAFT';
  }>({
    visible: false,
    title: '',
    eventCode: '',
    status: 'DRAFT',
  });

  const numCapacity = Math.max(1, parseInt(capacity, 10) || 1);

  // Filter Club/Chapter Modal
  const filteredClubs = useMemo(() => {
    const q = clubSearch.toLowerCase().trim();
    if (!q) return CLUB_CHAPTERS;
    return CLUB_CHAPTERS.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        c.kode.toLowerCase().includes(q) ||
        c.kota.toLowerCase().includes(q)
    );
  }, [clubSearch]);

  // ── Handler Upload Gambar ────────────────────────────────────
  const handleUploadBanner = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Galeri Diperlukan', 'Mohon izinkan akses galeri untuk memilih banner event.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const asset = result.assets[0];
        setBannerLocalUri(asset.uri);
        const filename = asset.fileName || asset.uri.split('/').pop() || 'banner_event.jpg';
        setBannerPath(`assets/${filename}`);
      }
    } catch (err: any) {
      Alert.alert('Gagal Membuka Gambar', err.message || 'Terjadi kesalahan.');
    }
  };

  const handleResetBanner = () => {
    setBannerLocalUri(null);
    setBannerPath(DEFAULT_BANNER_URI);
  };

  // ── Handler Kalender & Waktu ────────────────────────────────
  const openDatePicker = (target: 'start' | 'end') => {
    setDatePickerTarget(target);
    const currentValue = target === 'start' ? startDate : endDate;
    try {
      const [dPart, tPart] = currentValue.split(' ');
      if (dPart) {
        const [d, m, y] = dPart.split('/').map(Number);
        if (d && m && y) {
          setPickerDay(d);
          setPickerMonth(m - 1);
          setPickerYear(y);
        }
      }
      if (tPart) {
        const [hh, mm] = tPart.split(':');
        if (hh) setPickerHour(hh.padStart(2, '0'));
        if (mm) setPickerMinute(mm.padStart(2, '0'));
      }
    } catch {
      // default
    }
    setDatePickerVisible(true);
  };

  const applyDatePicker = () => {
    const dStr = String(pickerDay).padStart(2, '0');
    const mStr = String(pickerMonth + 1).padStart(2, '0');
    const yStr = String(pickerYear);
    const hStr = pickerHour.padStart(2, '0');
    const minStr = pickerMinute.padStart(2, '0');
    const formatted = `${dStr}/${mStr}/${yStr} ${hStr}:${minStr}`;

    if (datePickerTarget === 'start') {
      setStartDate(formatted);
    } else {
      setEndDate(formatted);
    }
    setDatePickerVisible(false);
  };

  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Hitung jumlah hari dalam bulan terpilih & offset hari pertama
  const calendarDays = useMemo(() => {
    const totalDays = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const firstDayIndex = new Date(pickerYear, pickerMonth, 1).getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  }, [pickerYear, pickerMonth]);

  const prevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  };

  // ── Parse Tanggal ke Format ISO ─────────────────────────────
  const parseDateToISO = (dateStr: string): string => {
    try {
      // Contoh input: "13/09/2026 08:00"
      const [datePart, timePart] = dateStr.split(' ');
      if (datePart && timePart) {
        const [day, month, year] = datePart.split('/');
        return new Date(`${year}-${month}-${day}T${timePart}:00`).toISOString();
      }
    } catch {
      // Fallback
    }
    return new Date().toISOString();
  };

  // ── Handler Submit ──────────────────────────────────────────
  const handleSubmit = async (status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') => {
    if (!title.trim()) {
      Alert.alert('Form Belum Lengkap', 'Judul Event wajib diisi.');
      return;
    }
    if (!picName.trim()) {
      Alert.alert('Form Belum Lengkap', 'Nama Lengkap PIC wajib diisi.');
      return;
    }
    if (!picPhone.trim()) {
      Alert.alert('Form Belum Lengkap', 'Nomor WhatsApp / Telepon PIC wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const startDateIso = parseDateToISO(startDate);
      const endDateIso = parseDateToISO(endDate);

      const fullLocation = category === 'online'
        ? (city.trim() || 'Online / Virtual Platform')
        : (venue.trim() ? (city.trim() ? `${venue.trim()}, ${city.trim()}` : venue.trim()) : city.trim());

      const eventPayload = {
        id: eventCode,
        event_code: eventCode,
        title: title.trim(),
        type: category,
        chapter: category === 'chapter' ? eventChapter : (category === 'nasional' ? 'Pengurus Pusat MB INA' : null),
        location: fullLocation,
        location_url: category === 'online' ? (onlineMeetingUrl.trim() || null) : (locationUrl.trim() || null),
        description: description.trim(),
        start_date: startDateIso,
        end_date: endDateIso,
        max_participants: numCapacity,
        thumbnail_url: bannerLocalUri || bannerPath,
        pic_name: picName.trim(),
        pic_phone: picPhone.trim(),
        pic_club: picClub.trim(),
        pic_role: picRole.trim(),
        status: status === 'PUBLISHED' ? 'upcoming' : 'draft',
      };

      await eventService.saveEvent(eventPayload);

      setSuccessModal({
        visible: true,
        title: title.trim(),
        eventCode: eventCode,
        status,
      });
    } catch (err: any) {
      Alert.alert('Gagal Menyimpan Event', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentType = EVENT_TYPES.find((t) => t.value === selectedType) || EVENT_TYPES[0];

  // Proteksi Keamanan: Hanya Pengurus / Admin yang boleh mengakses form pembuatan event
  if (!authLoading && !isAdmin) {
    return (
      <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(197, 160, 89, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(197, 160, 89, 0.25)' }}>
            <Ionicons name="shield-outline" size={32} color="#C5A059" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
            Akses Khusus Pengurus
          </Text>
          <Text style={{ fontSize: 14, color: '#A1A1AA', textAlign: 'center', lineHeight: 20, maxWidth: 320 }}>
            Halaman pembuatan proposal kegiatan dan penambahan event hanya dapat diakses oleh Pengurus atau Administrator Mercedes-Benz Club Indonesia.
          </Text>
          <Pressable
            onPress={() => router.replace('/(main)/event')}
            style={{ marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#3F3F46' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#E4E4E7' }}>Kembali ke Kalender Event</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#F4F4F5" />
        </Pressable>
        <Text style={styles.topBarTitle}>Proposal Event</Text>
        <View style={styles.codePill}>
          <Text style={styles.codePillText}>{eventCode}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Subtitle */}
        <View style={styles.introBox}>
          <Text style={styles.introTitle}>Proposal Event</Text>
          <Text style={styles.introSubtitle}>
            Tujuan: Admin memasukkan seluruh data dasar event (identitas, jadwal, lokasi, kapasitas, dan kontak PIC) untuk agenda resmi Mercedes-Benz Club Indonesia.
          </Text>
        </View>

        {/* Kode Event Card */}
        <View style={styles.codeCard}>
          <View style={styles.codeCardLeft}>
            <View style={styles.codeBadge}>
              <Ionicons name="key-outline" size={12} color="#C5A059" />
              <Text style={styles.codeBadgeText}>KODE EVENT RESMI</Text>
            </View>
            <Text style={styles.codeTitle}>{eventCode}</Text>
          </View>
          <Pressable
            onPress={() => {
              const randNum = Math.floor(Math.random() * 900) + 100;
              setEventCode(`EVT-2026-${randNum}`);
            }}
            style={styles.refreshCodeBtn}
          >
            <Ionicons name="refresh" size={14} color="#D4D4D8" />
            <Text style={styles.refreshCodeText}>Generate</Text>
          </Pressable>
        </View>

        {/* ============================================================ */}
        {/* 1️⃣ FORM INPUT IDENTITAS EVENT                                */}
        {/* ============================================================ */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardHeaderTitle}>1️⃣ Form Input Identitas Event</Text>

          {/* Judul Event * */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Judul Event *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="contoh: Touring & Bakti Sosial MB INA - Yogyakarta 2026"
              placeholderTextColor="#52525B"
            />
          </View>

          {/* Kategori / Cakupan Event (Nasional, Chapter, Online) */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.fieldLabel}>Kategori / Cakupan Event *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#C5A059' }} />
                <Text style={{ fontSize: 11, color: '#C5A059', fontWeight: '700', letterSpacing: 0.5 }}>
                  {category.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.categoryRow}>
              {EVENT_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => {
                      setCategory(cat.value);
                      if (cat.value === 'online') {
                        if (!city || city === 'Yogyakarta' || city === 'Jakarta') {
                          setCity('Online / Virtual Platform');
                        }
                      } else if (city === 'Online / Virtual Platform') {
                        setCity('Jakarta');
                      }
                    }}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardActive,
                    ]}
                  >
                    <View style={[styles.categoryIconWrap, isSelected && styles.categoryIconWrapActive]}>
                      <Ionicons
                        name={cat.icon as any}
                        size={17}
                        color={isSelected ? '#111111' : '#A1A1AA'}
                      />
                    </View>
                    <Text style={[styles.categoryTitle, isSelected && styles.categoryTitleActive]}>
                      {cat.label}
                    </Text>
                    <Text style={[styles.categorySubtitle, isSelected && styles.categorySubtitleActive]} numberOfLines={1}>
                      {cat.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Jika Kategori CHAPTER: Pilih Chapter Penyelenggara */}
          {category === 'chapter' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Chapter / Club Penyelenggara *</Text>
              <Pressable
                onPress={() => {
                  setClubPickerTarget('chapter');
                  setClubModalVisible(true);
                }}
                style={styles.selectTrigger}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(197, 160, 89, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="business-outline" size={15} color="#C5A059" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectTriggerText} numberOfLines={1}>
                      {eventChapter}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#71717A' }}>
                      Penyelenggara Resmi Kegiatan
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={16} color="#A1A1AA" />
              </Pressable>
            </View>
          )}

          {/* Jika Kategori ONLINE: Link Meeting / Platform Virtual */}
          {category === 'online' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Link Meeting / Platform Virtual (Opsional)</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.inputFlex}
                  value={onlineMeetingUrl}
                  onChangeText={setOnlineMeetingUrl}
                  placeholder="https://zoom.us/j/... atau Google Meet link"
                  placeholderTextColor="#52525B"
                  autoCapitalize="none"
                />
                <Ionicons name="videocam-outline" size={16} color="#C5A059" />
              </View>
            </View>
          )}

          {/* Format Kegiatan * */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Format Kegiatan *</Text>
            <Pressable
              onPress={() => setTypeModalVisible(true)}
              style={styles.selectTrigger}
            >
              <Text style={styles.selectTriggerText} numberOfLines={1}>
                {currentType.label}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#A1A1AA" />
            </Pressable>
          </View>

          {/* Grid 2 Kolom: Lokasi Event (Venue) & Kota */}
          <View style={styles.grid2}>
            {/* Lokasi Event (Venue) * */}
            <View style={[styles.fieldGroup, { flex: 1.4 }]}>
              <Text style={styles.fieldLabel}>
                {category === 'online' ? 'Media / Platform *' : 'Lokasi Event *'}
              </Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.inputFlex}
                  value={venue}
                  onChangeText={setVenue}
                  placeholder={category === 'online' ? 'Zoom / Google Meet' : 'Top Golf Fatmawati'}
                  placeholderTextColor="#52525B"
                />
                <Ionicons
                  name={category === 'online' ? 'videocam-outline' : 'business-outline'}
                  size={16}
                  color="#C5A059"
                />
              </View>
            </View>

            {/* Kota / Wilayah * */}
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Kota / Wilayah *</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder={category === 'online' ? 'Online' : 'Jakarta Selatan'}
                placeholderTextColor="#52525B"
              />
            </View>
          </View>

          {/* Tautan Google Maps Lokasi (Opsional) */}
          {category !== 'online' && (
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Tautan Google Maps Lokasi (Opsional)</Text>
                {locationUrl ? (
                  <Pressable onPress={() => Linking.openURL(locationUrl)}>
                    <Text style={{ fontSize: 11, color: '#38BDF8', fontWeight: '600' }}>Uji Buka Peta ↗</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.inputFlex}
                  value={locationUrl}
                  onChangeText={setLocationUrl}
                  placeholder="https://maps.google.com/?q=Top+Golf+Fatmawati"
                  placeholderTextColor="#52525B"
                  autoCapitalize="none"
                />
                <Ionicons name="map-outline" size={16} color="#C5A059" />
              </View>
            </View>
          )}

          {/* Deskripsi Event * */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Deskripsi Event *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Detail rute, tujuan kegiatan, dan acara..."
              placeholderTextColor="#52525B"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Grid 2 Kolom: Tanggal Mulai & Selesai */}
          <View style={styles.grid2}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Tanggal & Waktu Mulai *</Text>
              <Pressable 
                onPress={() => openDatePicker('start')}
                style={styles.inputWithIcon}
              >
                <TextInput
                  style={styles.inputFlex}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="13/09/2026 08:00"
                  placeholderTextColor="#52525B"
                />
                <Pressable
                  onPress={() => openDatePicker('start')}
                  style={{ padding: 4, borderRadius: 6, backgroundColor: 'rgba(197, 160, 89, 0.12)' }}
                  hitSlop={8}
                >
                  <Ionicons name="calendar-outline" size={17} color="#C5A059" />
                </Pressable>
              </Pressable>
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Tanggal & Waktu Selesai *</Text>
              <Pressable 
                onPress={() => openDatePicker('end')}
                style={styles.inputWithIcon}
              >
                <TextInput
                  style={styles.inputFlex}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="14/09/2026 18:00"
                  placeholderTextColor="#52525B"
                />
                <Pressable
                  onPress={() => openDatePicker('end')}
                  style={{ padding: 4, borderRadius: 6, backgroundColor: 'rgba(197, 160, 89, 0.12)' }}
                  hitSlop={8}
                >
                  <Ionicons name="calendar-outline" size={17} color="#C5A059" />
                </Pressable>
              </Pressable>
            </View>
          </View>

          {/* Kapasitas Peserta * */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Kapasitas Peserta *</Text>
            <TextInput
              style={styles.input}
              value={capacity}
              onChangeText={setCapacity}
              placeholder="150"
              placeholderTextColor="#52525B"
              keyboardType="number-pad"
            />
          </View>

          {/* Banner Image Event (Opsional) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithBadgeRow}>
              <Text style={styles.fieldLabel}>Banner Image Event (Opsional)</Text>
              <Text style={styles.formatBadge}>Format: JPG, PNG, WEBP</Text>
            </View>

            <View style={styles.bannerDashedBox}>
              <View style={styles.bannerPreviewFrame}>
                <Image
                  source={
                    bannerLocalUri
                      ? { uri: bannerLocalUri }
                      : JAMNAS_BANNER
                  }
                  style={styles.bannerPreviewImg}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.bannerActionCol}>
                <TextInput
                  style={styles.bannerPathInput}
                  value={bannerPath}
                  onChangeText={setBannerPath}
                  placeholder="URL Gambar atau path"
                  placeholderTextColor="#52525B"
                />

                <View style={styles.bannerBtnRow}>
                  <Pressable
                    onPress={handleUploadBanner}
                    style={styles.uploadBtn}
                  >
                    <Ionicons name="folder-open-outline" size={14} color="#111111" />
                    <Text style={styles.uploadBtnText}>Upload Gambar</Text>
                  </Pressable>

                  {bannerLocalUri && (
                    <Pressable
                      onPress={handleResetBanner}
                      style={styles.resetBtn}
                    >
                      <Ionicons name="trash-outline" size={13} color="#EF4444" />
                      <Text style={[styles.resetBtnText, { color: '#EF4444' }]}>Hapus</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2️⃣ PENANGGUNG JAWAB (PIC) & KONTAK PANITIA                   */}
        {/* (FITUR SPESIFIK YANG DITAMBAHKAN SESUAI PERMINTAAN USER)     */}
        {/* ============================================================ */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardHeaderTitle}>2️⃣ Penanggung Jawab (PIC) & Kontak Panitia</Text>

          {/* Nama Lengkap PIC * */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nama Lengkap PIC *</Text>
            <TextInput
              style={styles.input}
              value={picName}
              onChangeText={setPicName}
              placeholder="contoh: Derist Touriano"
              placeholderTextColor="#52525B"
            />
          </View>

          {/* No. WhatsApp / Telepon PIC * */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>No. WhatsApp / Telepon PIC *</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="logo-whatsapp" size={16} color="#34D399" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.inputFlex}
                value={picPhone}
                onChangeText={setPicPhone}
                placeholder="0812-3456-7890"
                placeholderTextColor="#52525B"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Klub / Chapter Asal PIC * */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Klub / Chapter Asal PIC *</Text>
            <Pressable
              onPress={() => {
                setClubPickerTarget('pic');
                setClubModalVisible(true);
              }}
              style={styles.selectTrigger}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-outline" size={16} color="#C5A059" />
                <Text style={styles.selectTriggerText} numberOfLines={1}>
                  {picClub || 'Pilih Club / Chapter'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#A1A1AA" />
            </Pressable>
          </View>

          {/* Jabatan / Peran Kepanitiaan */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Peran / Jabatan Kepanitiaan</Text>
            <TextInput
              style={styles.input}
              value={picRole}
              onChangeText={setPicRole}
              placeholder="contoh: Ketua Panitia Pelaksana / PIC Event"
              placeholderTextColor="#52525B"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Pressable
            onPress={() => handleSubmit('PUBLISHED')}
            disabled={submitting}
            style={[styles.submitPrimaryBtn, submitting && { opacity: 0.7 }]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#111111" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="#111111" />
                <Text style={styles.submitPrimaryBtnText}>Simpan & Publikasikan Event</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleSubmit('DRAFT')}
            disabled={submitting}
            style={styles.submitDraftBtn}
          >
            <Ionicons name="save-outline" size={18} color="#D4D4D8" />
            <Text style={styles.submitDraftBtnText}>Simpan Sebagai Draft</Text>
          </Pressable>
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* ── Modal Tipe Kegiatan ──────────────────────────────────── */}
      <Modal
        visible={typeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTypeModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Format Kegiatan</Text>
              <Pressable onPress={() => setTypeModalVisible(false)}>
                <Ionicons name="close" size={20} color="#A1A1AA" />
              </Pressable>
            </View>

            {EVENT_TYPES.map((t) => {
              const isSelected = selectedType === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    setSelectedType(t.value);
                    setTypeModalVisible(false);
                  }}
                  style={[styles.modalOptionRow, isSelected && styles.modalOptionRowSelected]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons
                      name={t.icon as any}
                      size={18}
                      color={isSelected ? '#C5A059' : '#A1A1AA'}
                    />
                    <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                      {t.label}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#C5A059" />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── Modal Pilih Klub / Chapter ───────────────────────────── */}
      <Modal
        visible={clubModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClubModalVisible(false)}
      >
        <View style={styles.modalOverlayBottom}>
          <View style={styles.modalBottomCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {clubPickerTarget === 'chapter'
                    ? 'Pilih Chapter Penyelenggara'
                    : 'Pilih Asal Klub / Chapter PIC'}
                </Text>
                <Text style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>
                  110 Club & Chapter Resmi MB Club INA
                </Text>
              </View>
              <Pressable onPress={() => setClubModalVisible(false)}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={16} color="#71717A" />
              <TextInput
                style={styles.modalSearchInput}
                value={clubSearch}
                onChangeText={setClubSearch}
                placeholder="Cari klub, kode, atau kota domisili..."
                placeholderTextColor="#71717A"
              />
            </View>

            <FlatList
              data={filteredClubs}
              keyExtractor={(item) => item.kode}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => {
                const isSelected =
                  (clubPickerTarget === 'chapter' ? eventChapter : picClub) === item.nama;
                return (
                  <Pressable
                    onPress={() => {
                      if (clubPickerTarget === 'chapter') {
                        setEventChapter(item.nama);
                        if (!city || city === 'Yogyakarta') {
                          setCity(item.kota);
                        }
                      } else {
                        setPicClub(item.nama);
                      }
                      setClubModalVisible(false);
                    }}
                    style={[styles.clubListRow, isSelected && styles.clubListRowSelected]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.clubListName, isSelected && { color: '#C5A059' }]}>
                        {item.nama}
                      </Text>
                      <Text style={styles.clubListSub}>
                        {item.kode} • {item.kota} ({item.region})
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#C5A059" />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Modal Notifikasi Berhasil (Web & Native Compatible) ── */}
      <Modal
        visible={successModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModal((s) => ({ ...s, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="shield-checkmark" size={36} color="#C5A059" />
            </View>

            <Text style={styles.successModalTitle}>
              {successModal.status === 'PUBLISHED'
                ? 'Event Berhasil Dipublikasikan! ⭐'
                : 'Proposal Berhasil Disimpan Sebagai Draft! 💾'}
            </Text>

            <Text style={styles.successModalDesc}>
              {successModal.status === 'PUBLISHED'
                ? `Event "${successModal.title}" (${successModal.eventCode}) kini telah aktif dan dapat dilihat oleh seluruh anggota di kalender event.`
                : `Proposal event "${successModal.title}" (${successModal.eventCode}) berhasil disimpan sebagai draft panitia dan dapat ditinjau serta dipublikasikan di Dashboard Admin.`}
            </Text>

            <View style={styles.successEventPill}>
              <Text style={styles.successEventCode}>{successModal.eventCode}</Text>
              <Text style={styles.successEventTitle} numberOfLines={1}>
                {successModal.title}
              </Text>
            </View>

            <View style={styles.successModalButtons}>
              <Pressable
                onPress={() => {
                  setSuccessModal((s) => ({ ...s, visible: false }));
                  if (successModal.status === 'PUBLISHED') {
                    router.replace('/(main)/event' as any);
                  } else {
                    router.replace('/(main)/admin' as any);
                  }
                }}
                style={styles.successPrimaryBtn}
              >
                <Text style={styles.successPrimaryBtnText}>
                  {successModal.status === 'PUBLISHED'
                    ? 'Lihat di Kalender Event →'
                    : 'Buka Dashboard Admin →'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setSuccessModal((s) => ({ ...s, visible: false }));
                  const randNum = Math.floor(Math.random() * 900) + 100;
                  setEventCode(`EVT-2026-${randNum}`);
                  setTitle('');
                  setDescription('');
                }}
                style={styles.successSecondaryBtn}
              >
                <Text style={styles.successSecondaryBtnText}>Buat Proposal Lain</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal Kalender & Waktu Interaktif (Date & Time Picker) ── */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerCard}>
            {/* Header Modal */}
            <View style={styles.datePickerHeader}>
              <View>
                <Text style={styles.datePickerModalTitle}>
                  {datePickerTarget === 'start' ? 'Pilih Waktu Mulai Event' : 'Pilih Waktu Selesai Event'}
                </Text>
                <Text style={styles.datePickerModalSubtitle}>
                  Format: DD/MM/YYYY HH:mm WIB
                </Text>
              </View>
              <Pressable
                onPress={() => setDatePickerVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#A1A1AA" />
              </Pressable>
            </View>

            {/* Navigasi Bulan & Tahun */}
            <View style={styles.calendarMonthBar}>
              <Pressable onPress={prevMonth} style={styles.monthNavBtn} hitSlop={10}>
                <Ionicons name="chevron-back" size={18} color="#C5A059" />
              </Pressable>
              <Text style={styles.calendarMonthTitle}>
                {MONTH_NAMES[pickerMonth]} {pickerYear}
              </Text>
              <Pressable onPress={nextMonth} style={styles.monthNavBtn} hitSlop={10}>
                <Ionicons name="chevron-forward" size={18} color="#C5A059" />
              </Pressable>
            </View>

            {/* Bar Hari Singkat */}
            <View style={styles.calendarDaysHeader}>
              {DAYS_SHORT.map((day, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.calendarDayColText,
                    idx === 0 && { color: '#EF4444' }, // Minggu merah
                  ]}
                >
                  {day}
                </Text>
              ))}
            </View>

            {/* Grid Tanggal */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <View key={`empty-${idx}`} style={styles.calendarCell} />;
                }
                const isSelected = dayNum === pickerDay;
                return (
                  <Pressable
                    key={`day-${dayNum}`}
                    onPress={() => setPickerDay(dayNum)}
                    style={[
                      styles.calendarCell,
                      isSelected && styles.calendarCellActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarCellText,
                        isSelected && styles.calendarCellTextActive,
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Pemilihan Jam & Menit */}
            <View style={styles.timePickerContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={16} color="#C5A059" />
                <Text style={styles.timePickerLabel}>Waktu (24 Jam):</Text>
              </View>

              <View style={styles.timeInputGroup}>
                <TextInput
                  style={styles.timeInput}
                  value={pickerHour}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '').slice(0, 2);
                    setPickerHour(clean);
                  }}
                  onBlur={() => {
                    let num = parseInt(pickerHour, 10);
                    if (isNaN(num) || num < 0) num = 0;
                    if (num > 23) num = 23;
                    setPickerHour(String(num).padStart(2, '0'));
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="08"
                  placeholderTextColor="#52525B"
                />
                <Text style={styles.timeColon}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={pickerMinute}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '').slice(0, 2);
                    setPickerMinute(clean);
                  }}
                  onBlur={() => {
                    let num = parseInt(pickerMinute, 10);
                    if (isNaN(num) || num < 0) num = 0;
                    if (num > 59) num = 59;
                    setPickerMinute(String(num).padStart(2, '0'));
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor="#52525B"
                />
                <Text style={styles.timeZoneBadge}>WIB</Text>
              </View>
            </View>

            {/* Ringkasan & Tombol Aksi */}
            <View style={styles.datePickerFooter}>
              <View style={styles.selectedDateBadge}>
                <Text style={styles.selectedDateBadgeText}>
                  {String(pickerDay).padStart(2, '0')} {MONTH_NAMES[pickerMonth]} {pickerYear}, {pickerHour.padStart(2, '0')}:{pickerMinute.padStart(2, '0')} WIB
                </Text>
              </View>

              <View style={styles.datePickerActionRow}>
                <Pressable
                  onPress={() => setDatePickerVisible(false)}
                  style={styles.datePickerCancelBtn}
                >
                  <Text style={styles.datePickerCancelBtnText}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={applyDatePicker}
                  style={styles.datePickerApplyBtn}
                >
                  <Ionicons name="checkmark" size={16} color="#111111" />
                  <Text style={styles.datePickerApplyBtnText}>Pilih & Terapkan</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39, 39, 42, 0.8)',
    backgroundColor: '#090A0C',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  codePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
  },
  codePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C5A059',
    letterSpacing: 0.5,
  },

  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },

  introBox: {
    marginBottom: 4,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C5A059',
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 12,
    color: '#A1A1AA',
    lineHeight: 18,
  },

  // Kode Event Card
  codeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 19, 23, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    borderRadius: 14,
    padding: 14,
  },
  codeCardLeft: {
    gap: 4,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C5A059',
    letterSpacing: 0.8,
  },
  codeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  refreshCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  refreshCodeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#D4D4D8',
  },

  // Card Containers
  cardContainer: {
    backgroundColor: 'rgba(18, 19, 23, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.85)',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  cardHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#C5A059',
    marginBottom: 4,
  },

  // Form Fields
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E4E4E7',
  },

  // Kategori Event
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  categoryCardActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderColor: '#C5A059',
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  categoryIconWrapActive: {
    backgroundColor: '#C5A059',
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D4D4D8',
  },
  categoryTitleActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  categorySubtitle: {
    fontSize: 9.5,
    color: '#71717A',
    textAlign: 'center',
  },
  categorySubtitleActive: {
    color: '#C5A059',
  },

  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
  textarea: {
    minHeight: 76,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputFlex: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    padding: 0,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectTriggerText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Banner Box
  labelWithBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formatBadge: {
    fontSize: 10.5,
    color: '#71717A',
  },
  bannerDashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(197, 160, 89, 0.4)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    gap: 12,
  },
  bannerPreviewFrame: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#111111',
  },
  bannerPreviewImg: {
    width: '100%',
    height: '100%',
  },
  bannerActionCol: {
    gap: 8,
  },
  bannerPathInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11.5,
    color: '#A1A1AA',
  },
  bannerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C5A059',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  uploadBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#111111',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  resetBtnText: {
    fontSize: 11.5,
    color: '#D4D4D8',
  },

  // Actions
  actionContainer: {
    gap: 10,
    marginTop: 6,
  },
  submitPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C5A059',
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#C5A059',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  submitPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.5,
  },
  submitDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingVertical: 13,
  },
  submitDraftBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4D4D8',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#121317',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  modalBottomCard: {
    width: '100%',
    backgroundColor: '#121317',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalOptionRowSelected: {
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
  },
  modalOptionText: {
    fontSize: 13,
    color: '#D4D4D8',
  },
  modalOptionTextSelected: {
    color: '#C5A059',
    fontWeight: '700',
  },

  // Club search in modal
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#FFFFFF',
    padding: 0,
  },
  clubListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  clubListRowSelected: {
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
  },
  clubListName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clubListSub: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },

  // Success Modal
  successModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#121316',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  successIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  successModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successModalDesc: {
    fontSize: 12.5,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 18,
  },
  successEventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    marginTop: 4,
  },
  successEventCode: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#C5A059',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  successEventTitle: {
    flex: 1,
    fontSize: 12,
    color: '#E4E4E7',
    fontWeight: '600',
  },
  successModalButtons: {
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  successPrimaryBtn: {
    backgroundColor: '#C5A059',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111111',
  },
  successSecondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successSecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#D4D4D8',
  },

  // ── Date Picker Styles ──────────────────────────────────────
  datePickerCard: {
    width: '92%',
    maxWidth: 390,
    backgroundColor: '#121316',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  datePickerModalSubtitle: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  calendarMonthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  calendarDayColText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#A1A1AA',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 4,
  },
  calendarCell: {
    width: '13%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarCellActive: {
    backgroundColor: '#C5A059',
  },
  calendarCellText: {
    fontSize: 13,
    color: '#E4E4E7',
    fontWeight: '500',
  },
  calendarCellTextActive: {
    color: '#111111',
    fontWeight: '800',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timePickerLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeInput: {
    width: 44,
    height: 36,
    backgroundColor: '#1C1D22',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C5A059',
  },
  timeZoneBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C5A059',
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  datePickerFooter: {
    gap: 12,
    marginTop: 6,
  },
  selectedDateBadge: {
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedDateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C5A059',
  },
  datePickerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  datePickerApplyBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#C5A059',
  },
  datePickerApplyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111111',
  },
});
