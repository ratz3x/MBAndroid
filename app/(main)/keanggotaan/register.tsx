// ============================================================
// Registrasi Keanggotaan — 1 Formulir Langsung (Single-Step)
// Format ID: MBINA-[KODE_PROVINSI]-[TAHUN]-[6_DIGIT_URUT]
// Mercedes-Benz Club Indonesia
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../src/context/AuthContext';
import { supabase } from '../../../src/services/supabase';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../../src/constants/theme';
import { CLUB_CHAPTERS, ClubChapter } from '../../../src/constants/chapters';
import { PROVINCES, Province } from '../../../src/constants/provinces';

export default function KeanggotaanRegisterScreen() {
  const router = useRouter();
  const { user, profile: authProfile } = useAuth();

  // Form Fields
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [phone, setPhone] = useState(authProfile?.phone || '');
  const [city, setCity] = useState(authProfile?.city || '');
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedClub, setSelectedClub] = useState<ClubChapter | null>(null);

  const [carModel, setCarModel] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [notes, setNotes] = useState('');

  // Status & Member ID preview
  const [nextSeq, setNextSeq] = useState('000001');
  const [loading, setLoading] = useState(false);

  // Existing Member & Edit mode
  const [existingMember, setExistingMember] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Success Notification Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedMemberId, setSavedMemberId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Modals & Search
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [showClubModal, setShowClubModal] = useState(false);
  const [clubSearch, setClubSearch] = useState('');

  // Auto set province based on user's current profile if available
  useEffect(() => {
    if (authProfile?.province) {
      const match = PROVINCES.find(
        (p) => p.nama.toLowerCase() === authProfile.province?.toLowerCase()
      );
      if (match) setSelectedProvince(match);
    } else {
      const defaultProv = PROVINCES.find((p) => p.kode === 'JKT') || PROVINCES[10];
      setSelectedProvince(defaultProv);
    }
  }, [authProfile]);

  // Check if user already has member record (Edit Mode)
  useEffect(() => {
    async function checkExistingMember() {
      if (!user?.id) return;
      try {
        let memData: any = null;
        const { data: mem } = await (supabase
          .from('members') as any)
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mem) {
          memData = mem;
        } else {
          try {
            const cached = await AsyncStorage.getItem('mb_local_member_' + user.id);
            if (cached) memData = JSON.parse(cached);
          } catch {}
        }

        if (memData) {
          setExistingMember(memData);
          setIsEditMode(true);
          setSavedMemberId(memData.member_number || '');
          if (memData.car_model) setCarModel(memData.car_model);
          if (memData.car_plate) setCarPlate(memData.car_plate);
          if (memData.notes) setNotes(memData.notes);
          if (memData.ktp_url) setPhotoUri(memData.ktp_url);
          if (memData.chapter) {
            const match = CLUB_CHAPTERS.find(
              (c) => c.nama.toLowerCase() === memData.chapter.toLowerCase()
            );
            if (match) setSelectedClub(match);
          }
          if (memData.member_number) {
            const parts = memData.member_number.split('-');
            if (parts.length >= 2) {
              const provCode = parts[1];
              const matchProv = PROVINCES.find(
                (p) => p.kode.toUpperCase() === provCode.toUpperCase()
              );
              if (matchProv) setSelectedProvince(matchProv);
            }
          }
        }
      } catch (err) {
        console.warn('Error checking existing member:', err);
      }
    }
    checkExistingMember();
  }, [user?.id]);

  // Fetch current sequence number from Supabase
  useEffect(() => {
    async function fetchSequence() {
      try {
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true });
        const seq = String((count ?? 0) + 1).padStart(6, '0');
        setNextSeq(seq);
      } catch (e) {
        setNextSeq('000001');
      }
    }
    fetchSequence();
  }, []);

  const computedMemberId = React.useMemo(() => {
    if (isEditMode && existingMember?.member_number) {
      if (selectedProvince?.kode) {
        const parts = existingMember.member_number.split('-');
        if (parts.length >= 4) {
          parts[1] = selectedProvince.kode;
          return parts.join('-');
        } else if (parts.length === 3) {
          parts[1] = selectedProvince.kode;
          return parts.join('-');
        }
      }
      return existingMember.member_number;
    }
    return 'Diterbitkan Setelah Disetujui Admin';
  }, [isEditMode, existingMember?.member_number, selectedProvince?.kode]);

  // Filtered master data
  const filteredProvinces = React.useMemo(() => {
    const q = provinceSearch.toLowerCase().trim();
    if (!q) return PROVINCES;
    return PROVINCES.filter(
      (p) => p.nama.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q)
    );
  }, [provinceSearch]);

  const filteredClubs = React.useMemo(() => {
    const q = clubSearch.toLowerCase().trim();
    if (!q) return CLUB_CHAPTERS;
    const terms = q.split(/\s+/).filter(Boolean);
    return CLUB_CHAPTERS.filter((c) => {
      const searchable = `${c.nama} ${c.kode} ${c.kota} ${c.region} ${c.tipe}`.toLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
  }, [clubSearch]);

  // Pick Photo (KTA & Profil)
  const handlePickPhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Ditolak', 'Izin galeri diperlukan untuk memilih foto resmi member.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Gagal Memilih Foto', err.message || 'Terjadi kesalahan');
    }
  };

  const handleSelectClub = (c: ClubChapter) => {
    setSelectedClub(c);
    if (!city) {
      setCity(c.kota);
    }
    if (!selectedProvince) {
      const match = PROVINCES.find(
        (p) =>
          c.region.toLowerCase().includes(p.nama.toLowerCase()) ||
          c.kota.toLowerCase().includes(p.nama.toLowerCase())
      );
      if (match) setSelectedProvince(match);
    }
    setShowClubModal(false);
  };

  // Submit Handler
  const handleSubmit = async () => {
    setSubmitError(null);
    if (!selectedProvince) {
      Alert.alert('Perhatian', 'Silakan pilih Provinsi domisili');
      return;
    }
    if (!selectedClub) {
      Alert.alert('Perhatian', 'Silakan pilih Klub / Chapter resmi');
      return;
    }
    if (!carModel.trim() || !carPlate.trim()) {
      Alert.alert('Perhatian', 'Model Kendaraan dan Plat Nomor Polisi wajib diisi');
      return;
    }
    if (!user?.id) {
      Alert.alert('Sesi Belum Terbaca', 'Akun Anda belum terdeteksi. Silakan muat ulang halaman atau login kembali.');
      return;
    }

    setLoading(true);
    try {
      // 1. Update profil anggota
      try {
        await (supabase.from('profiles') as any)
          .update({
            phone: phone || null,
            city: city || null,
            province: selectedProvince.nama,
            avatar_url: photoUri || authProfile?.avatar_url || null,
          })
          .eq('id', user.id);
      } catch (profErr) {
        console.warn('[Register] Warning updating profile:', profErr);
      }

      if (isEditMode && existingMember) {
        // Mode Edit: Update record existing
        let updatedMemberNumber = existingMember.member_number;
        const newProvCode = selectedProvince?.kode || 'JKT';
        if (existingMember.member_number) {
          const parts = existingMember.member_number.split('-');
          if (parts.length >= 4) {
            parts[1] = newProvCode;
            updatedMemberNumber = parts.join('-');
          } else if (parts.length === 3) {
            parts[1] = newProvCode;
            updatedMemberNumber = parts.join('-');
          }
        } else {
          // Jika sebelumnya belum terbit nomor KTA, generate nomor KTA resmi
          const currentYear = new Date().getFullYear();
          updatedMemberNumber = `MBINA-${newProvCode}-${currentYear}-${nextSeq}`;
        }

        const updatePayload: any = {
          chapter: selectedClub.nama,
          car_brand: 'Mercedes-Benz',
          car_model: carModel.trim(),
          car_plate: carPlate.trim().toUpperCase(),
          notes: notes || null,
          ktp_url: photoUri || null,
        };
        if (updatedMemberNumber) {
          updatePayload.member_number = updatedMemberNumber;
        }

        // 1. Coba update berdasarkan profile_id
        let { error } = await (supabase.from('members') as any)
          .update(updatePayload)
          .eq('profile_id', user.id);

        // 2. Jika gagal atau data awalnya disimpan di cache lokal, jalankan upsert
        if (error || !existingMember.id || String(existingMember.id).startsWith('local-')) {
          console.warn('[Register] Update via profile_id failed, attempting upsert fallback...', error);
          const upsertPayload = {
            profile_id: user.id,
            status: existingMember.status || 'active',
            is_approved: existingMember.is_approved ?? true,
            join_date: existingMember.join_date || new Date().toISOString().split('T')[0],
            ...updatePayload,
          };
          const { error: upsertErr } = await (supabase.from('members') as any)
            .upsert(upsertPayload, { onConflict: 'profile_id' });
          if (!upsertErr) {
            error = null;
          }
        }

        const updatedLocal = {
          ...existingMember,
          ...updatePayload,
          member_number: updatedMemberNumber || existingMember.member_number,
        };

        try {
          await AsyncStorage.setItem('mb_local_member_' + user.id, JSON.stringify(updatedLocal));
        } catch {}

        setExistingMember(updatedLocal);
        setSavedMemberId(updatedMemberNumber || existingMember.member_number);
        setShowSuccessModal(true);
      } else {
        // Mode Registrasi Baru
        const provCode = selectedClub.kode || selectedProvince.kode || 'JKT';
        const currentYear = new Date().getFullYear();
        const autoMemberId = `MBINA-${provCode}-${currentYear}-${nextSeq}`;

        let newMemberPayload: any = {
          profile_id: user.id,
          member_number: null,
          status: 'pending',
          chapter: selectedClub.nama,
          join_date: new Date().toISOString().split('T')[0],
          car_brand: 'Mercedes-Benz',
          car_model: carModel.trim(),
          car_year: new Date().getFullYear(),
          car_plate: carPlate.trim().toUpperCase(),
          notes: notes || null,
          ktp_url: photoUri || null,
          is_approved: false,
        };

        let { error } = await (supabase.from('members') as any).insert(newMemberPayload);

        // Fallback jika tabel members di database Supabase masih memiliki NOT NULL constraint pada member_number
        if (
          error &&
          (error.message?.includes('not-null') ||
            error.message?.includes('null value') ||
            error.code === '23502')
        ) {
          console.warn('[Register] Retrying insert with generated member_number...');
          newMemberPayload.member_number = autoMemberId;
          const retryRes = await (supabase.from('members') as any).insert(newMemberPayload);
          error = retryRes.error;
          if (!error) {
            setSavedMemberId(autoMemberId);
          }
        }

        if (error) throw error;

        try {
          await AsyncStorage.setItem('mb_local_member_' + user.id, JSON.stringify(newMemberPayload));
        } catch {}

        setShowSuccessModal(true);
      }
    } catch (err: any) {
      console.error('[Register] Error submitting:', err);
      const msg = err.message || 'Terjadi kesalahan sistem saat mengirim pendaftaran.';
      setSubmitError(msg);
      Alert.alert('Penyimpanan Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  const displayName = authProfile?.full_name || 'Nama Member';
  const displayEmail = user?.email || 'email@example.com';

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      {/* Top Header Bar dengan Tombol Close */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.closeCircleBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color={Colors.text.primary} />
        </Pressable>

        <View style={styles.topBarTitleWrapper}>
          <Text style={styles.topBarTitle}>
            {isEditMode ? 'Edit Data Keanggotaan' : 'Registrasi Keanggotaan'}
          </Text>
          <Text style={styles.topBarSubtitle}>
            {isEditMode ? 'Perbarui data KTA & kendaraan' : 'Mercedes-Benz Club Indonesia'}
          </Text>
        </View>

        <Pressable
          style={styles.closeTextBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.closeText}>Tutup</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Container Card (Design Reference) */}
          <View style={styles.card}>
            {/* Card Header Row with Close Icon */}
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name={isEditMode ? 'create-outline' : 'shield-checkmark-outline'}
                    size={20}
                    color={Colors.brand.gold}
                  />
                  <Text style={styles.cardTitle}>
                    {isEditMode ? 'Formulir Edit Keanggotaan' : 'Formulir Registrasi KTA'}
                  </Text>
                </View>
                <Text style={styles.cardSubtitle}>
                  {isEditMode
                    ? 'Ubah data profil, chapter klub, dan kendaraan'
                    : '1 formulir lengkap — nomor KTA terbit otomatis'}
                </Text>
              </View>

              <Pressable
                style={styles.cardCloseBtn}
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle-outline" size={24} color={Colors.text.tertiary} />
              </Pressable>
            </View>

            {/* Foto Resmi Member Section */}
            <View style={styles.photoSection}>
              <View style={styles.avatarWrapper}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="shield" size={30} color={Colors.brand.gold} />
                  </View>
                )}
              </View>

              <View style={styles.photoInfo}>
                <Text style={styles.photoTitle}>Foto Resmi Member (KTA & Profil)</Text>
                <Pressable style={styles.uploadBtn} onPress={handlePickPhoto}>
                  <Text style={styles.uploadBtnText}>
                    {photoUri ? 'Ganti Foto...' : 'Pilih & Upload Foto...'}
                  </Text>
                </Pressable>
                {photoUri && (
                  <View style={styles.photoReadyBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                    <Text style={styles.photoReadyText}>Foto terpasang & siap disimpan</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Row: Member ID & Status */}
            <View style={styles.row}>
              <View style={[styles.col, { flex: 1.4 }]}>
                <Text style={styles.label}>MEMBER ID</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.memberIdText}>{computedMemberId}</Text>
                </View>
              </View>

              <View style={[styles.col, { flex: 1 }]}>
                <Text style={styles.label}>STATUS</Text>
                <View style={styles.statusBox}>
                  <Text
                    style={[
                      styles.statusText,
                      isEditMode && existingMember?.status === 'active' && { color: '#10B981' },
                    ]}
                  >
                    {isEditMode && existingMember?.status
                      ? existingMember.status.toUpperCase()
                      : 'PENDING'}
                  </Text>
                  {isEditMode && existingMember?.status === 'active' ? (
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  ) : (
                    <Ionicons name="time-outline" size={16} color="#F59E0B" />
                  )}
                </View>
              </View>
            </View>

            {/* Nama Lengkap */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NAMA LENGKAP</Text>
              <View style={styles.disabledInput}>
                <Text style={styles.inputTextBold}>{displayName}</Text>
              </View>
            </View>

            {/* Row: Email & No. WhatsApp */}
            <View style={styles.row}>
              <View style={[styles.col, { flex: 1 }]}>
                <Text style={styles.label}>EMAIL</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.inputText} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                </View>
              </View>

              <View style={[styles.col, { flex: 1 }]}>
                <Text style={styles.label}>NO. WHATSAPP</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="081234567890"
                  placeholderTextColor={Colors.text.disabled}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Row: Kota & Provinsi */}
            <View style={styles.row}>
              <View style={[styles.col, { flex: 1 }]}>
                <Text style={styles.label}>KOTA</Text>
                <TextInput
                  style={styles.textInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Jakarta Selatan"
                  placeholderTextColor={Colors.text.disabled}
                />
              </View>

              <View style={[styles.col, { flex: 1 }]}>
                <Text style={styles.label}>PROVINSI</Text>
                <Pressable
                  style={styles.pickerBox}
                  onPress={() => setShowProvinceModal(true)}
                >
                  <Text style={styles.pickerText} numberOfLines={1}>
                    {selectedProvince ? `${selectedProvince.nama} (${selectedProvince.kode})` : 'Pilih Provinsi'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.text.tertiary} />
                </Pressable>
              </View>
            </View>

            {/* Row: Tier Keanggotaan & Klub / Chapter */}
            <View style={styles.row}>
              <View style={[styles.col, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>TIER KEANGGOTAAN</Text>
                  <Text style={styles.subLabel}>Level Otomatis</Text>
                </View>
                <View style={styles.tierBox}>
                  <Text style={styles.tierGold}>REGULAR MEMBER</Text>
                </View>
              </View>

              <View style={[styles.col, { flex: 1 }]}>
                <Text style={styles.label}>KLUB / CHAPTER</Text>
                <Pressable
                  style={styles.pickerBox}
                  onPress={() => setShowClubModal(true)}
                >
                  <Text style={styles.pickerText} numberOfLines={1}>
                    {selectedClub ? selectedClub.nama : 'Pilih Klub / Chapter'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.text.tertiary} />
                </Pressable>
              </View>
            </View>

            {/* Card Kendaraan */}
            <View style={styles.vehicleContainer}>
              <View style={styles.row}>
                <View style={[styles.col, { flex: 1 }]}>
                  <Text style={styles.label}>MODEL KENDARAAN</Text>
                  <TextInput
                    style={styles.textInput}
                    value={carModel}
                    onChangeText={setCarModel}
                    placeholder="contoh: W124 300E / W212"
                    placeholderTextColor={Colors.text.disabled}
                  />
                </View>

                <View style={[styles.col, { flex: 1 }]}>
                  <Text style={styles.label}>PLAT NOMOR POLISI</Text>
                  <TextInput
                    style={styles.textInput}
                    value={carPlate}
                    onChangeText={setCarPlate}
                    placeholder="CONTOH: B 1234 MB"
                    placeholderTextColor={Colors.text.disabled}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            </View>

            {/* Catatan Internal */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CATATAN INTERNAL / TAMBAHAN</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Member aktif touring..."
                placeholderTextColor={Colors.text.disabled}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Error Message Box */}
            {submitError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorBoxText}>{submitError}</Text>
              </View>
            )}

            {/* Footer Buttons */}
            <View style={styles.footerRow}>
              <Pressable style={styles.btnSecondary} onPress={() => router.back()}>
                <Text style={styles.btnSecondaryText}>Tutup / Batal</Text>
              </Pressable>

              <Pressable
                style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.btnPrimaryText}>
                  {loading
                    ? 'Menyimpan...'
                    : isEditMode
                    ? 'Simpan Perubahan'
                    : 'Kirim Pendaftaran'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Notifikasi Berhasil Disimpan */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successDialog}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={58} color={Colors.brand.gold} />
            </View>

            <Text style={styles.successDialogTitle}>
              {isEditMode ? 'Data Berhasil Diperbarui!' : 'Pendaftaran Berhasil Disimpan! 🎉'}
            </Text>

            <Text style={styles.successDialogDesc}>
              {isEditMode
                ? 'Perubahan data keanggotaan, kendaraan, dan profil Anda telah berhasil disimpan di database.'
                : 'Data pendaftaran resmi Anda telah dicatat di sistem Mercedes-Benz Club Indonesia.'}
            </Text>

            <View style={styles.successKtaBox}>
              <Text style={styles.successKtaLabel}>
                {isEditMode && savedMemberId ? 'NOMOR KTA RESMI' : 'STATUS NOMOR ANGGOTA'}
              </Text>
              <Text style={styles.successKtaText}>
                {isEditMode && savedMemberId ? savedMemberId : 'DITERBITKAN SAAT VERIFIKASI ADMIN'}
              </Text>
            </View>

            <Text style={styles.successStatusNote}>
              {isEditMode && savedMemberId
                ? 'Nomor KTA telah disesuaikan dengan kode provinsi domisili baru Anda. Nomor urut registrasi anggota tetap dipertahankan seumur hidup.'
                : 'Sesuai aturan bisnis komunitas: Nomor Anggota resmi akan diterbitkan otomatis setelah disetujui admin.'}
            </Text>

            <Pressable
              style={styles.successOkBtn}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(main)/keanggotaan');
              }}
            >
              <Ionicons name="checkmark" size={18} color="#000" style={{ marginRight: 6 }} />
              <Text style={styles.successOkBtnText}>Tutup & Lihat Keanggotaan</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Pemilihan Provinsi */}
      <Modal
        visible={showProvinceModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProvinceModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Pilih Provinsi Domisili</Text>
              <Text style={styles.modalSubtitle}>38 Provinsi (KTA menyesuaikan kode provinsi)</Text>
            </View>
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowProvinceModal(false)}>
              <Ionicons name="close" size={22} color={Colors.text.primary} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.text.tertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={provinceSearch}
              onChangeText={setProvinceSearch}
              placeholder="Cari provinsi atau kode (contoh: JBR, JKT, Bali)..."
              placeholderTextColor={Colors.text.disabled}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filteredProvinces}
            keyExtractor={(item) => item.kode}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = selectedProvince?.kode === item.kode;
              return (
                <Pressable
                  style={[styles.listItem, isSelected && styles.listItemSelected]}
                  onPress={() => {
                    setSelectedProvince(item);
                    setShowProvinceModal(false);
                  }}
                >
                  <View style={styles.provBadge}>
                    <Text style={styles.provBadgeText}>{item.kode}</Text>
                  </View>
                  <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>
                    {item.nama}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color={Colors.brand.gold} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Modal Pemilihan Klub / Chapter */}
      <Modal
        visible={showClubModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowClubModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Pilih Klub / Chapter</Text>
              <Text style={styles.modalSubtitle}>{CLUB_CHAPTERS.length} Klub & Chapter Resmi</Text>
            </View>
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowClubModal(false)}>
              <Ionicons name="close" size={22} color={Colors.text.primary} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.text.tertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={clubSearch}
              onChangeText={setClubSearch}
              placeholder="Cari nama klub, kota, atau region..."
              placeholderTextColor={Colors.text.disabled}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filteredClubs}
            keyExtractor={(item) => item.kode}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = selectedClub?.kode === item.kode;
              return (
                <Pressable
                  style={[styles.listItem, isSelected && styles.listItemSelected]}
                  onPress={() => handleSelectClub(item)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.clubTypeBadge}>{item.tipe}</Text>
                      <Text style={styles.clubCodeText}>{item.kode}</Text>
                    </View>
                    <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>
                      {item.nama}
                    </Text>
                    <Text style={styles.clubSubText}>{item.kota} • {item.region}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={18} color={Colors.brand.gold} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 620,
    backgroundColor: '#121316',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#24262E',
    padding: 24,
    gap: 16,
  },

  // Photo Section
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17191E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262933',
    padding: 16,
    gap: 16,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#0E0F12',
    borderWidth: 1.5,
    borderColor: Colors.brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1E24',
  },
  photoInfo: {
    flex: 1,
  },
  photoTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  uploadBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#262830',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#383B46',
  },
  uploadBtnText: {
    fontSize: Typography.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },

  // Grid & Layout
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  col: {
    gap: 6,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#8E94A0',
    letterSpacing: 0.6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subLabel: {
    fontSize: 10,
    color: '#656A76',
  },

  // Inputs
  disabledInput: {
    backgroundColor: '#17191E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262933',
    height: 46,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  memberIdText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.gold,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  inputTextBold: {
    fontSize: 14,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  textInput: {
    backgroundColor: '#17191E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262933',
    height: 46,
    paddingHorizontal: 14,
    fontSize: 13,
    color: Colors.text.primary,
  },
  textArea: {
    height: 72,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },

  // Status & Pickers
  statusBox: {
    backgroundColor: '#17191E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262933',
    height: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#F59E0B',
  },
  pickerBox: {
    backgroundColor: '#17191E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262933',
    height: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.primary,
    marginRight: 6,
  },

  // Tier Box
  tierBox: {
    backgroundColor: '#17191E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262933',
    height: 46,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  tierGold: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.gold,
  },

  // Vehicle Container Box
  vehicleContainer: {
    backgroundColor: 'rgba(23, 25, 30, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262933',
    padding: 12,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#24262E',
    marginVertical: 4,
  },

  // Footer Actions
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  btnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  btnSecondaryText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
  btnPrimary: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#0B0B0C',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0B0C',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#24262E',
  },
  modalTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  modalSubtitle: {
    fontSize: Typography.xs,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17191E',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262933',
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17191E',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262933',
    gap: 10,
  },
  listItemSelected: {
    borderColor: Colors.brand.gold,
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  listItemText: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  listItemTextSelected: {
    color: Colors.brand.gold,
    fontWeight: Typography.weight.bold,
  },
  provBadge: {
    backgroundColor: Colors.brand.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 42,
    alignItems: 'center',
  },
  provBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#000',
  },
  clubTypeBadge: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.gold,
  },
  clubCodeText: {
    fontSize: 10,
    color: Colors.text.tertiary,
  },
  clubSubText: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  // Top Header Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2128',
    backgroundColor: '#0B0B0C',
  },
  closeCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2026',
    borderWidth: 1,
    borderColor: '#2F333E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  topBarSubtitle: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  closeTextBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  closeText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
  },

  // Card Header Row
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#20222A',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  cardCloseBtn: {
    padding: 2,
  },

  // Photo Ready Badge
  photoReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  photoReadyText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: Typography.weight.medium,
  },

  // Success Overlay / Dialog
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successDialog: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#16181E',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.brand.gold,
    padding: 24,
    alignItems: 'center',
    shadowColor: Colors.brand.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successDialogTitle: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  successDialogDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  successKtaBox: {
    width: '100%',
    backgroundColor: '#0F1014',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262933',
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  successKtaLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#8E94A0',
    letterSpacing: 1,
    marginBottom: 4,
  },
  successKtaText: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.gold,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  successStatusNote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  successOkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.gold,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
  },
  successOkBtnText: {
    fontSize: 14,
    fontWeight: Typography.weight.bold,
    color: '#0B0B0C',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBoxText: {
    flex: 1,
    color: '#F87171',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
});
