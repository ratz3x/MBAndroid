// ============================================================
// Event Detail — With RSVP button
// Mercedes-Benz Club Indonesia
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../src/services/supabase';
import { MetallicButton } from '../../../src/components/ui/MetallicButton';
import { LuxuryCard } from '../../../src/components/ui/LuxuryCard';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { Colors, Typography, Spacing, CommonStyles } from '../../../src/constants/theme';
import { formatDateTime, formatDate } from '../../../src/utils/helpers';
import { eventService } from '../../../src/services/eventService';
import { useAuth } from '../../../src/context/AuthContext';
import type { Event } from '../../../src/types/database.types';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkInTimeRemaining, setCheckInTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchEventDetail = async () => {
      // 1. Coba dari Supabase
      try {
        const { data } = await (supabase.from('events') as any).select('*').eq('id', id).maybeSingle();
        if (data) {
          setEvent(data);
          return;
        }
      } catch {}

      // 2. Coba dari Local Storage (misal draft panitia yang baru dibuat)
      const localEvents = await eventService.getLocalEvents();
      const found = localEvents.find((e) => e.id === id || e.event_code === id);
      if (found) {
        setEvent(found);
      }
    };
    fetchEventDetail();
  }, [id]);

  // Cek status Check-In user untuk event ini
  useEffect(() => {
    if (!id || !user) return;
    const checkUserStatus = async () => {
      try {
        const { data } = await (supabase.from('event_rsvps') as any)
          .select('id, status')
          .eq('event_id', id)
          .eq('member_id', user.id)
          .maybeSingle();
        if (data) {
          setHasCheckedIn(true);
        }
      } catch {}
    };
    checkUserStatus();
  }, [id, user]);

  // Evaluasi jendela waktu Check-In (baru aktif 2 jam sebelum start_date)
  const checkInStatus = React.useMemo(() => {
    if (!event || !event.start_date) {
      return { canCheckIn: false, label: 'Waktu Event Tidak Valid', reason: 'invalid_date' };
    }

    const eventStartTime = new Date(event.start_date).getTime();
    if (isNaN(eventStartTime)) {
      return { canCheckIn: false, label: 'Waktu Event Tidak Valid', reason: 'invalid_date' };
    }

    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const checkInOpenTime = eventStartTime - twoHoursInMs;

    // Jika sudah lewat end_date (jika ada)
    if (event.end_date) {
      const eventEndTime = new Date(event.end_date).getTime();
      if (!isNaN(eventEndTime) && now > eventEndTime) {
        return {
          canCheckIn: false,
          label: 'Event Telah Berakhir',
          reason: 'ended',
          openTimeStr: '',
        };
      }
    }

    if (now < checkInOpenTime) {
      const diffMs = checkInOpenTime - now;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffDays = Math.floor(diffHrs / 24);

      let countdownText = '';
      if (diffDays > 0) {
        countdownText = `${diffDays} hari lagi`;
      } else if (diffHrs > 0) {
        countdownText = `${diffHrs} jam ${diffMins} menit lagi`;
      } else {
        countdownText = `${Math.max(1, diffMins)} menit lagi`;
      }

      const openDateObj = new Date(checkInOpenTime);
      const openTimeFormatted = `${String(openDateObj.getHours()).padStart(2, '0')}:${String(
        openDateObj.getMinutes()
      ).padStart(2, '0')} WIB`;

      return {
        canCheckIn: false,
        label: `Check-In Dibuka (H-2 Jam)`,
        reason: 'too_early',
        countdown: countdownText,
        openTimeStr: openTimeFormatted,
      };
    }

    return {
      canCheckIn: true,
      label: 'Check-In Sekarang',
      reason: 'open',
    };
  }, [event]);

  const handleCheckIn = async () => {
    if (!user) {
      Alert.alert('Masuk Diperlukan', 'Silakan masuk ke akun Anda terlebih dahulu untuk melakukan Check-In.');
      return;
    }

    if (!checkInStatus.canCheckIn) {
      if (checkInStatus.reason === 'too_early') {
        Alert.alert(
          'Check-In Belum Dibuka ⏳',
          `Tombol Check-In baru dapat dilakukan 2 jam sebelum event dimulai (${checkInStatus.openTimeStr}). Silakan kembali lagi ${checkInStatus.countdown}.`
        );
      } else if (checkInStatus.reason === 'ended') {
        Alert.alert('Event Selesai', 'Periode event dan check-in telah berakhir.');
      }
      return;
    }

    setCheckInLoading(true);
    try {
      const { error } = await (supabase.from('event_rsvps') as any).upsert({
        event_id: id,
        member_id: user.id,
        status: 'confirmed',
      });
      if (error) throw error;
      setHasCheckedIn(true);
      Alert.alert(
        'Check-In Berhasil! ⭐',
        'Kehadiran Anda pada kegiatan ini telah berhasil dicatat oleh sistem.'
      );
    } catch (err: any) {
      Alert.alert('Gagal Check-In', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setCheckInLoading(false);
    }
  };

  // Proteksi Keamanan: Member biasa dilarang membuka draft event
  if (event && event.status === 'draft' && !isAdmin) {
    return (
      <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(197, 160, 89, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(197, 160, 89, 0.25)' }}>
            <Ionicons name="lock-closed-outline" size={32} color="#C5A059" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
            Proposal Masih Berstatus Draft
          </Text>
          <Text style={{ fontSize: 14, color: '#A1A1AA', textAlign: 'center', lineHeight: 20, maxWidth: 320 }}>
            Agenda kegiatan ini masih dalam tahap persiapan internal pengurus dan belum dipublikasikan untuk anggota umum.
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

  if (!event) return null;

  const displayCode = event.event_code || event.title?.match(/\[(EVT-[^\]]+)\]/)?.[1] || null;
  const displayTitle = event.title?.replace(/\[(EVT-[^\]]+)\]\s*/, '') || event.title;

  const picName = event.pic_name || event.description?.match(/• PIC:\s*([^\n\r]+)/)?.[1]?.trim() || null;
  const picPhone = event.pic_phone || event.description?.match(/• Kontak \/ WA:\s*([^\n\r]+)/)?.[1]?.trim() || null;
  const picClub = event.pic_club || event.description?.match(/• Asal Klub:\s*([^\n\r]+)/)?.[1]?.trim() || null;
  const picRole = event.pic_role || event.description?.match(/• Peran:\s*([^\n\r]+)/)?.[1]?.trim() || null;

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </Pressable>

        {/* Event Title */}
        <LuxuryCard variant="gold" style={styles.heroCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{event.type.toUpperCase()}</Text>
            </View>
            {displayCode && (
              <View style={{ backgroundColor: 'rgba(197, 160, 89, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(197, 160, 89, 0.3)' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#C5A059' }}>{displayCode}</Text>
              </View>
            )}
          </View>
          <Text style={styles.eventTitle}>{displayTitle}</Text>
          {event.chapter && (
            <Text style={styles.chapterText}>Chapter {event.chapter}</Text>
          )}
        </LuxuryCard>

        {/* Details */}
        <LuxuryCard style={styles.detailCard}>
          {[
            { icon: 'calendar-outline', label: 'Mulai', value: formatDateTime(event.start_date) },
            { icon: 'calendar', label: 'Selesai', value: formatDateTime(event.end_date) },
            { icon: 'location-outline', label: 'Lokasi', value: event.location },
            ...(event.max_participants ? [{ icon: 'people-outline', label: 'Kapasitas', value: `${event.max_participants} peserta` }] : []),
            ...(event.rsvp_deadline ? [{ icon: 'time-outline', label: 'Batas RSVP', value: formatDate(event.rsvp_deadline) }] : []),
          ].map((detail) => (
            <View key={detail.label} style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name={detail.icon as any} size={18} color={Colors.brand.gold} />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            </View>
          ))}
          {event.location_url && (
            <Pressable onPress={() => Linking.openURL(event.location_url!)} style={styles.mapsBtn}>
              <Ionicons name="map-outline" size={16} color={Colors.status.info} />
              <Text style={styles.mapsBtnText}>Buka di Google Maps</Text>
            </Pressable>
          )}
        </LuxuryCard>

        {/* PIC & Panitia */}
        {picName && (
          <LuxuryCard style={styles.descCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="person-circle-outline" size={20} color={Colors.brand.gold} />
              <Text style={styles.descTitle}>Penanggung Jawab (PIC)</Text>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{picName}</Text>
              {picRole && (
                <Text style={{ fontSize: 12, color: '#A1A1AA' }}>{picRole}</Text>
              )}
              {picClub && (
                <Text style={{ fontSize: 12, color: '#C5A059' }}>{picClub}</Text>
              )}
              {picPhone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${picPhone}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#34D399" />
                  <Text style={{ fontSize: 13, color: '#34D399', fontWeight: '600' }}>
                    Hubungi PIC ({picPhone})
                  </Text>
                </Pressable>
              )}
            </View>
          </LuxuryCard>
        )}

        {/* Description */}
        {event.description && (
          <LuxuryCard style={styles.descCard}>
            <Text style={styles.descTitle}>Tentang Event</Text>
            <Text style={styles.descText}>{event.description}</Text>
          </LuxuryCard>
        )}

        {/* Check-In Kehadiran (Aktif 2 Jam Sebelum Event Dimulai) */}
        {event.status !== 'cancelled' && event.status !== 'draft' && (
          <View style={styles.checkInContainer}>
            {hasCheckedIn ? (
              <View style={styles.checkedInBox}>
                <View style={styles.checkedInIconWrap}>
                  <Ionicons name="checkmark-circle" size={24} color="#34D399" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkedInTitle}>✓ Anda Sudah Check-In</Text>
                  <Text style={styles.checkedInSubtitle}>
                    Kehadiran Anda telah terverifikasi resmi oleh panitia.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.checkInCard}>
                <View style={styles.checkInHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={checkInStatus.canCheckIn ? 'location-outline' : 'time-outline'}
                      size={16}
                      color={checkInStatus.canCheckIn ? '#34D399' : '#C5A059'}
                    />
                    <Text
                      style={[
                        styles.checkInHeaderLabel,
                        checkInStatus.canCheckIn && { color: '#34D399' },
                      ]}
                    >
                      {checkInStatus.canCheckIn ? 'Gerbang Check-In Aktif' : 'Gerbang Check-In (H-2 Jam)'}
                    </Text>
                  </View>

                  {!checkInStatus.canCheckIn && checkInStatus.countdown && (
                    <View style={styles.countdownPill}>
                      <Text style={styles.countdownPillText}>⏳ {checkInStatus.countdown}</Text>
                    </View>
                  )}
                </View>

                <MetallicButton
                  label={
                    checkInStatus.canCheckIn
                      ? 'Check-In Sekarang'
                      : `Check-In (Buka ${checkInStatus.openTimeStr || 'H-2 Jam'})`
                  }
                  onPress={handleCheckIn}
                  loading={checkInLoading}
                  variant={checkInStatus.canCheckIn ? 'gold' : 'outline'}
                  size="lg"
                  icon={checkInStatus.canCheckIn ? 'checkmark-circle-outline' : 'lock-closed-outline'}
                  style={StyleSheet.flatten([
                    styles.checkInBtn,
                    !checkInStatus.canCheckIn && styles.checkInBtnLocked,
                  ])}
                />

                {!checkInStatus.canCheckIn && (
                  <Text style={styles.checkInNoticeText}>
                    * Tombol Check-In baru dapat dilakukan 2 jam sebelum waktu event dimulai demi akurasi absensi kehadiran anggota di lokasi acara.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.base },
  backBtn: { paddingVertical: Spacing.base, alignSelf: 'flex-start' },
  heroCard: { marginBottom: Spacing.md },
  typeBadge: {
    backgroundColor: 'rgba(201,168,76,0.2)', alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 4, marginBottom: Spacing.sm,
  },
  typeText: { fontSize: Typography.xs, color: Colors.brand.gold, fontWeight: Typography.weight.bold, letterSpacing: 2 },
  eventTitle: { fontSize: Typography['2xl'], fontWeight: Typography.weight.bold, color: Colors.text.primary, lineHeight: 32 },
  chapterText: { fontSize: Typography.sm, color: Colors.brand.gold, marginTop: Spacing.xs },
  detailCard: { marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border.dark },
  detailIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(201,168,76,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  detailText: { flex: 1 },
  detailLabel: { fontSize: Typography.xs, color: Colors.text.tertiary },
  detailValue: { fontSize: Typography.sm, color: Colors.text.primary, fontWeight: Typography.weight.medium, marginTop: 2 },
  mapsBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  mapsBtnText: { fontSize: Typography.sm, color: Colors.status.info, fontWeight: Typography.weight.medium },
  descCard: { marginBottom: Spacing.md },
  descTitle: { fontSize: Typography.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginBottom: Spacing.sm },
  descText: { fontSize: Typography.base, color: Colors.text.secondary, lineHeight: 24 },
  rsvpBtn: { marginBottom: Spacing.md },

  // Check-In Styles
  checkInContainer: {
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
  checkInCard: {
    backgroundColor: '#121316',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  checkInHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkInHeaderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C5A059',
  },
  countdownPill: {
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
  },
  countdownPillText: {
    fontSize: 11,
    color: '#C5A059',
    fontWeight: '700',
  },
  checkInBtn: {
    marginBottom: 0,
  },
  checkInBtnLocked: {
    opacity: 0.75,
    borderColor: 'rgba(197, 160, 89, 0.4)',
  },
  checkInNoticeText: {
    fontSize: 11,
    color: '#71717A',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  checkedInBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 16,
    padding: 16,
  },
  checkedInIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedInTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34D399',
  },
  checkedInSubtitle: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 2,
  },
});
