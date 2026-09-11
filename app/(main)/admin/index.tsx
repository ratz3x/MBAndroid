// ============================================================
// Admin Dashboard — Statistics + Approval Queue
// Mercedes-Benz Dark Chrome / Platinum (Monochrome & Sleek)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../src/services/supabase';
import { eventService } from '../../../src/services/eventService';
import { SponsorService, type SponsorItem } from '../../../src/services/sponsorService';
import { StatsWidget } from '../../../src/components/dashboard/StatsWidget';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { Spacing, CommonStyles } from '../../../src/constants/theme';
import type { Member } from '../../../src/types/database.types';
import { formatDate } from '../../../src/utils/helpers';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [pendingSponsors, setPendingSponsors] = useState<SponsorItem[]>([]);
  const [draftEvents, setDraftEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, events: 0 });
  const [loading, setLoading] = useState(false);

  // In-app Action Modal state (Web & Native compatible)
  const [actionModal, setActionModal] = useState<{
    visible: boolean;
    type: 'approve' | 'reject';
    member: any;
  }>({
    visible: false,
    type: 'approve',
    member: null,
  });
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ count: total }, { count: active }, { count: pending }, { data: pendingList }, draftList, upcomingEvents, allSponsors] =
        await Promise.all([
          supabase.from('members').select('*', { count: 'exact', head: true }),
          supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase
            .from('members')
            .select('*, profiles:profile_id(full_name, email, phone)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(20),
          eventService.getDraftEvents(),
          eventService.getEvents({ status: 'upcoming' }),
          SponsorService.getSponsors(),
        ]);
      setStats({ total: total ?? 0, active: active ?? 0, pending: pending ?? 0, events: upcomingEvents.length });
      setPendingMembers((pendingList as any) ?? []);
      setPendingSponsors(allSponsors.filter((s) => s.pending_renewal));
      setDraftEvents(draftList);
    } catch (err: any) {
      console.warn('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = (member: any) => {
    setActionModal({
      visible: true,
      type: 'approve',
      member,
    });
  };

  const openRejectModal = (member: any) => {
    setActionModal({
      visible: true,
      type: 'reject',
      member,
    });
  };

  // Execute approval or rejection directly with in-app confirmation
  const handleConfirmAction = async () => {
    const { type, member } = actionModal;
    if (!member) return;

    setProcessing(true);
    try {
      if (type === 'approve') {
        // 1. Coba RPC fungsi approve_member_registration di Supabase
        let rpcSuccess = false;
        try {
          const { error: rpcError } = await (supabase as any).rpc('approve_member_registration', {
            target_member_id: member.id,
          });
          if (!rpcError) {
            rpcSuccess = true;
          } else {
            console.warn('RPC approve returned error, trying fallback:', rpcError);
          }
        } catch (e) {
          console.warn('RPC exception:', e);
        }

        // 2. Fallback jika fungsi SQL RPC belum dijalankan di database
        if (!rpcSuccess) {
          const currentYear = new Date().getFullYear();
          const { count } = await (supabase.from('members') as any)
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
          const seq = String((count ?? 0) + 1).padStart(6, '0');
          const finalKTA = `MBINA-JKT-${currentYear}-${seq}`;

          const { error: updateErr } = await (supabase.from('members') as any)
            .update({
              status: 'active',
              is_approved: true,
              member_number: finalKTA,
              approved_at: new Date().toISOString(),
            })
            .eq('id', member.id);

          if (updateErr) throw updateErr;
        }

        setActionModal({ visible: false, type: 'approve', member: null });
        setToastMessage(`Pendaftaran ${member.profiles?.full_name || 'anggota'} berhasil disetujui & nomor KTA resmi diterbitkan! 🎉`);
      } else {
        // Mode Tolak
        const { error: rejectErr } = await (supabase.from('members') as any)
          .update({
            status: 'inactive',
            is_approved: false,
          })
          .eq('id', member.id);

        if (rejectErr) throw rejectErr;

        setActionModal({ visible: false, type: 'reject', member: null });
        setToastMessage(`Pendaftaran ${member.profiles?.full_name || 'anggota'} telah ditolak.`);
      }

      await fetchData();
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Terjadi kesalahan saat memproses data.');
    } finally {
      setProcessing(false);
    }
  };

  // Publikasikan Draft Event
  const handlePublishDraft = async (eventId: string, eventTitle: string) => {
    try {
      setProcessing(true);
      const success = await eventService.publishEvent(eventId);
      if (!success) throw new Error('Gagal mempublikasikan draft.');
      setToastMessage(`Event "${eventTitle}" berhasil dipublikasikan ke kalender publik! ⭐`);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Gagal Mempublikasikan', err.message || 'Terjadi kesalahan.');
    } finally {
      setProcessing(false);
    }
  };

  // Eksekusi Hapus Draft
  const executeDeleteDraft = async (eventId: string, eventTitle: string) => {
    try {
      setProcessing(true);
      const success = await eventService.deleteEvent(eventId);
      if (!success) throw new Error('Gagal menghapus draft.');
      setToastMessage(`Draft "${eventTitle}" berhasil dihapus.`);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Gagal Menghapus', err.message || 'Terjadi kesalahan.');
    } finally {
      setProcessing(false);
    }
  };

  // Hapus Draft Event (Web & Native compatible)
  const handleDeleteDraft = async (eventId: string, eventTitle: string) => {
    if (Platform.OS === 'web') {
      const confirmDelete = typeof window !== 'undefined' ? window.confirm(`Apakah Anda yakin ingin menghapus draft "${eventTitle}"? Tindakan ini tidak dapat dibatalkan.`) : true;
      if (confirmDelete) {
        await executeDeleteDraft(eventId, eventTitle);
      }
      return;
    }
    Alert.alert(
      'Hapus Draft Event?',
      `Apakah Anda yakin ingin menghapus draft "${eventTitle}"? Tindakan ini tidak dapat dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => executeDeleteDraft(eventId, eventTitle),
        },
      ]
    );
  };

  // Bersihkan pendaftaran duplikat lama
  const handleCleanDuplicates = async () => {
    try {
      setLoading(true);
      const { data: allMembers, error: fetchErr } = await (supabase.from('members') as any)
        .select('id, profile_id, created_at')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      if (allMembers && allMembers.length > 0) {
        const seen = new Set<string>();
        const idsToDelete: string[] = [];
        for (const m of allMembers) {
          if (seen.has(m.profile_id)) {
            idsToDelete.push(m.id);
          } else {
            seen.add(m.profile_id);
          }
        }

        if (idsToDelete.length > 0) {
          const { error: delErr } = await (supabase.from('members') as any)
            .delete()
            .in('id', idsToDelete);
          if (delErr) throw delErr;
          setToastMessage(`Berhasil membersihkan ${idsToDelete.length} data pendaftaran sampah duplikat!`);
        } else {
          setToastMessage('Tabel members sudah rapi, tidak ada data duplikat.');
        }
      }
      await fetchData();
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Gagal membersihkan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color="#F4F4F5" />
          </Pressable>
          <Text style={styles.title}>Dashboard Admin</Text>
          <Pressable
            onPress={fetchData}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh-outline" size={20} color="#D4D4D8" />
          </Pressable>
        </View>

        {/* Feedback Toast */}
        {toastMessage && (
          <View style={styles.toastCard}>
            <Ionicons name="checkmark-circle" size={18} color="#D4D4D8" />
            <Text style={styles.toastText}>{toastMessage}</Text>
            <Pressable onPress={() => setToastMessage(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close" size={18} color="#71717A" />
            </Pressable>
          </View>
        )}

        {/* 1. Statistik Anggota (Platinum Accent Line + Monochrome 4 Grid) */}
        <SectionHeader title="Statistik Anggota" accentColor="#A1A1AA" />
        <StatsWidget
          stats={[
            { label: 'Total Anggota', value: stats.total, icon: 'people-outline' },
            { label: 'Anggota Aktif', value: stats.active, icon: 'checkmark-circle-outline', trend: 'up' },
            { label: 'Menunggu Approval', value: stats.pending, icon: 'hourglass-outline' },
            { label: 'Event Mendatang', value: stats.events, icon: 'calendar-outline' },
          ]}
        />

        {/* 2. Antrean Pendaftaran (Platinum Accent Line + Refactored Cards) */}
        <View style={{ marginTop: Spacing.xl }}>
          <SectionHeader
            title="Antrean Pendaftaran"
            subtitle={`${stats.pending} menunggu persetujuan`}
            accentColor="#A1A1AA"
          />
        </View>

        {pendingMembers.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="checkmark-done-circle-outline" size={28} color="#A1A1AA" />
            </View>
            <Text style={styles.emptyText}>Tidak ada antrean pendaftaran</Text>
          </View>
        ) : (
          pendingMembers.map((member: any) => {
            const profile = member.profiles;
            const displayName = profile?.full_name || profile?.email || 'Calon Anggota';
            return (
              <View key={member.id} style={styles.approvalCard}>
                <View style={styles.approvalHeader}>
                  {/* Monochrome User Badge */}
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={20} color="#A1A1AA" />
                  </View>
                  <View style={styles.approvalInfo}>
                    <Text style={styles.approvalName}>{displayName}</Text>
                    {member.chapter && (
                      <View style={styles.chapterBadgeRow}>
                        <Ionicons name="shield-checkmark" size={11} color="#A1A1AA" />
                        <Text style={styles.approvalChapterText}>{member.chapter}</Text>
                      </View>
                    )}
                    <Text style={styles.approvalPlate}>
                      Mercedes-Benz {member.car_model} ({member.car_year}) • {member.car_plate}
                    </Text>
                    <Text style={styles.approvalDate}>
                      Daftar: {formatDate(member.created_at)} • {member.member_number ? member.member_number : 'Belum Ada No. KTA (Pending)'}
                    </Text>
                  </View>
                </View>

                {/* Tombol Aksi Tolak (Ghost Outline) & Setujui (Metallic Platinum) */}
                <View style={styles.approvalActions}>
                  <Pressable
                    onPress={() => openRejectModal(member)}
                    style={({ pressed }) => [
                      styles.rejectBtn,
                      pressed && styles.rejectBtnPressed,
                    ]}
                    android_ripple={{ color: 'rgba(239, 68, 68, 0.2)' }}
                  >
                    <Text style={styles.rejectBtnText}>Tolak</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => openApproveModal(member)}
                    style={({ pressed }) => [
                      styles.approveBtn,
                      pressed && styles.approveBtnPressed,
                    ]}
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                  >
                    <Text style={styles.approveBtnText}>Setujui</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {/* 2b. Verifikasi Perpanjangan Kerjasama Sponsor */}
        <View style={{ marginTop: Spacing.xl }}>
          <SectionHeader
            title="Verifikasi Perpanjangan Kerjasama Sponsor"
            subtitle={`${pendingSponsors.length} pengajuan perpanjangan sewa lapak & kemitraan`}
            accentColor="#FBBF24"
          />
        </View>

        {pendingSponsors.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="ribbon-outline" size={28} color="#A1A1AA" />
            </View>
            <Text style={styles.emptyText}>Tidak ada antrean perpanjangan sponsor</Text>
            <Text style={{ fontSize: 11, color: '#71717A', textAlign: 'center', marginTop: 4 }}>
              Pengajuan perpanjangan sewa lapak dari Mitra Sponsor akan otomatis muncul di sini untuk diverifikasi Admin.
            </Text>
          </View>
        ) : (
          pendingSponsors.map((sponsor) => (
            <View key={sponsor.id} style={[styles.approvalCard, { borderColor: '#FBBF24', backgroundColor: 'rgba(251, 191, 36, 0.04)' }]}>
              <View style={styles.approvalHeader}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Ionicons name="ribbon" size={22} color="#FBBF24" />
                </View>
                <View style={styles.approvalInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.approvalName}>{sponsor.name}</Text>
                    <View style={{ backgroundColor: 'rgba(251,191,36,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#FBBF24', fontWeight: '700' }}>SPONSOR</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#FBBF24', fontWeight: '600' }}>
                    {sponsor.sponsor_id} • {sponsor.category}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#D4D4D8', marginTop: 2 }}>
                    Pengajuan: <Text style={{ color: '#FBBF24', fontWeight: '700' }}>+{sponsor.pending_renewal?.months} Bulan</Text> (Rp {sponsor.pending_renewal?.fee.toLocaleString('id-ID')})
                  </Text>
                  {sponsor.pending_renewal?.notes ? (
                    <Text style={{ fontSize: 11, color: '#A1A1AA', fontStyle: 'italic' }}>
                      Catatan: "{sponsor.pending_renewal.notes}"
                    </Text>
                  ) : null}
                  <Text style={styles.approvalDate}>
                    Diajukan: {formatDate(sponsor.pending_renewal?.requested_at || new Date().toISOString())}
                  </Text>
                </View>
              </View>

              <View style={styles.approvalActions}>
                <Pressable
                  onPress={() => router.push('/(main)/sponsorship' as any)}
                  style={{ flex: 1, backgroundColor: '#FBBF24', paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                >
                  <Ionicons name="receipt" size={15} color="#09090B" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#09090B' }}>
                    Review Bukti Transfer & Verifikasi →
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* 3. Draft Proposal Event (Khusus Admin) */}
        <View style={{ marginTop: Spacing.xl }}>
          <SectionHeader
            title="Draft Proposal Event"
            subtitle={`${draftEvents.length} proposal dalam persiapan`}
            accentColor="#C5A059"
          />
        </View>

        {draftEvents.length === 0 ? (
          <View style={styles.emptyDraftCard}>
            <Ionicons name="document-text-outline" size={28} color="#52525B" />
            <Text style={styles.emptyDraftCardText}>Belum ada draft proposal event</Text>
            <Text style={styles.emptyDraftCardSubText}>Event yang disimpan sebagai draft panitia akan muncul di sini.</Text>
          </View>
        ) : (
          draftEvents.map((evt) => (
            <View key={evt.id} style={styles.draftCard}>
              <View style={styles.draftHeaderRow}>
                <View style={styles.draftBadge}>
                  <Text style={styles.draftBadgeText}>DRAFT</Text>
                </View>
                {evt.event_code && (
                  <Text style={styles.draftCodeText}>{evt.event_code}</Text>
                )}
              </View>

              <Text style={styles.draftTitle}>{evt.title}</Text>

              <View style={styles.draftMetaRow}>
                <Ionicons name="location-outline" size={13} color="#A1A1AA" />
                <Text style={styles.draftMetaText}>{evt.location || 'Lokasi belum diisi'}</Text>
                <Text style={styles.draftMetaDot}>•</Text>
                <Ionicons name="people-outline" size={13} color="#A1A1AA" />
                <Text style={styles.draftMetaText}>{evt.max_participants || 0} pax</Text>
              </View>

              {evt.pic_name && (
                <View style={styles.draftPicRow}>
                  <Ionicons name="person-circle-outline" size={14} color="#C5A059" />
                  <Text style={styles.draftPicText}>
                    PIC: {evt.pic_name} {evt.pic_club ? `(${evt.pic_club})` : ''}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.draftActionRow}>
                <Pressable
                  onPress={() => handleDeleteDraft(evt.id, evt.title)}
                  disabled={processing}
                  style={styles.draftDeleteBtn}
                >
                  <Ionicons name="trash-outline" size={14} color="#F87171" />
                  <Text style={styles.draftDeleteBtnText}>Hapus</Text>
                </Pressable>

                <Pressable
                  onPress={() => handlePublishDraft(evt.id, evt.title)}
                  disabled={processing}
                  style={styles.draftPublishBtn}
                >
                  <Ionicons name="paper-plane-outline" size={14} color="#111111" />
                  <Text style={styles.draftPublishBtnText}>Publikasikan</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* 4. Hub Manajemen Toko & Marketplace */}
        <View style={{ marginTop: Spacing.xl }}>
          <SectionHeader title="Toko Resmi & Marketplace" accentColor="#FBBF24" />
        </View>
        <Pressable
          onPress={() => router.push('/(main)/admin/toko' as any)}
          style={styles.tokoBannerCard}
        >
          <View style={styles.tokoBannerIconBox}>
            <Ionicons name="storefront" size={24} color="#FBBF24" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.tokoBannerTitle}>Pusat E-Commerce & Marketplace</Text>
            <Text style={styles.tokoBannerDesc}>
              Kelola sewa lapak, moderasi iklan produk, verifikasi merchant, dan pantau laporan finansial sewa MB INA.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
        </Pressable>

        {/* 5. Aksi Cepat (Platinum Accent Line + Soft Metallic Cards) */}
        <View style={{ marginTop: Spacing.xl }}>
          <SectionHeader title="Aksi Cepat" accentColor="#A1A1AA" />
        </View>
        <View style={styles.quickActions}>
          {[
            { label: 'Buat Event', icon: 'add-circle-outline', onPress: () => router.push('/(main)/event/create' as any) },
            { label: 'Upload Galeri', icon: 'cloud-upload-outline', onPress: () => router.push('/(main)/gallery' as any) },
            { label: 'Toko & Lapak', icon: 'storefront-outline', onPress: () => router.push('/(main)/admin/toko' as any) },
            { label: 'Kelola Sponsor', icon: 'ribbon-outline', onPress: () => router.push('/(main)/sponsorship' as any) },
            { label: 'Bersihkan Duplikat', icon: 'trash-outline', onPress: handleCleanDuplicates },
            { label: 'Laporan Sewa', icon: 'bar-chart-outline', onPress: () => router.push('/(main)/admin/toko' as any) },
          ].map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.quickCard,
                pressed && styles.quickCardPressed,
              ]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.05)' }}
            >
              <View style={styles.quickIconBox}>
                <Ionicons name={action.icon as any} size={18} color="#D4D4D8" />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* Modal Konfirmasi Approval / Reject (Monochrome Metallic) */}
      <Modal
        visible={actionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => !processing && setActionModal({ visible: false, type: 'approve', member: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconBox,
                actionModal.type === 'approve' ? styles.modalIconApprove : styles.modalIconReject,
              ]}
            >
              <Ionicons
                name={actionModal.type === 'approve' ? 'shield-checkmark' : 'alert-circle'}
                size={32}
                color={actionModal.type === 'approve' ? '#F4F4F5' : '#F87171'}
              />
            </View>

            <Text style={styles.modalTitle}>
              {actionModal.type === 'approve' ? 'Setujui Pendaftaran?' : 'Tolak Pendaftaran?'}
            </Text>

            <Text style={styles.modalDesc}>
              {actionModal.type === 'approve'
                ? `Pendaftaran resmi akan disahkan, nomor KTA diterbitkan otomatis, dan status anggota diaktifkan.`
                : `Apakah Anda yakin ingin menolak pendaftaran calon anggota ini?`}
            </Text>

            {/* Member Details Preview */}
            <View style={styles.modalMemberBox}>
              <Text style={styles.modalMemberName}>
                {actionModal.member?.profiles?.full_name || 'Calon Anggota'}
              </Text>
              <Text style={styles.modalMemberSub}>
                {actionModal.member?.chapter || 'Chapter Pusat'}
              </Text>
              <Text style={styles.modalMemberCar}>
                Mercedes-Benz {actionModal.member?.car_model} • {actionModal.member?.car_plate}
              </Text>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalButtonsRow}>
              <Pressable
                style={styles.modalBtnCancel}
                onPress={() => setActionModal({ visible: false, type: 'approve', member: null })}
                disabled={processing}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalBtnSubmit,
                  actionModal.type === 'approve' ? styles.modalBtnApprove : styles.modalBtnReject,
                  processing && { opacity: 0.7 },
                ]}
                onPress={handleConfirmAction}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={actionModal.type === 'approve' ? '#18181B' : '#FFF'} />
                ) : (
                  <Text
                    style={[
                      styles.modalBtnSubmitText,
                      actionModal.type === 'approve' ? styles.modalBtnApproveText : styles.modalBtnRejectText,
                    ]}
                  >
                    {actionModal.type === 'approve' ? 'Setujui & Terbitkan KTA' : 'Ya, Tolak'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.base,
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Toast Notification
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(212, 212, 216, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.base,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  toastText: {
    flex: 1,
    fontSize: 12,
    color: '#F4F4F5',
    fontWeight: '500',
    lineHeight: 18,
  },

  // Empty Queue Card
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)',
    borderRadius: 18,
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#A1A1AA',
    fontWeight: '500',
  },

  // Approval Card
  approvalCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.5)', // bg-zinc-900/50
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)', // border-zinc-800/80
    borderRadius: 18,
    padding: 16,
    marginBottom: Spacing.sm,
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // bg-white/[0.05]
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // border-white/10
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  approvalInfo: { flex: 1 },
  approvalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  chapterBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  approvalChapterText: {
    fontSize: 11,
    color: '#D4D4D8',
    fontWeight: '500',
  },
  approvalPlate: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 3,
    fontWeight: '500',
  },
  approvalDate: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 3,
  },

  // Approval Buttons
  approvalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  rejectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // bg-red-500/10
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)', // border-red-500/20
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F87171', // text-red-400
  },
  approveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F4F4F5', // bg-zinc-100
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  approveBtnPressed: {
    backgroundColor: '#FFFFFF',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#18181B', // text-zinc-900
  },

  // Quick Actions (Soft Metallic Single Row 5-Card Dock)
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 6,
  },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 2,
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)',
    borderRadius: 14,
  },
  quickCardPressed: {
    borderColor: '#3F3F46', // hover:border-zinc-700
    backgroundColor: 'rgba(255, 255, 255, 0.04)', // hover:bg-white/[0.04]
  },
  quickIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLabel: {
    fontSize: 9.5,
    color: '#D4D4D8', // text-zinc-300
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#121316',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    alignItems: 'center',
  },
  modalIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalIconApprove: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalIconReject: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 12,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalMemberBox: {
    width: '100%',
    backgroundColor: '#090A0C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
    gap: 3,
  },
  modalMemberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalMemberSub: {
    fontSize: 11,
    color: '#D4D4D8',
    fontWeight: '500',
  },
  modalMemberCar: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  modalBtnSubmit: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnApprove: {
    backgroundColor: '#F4F4F5',
  },
  modalBtnReject: {
    backgroundColor: '#EF4444',
  },
  modalBtnSubmitText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBtnApproveText: {
    color: '#18181B',
  },
  modalBtnRejectText: {
    color: '#FFFFFF',
  },

  // Empty Draft Card
  emptyDraftCard: {
    backgroundColor: 'rgba(18, 19, 23, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyDraftCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4D4D8',
    marginTop: 4,
  },
  emptyDraftCardSubText: {
    fontSize: 11,
    color: '#71717A',
    textAlign: 'center',
  },

  // Draft Cards
  draftCard: {
    backgroundColor: 'rgba(18, 19, 23, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginBottom: 10,
  },
  draftHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftBadge: {
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  draftBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C5A059',
    letterSpacing: 0.8,
  },
  draftCodeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#A1A1AA',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  draftTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  draftMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftMetaText: {
    fontSize: 11.5,
    color: '#A1A1AA',
  },
  draftMetaDot: {
    fontSize: 11.5,
    color: '#52525B',
  },
  draftPicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  draftPicText: {
    fontSize: 11.5,
    color: '#D4D4D8',
  },
  draftActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  draftDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  draftDeleteBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#F87171',
  },
  draftPublishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
  },
  draftPublishBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#18181B',
  },
  // Toko Banner Card
  tokoBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    marginBottom: Spacing.md,
  },
  tokoBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokoBannerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tokoBannerDesc: {
    fontSize: 11.5,
    color: '#A1A1AA',
    marginTop: 2,
    lineHeight: 16,
  },
});
