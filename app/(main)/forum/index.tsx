// ============================================================
// Forum — Forum Diskusi (Mercedes-Benz Club Indonesia)
// Tampilan Menyerupai Desain Screenshot
// Catatan: List diskusi dibiarkan kosong (tanpa data dummy)
// ============================================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../src/services/supabase';
import { ThreadCard } from '../../../src/components/forum/ThreadCard';
import { ForumNativeAdCard } from '../../../src/components/ads/ForumNativeAdCard';
import { CURATED_FORUM_ADS } from '../../../src/services/adService';
import { useAuth } from '../../../src/context/AuthContext';
import { useProfile } from '../../../src/hooks/useProfile';
import { TierService } from '../../../src/services/tierService';
import { SponsorService } from '../../../src/services/sponsorService';

const KOPERASI_LOGO = require('../../../assets/images/logo-koperasi.jpg');
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../../src/constants/theme';
import type { ForumCategory, ForumThread } from '../../../src/types/database.types';

type CategoryKey = 'all' | 'teknis' | 'pasaran' | 'santai' | 'info' | 'koperasi';
type TabSort = 'terbaru' | 'populer' | 'tanpa_jawaban';

interface CategoryItem {
  key: CategoryKey;
  dbCategory?: ForumCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryItem[] = [
  { key: 'all', label: 'Semua', icon: 'grid-outline' },
  { key: 'teknis', dbCategory: 'teknis_restorasi', label: 'Teknis', icon: 'build-outline' },
  { key: 'pasaran', dbCategory: 'pasaran_mobil', label: 'Pasaran', icon: 'cart-outline' },
  { key: 'santai', dbCategory: 'nongkrong_santai', label: 'Santai', icon: 'cafe-outline' },
  { key: 'info', dbCategory: 'pengumuman', label: 'Info', icon: 'megaphone-outline' },
  { key: 'koperasi', dbCategory: 'koperasi', label: 'Koperasi', icon: 'business-outline' },
];

export default function ForumScreen() {
  const router = useRouter();
  const { user, profile: authProfile } = useAuth();
  const { member, profile } = useProfile(user?.id);
  const memberNum = member?.member_number || (profile as any)?.member_number || (authProfile as any)?.member_number;
  const [sponsorForumInfo, setSponsorForumInfo] = useState<any>(null);

  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');
  const [activeTab, setActiveTab] = useState<TabSort>('terbaru');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // ── State Modal Buat Topik Baru ─────────────────────────────
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<ForumCategory>('teknis_restorasi');
  const [submitting, setSubmitting] = useState(false);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('forum_threads')
        .select(`
          *,
          author:profiles(full_name, avatar_url),
          likes:forum_likes(user_id)
        `);

      const currentCat = CATEGORIES.find((c) => c.key === selectedCategory);
      if (currentCat && currentCat.dbCategory) {
        query = query.eq('category', currentCat.dbCategory);
      }

      if (activeTab === 'terbaru') {
        query = query.order('created_at', { ascending: false });
      } else if (activeTab === 'populer') {
        query = query.order('view_count', { ascending: false });
      } else if (activeTab === 'tanpa_jawaban') {
        query = query.eq('reply_count', 0).order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);
      if (!error && data) {
        setThreads(data);
      } else {
        setThreads([]);
      }
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, activeTab]);

  useFocusEffect(
    useCallback(() => {
      fetchThreads();
    }, [fetchThreads])
  );

  const handleOpenCreateModal = async () => {
    // Validasi hak akses forum untuk mitra sponsor resmi (3 bulan)
    const sponsorCheck = await SponsorService.checkSponsorForumAccess(memberNum);
    if (sponsorCheck.isSponsor && !sponsorCheck.canPost) {
      Alert.alert(
        'Masa Aktif Sponsor Berakhir',
        sponsorCheck.reason ||
          'Masa aktif fasilitas forum untuk Mitra Sponsor (3 bulan) telah berakhir. Silakan hubungi Admin MB INA untuk perpanjangan.'
      );
      return;
    }
    setSponsorForumInfo(sponsorCheck);

    // Sesuaikan kategori default dengan tab kategori yang sedang aktif jika bukan 'all'
    const current = CATEGORIES.find((c) => c.key === selectedCategory);
    if (current && current.dbCategory) {
      setNewCategory(current.dbCategory);
    } else {
      setNewCategory('teknis_restorasi');
    }
    setCreateModalVisible(true);
  };

  const handleCreateTopic = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Form Belum Lengkap', 'Silakan isi judul topik diskusi.');
      return;
    }
    if (!newContent.trim()) {
      Alert.alert('Form Belum Lengkap', 'Silakan isi pesan atau detail diskusi.');
      return;
    }

    // Validasi masa aktif forum sponsor saat submit
    const sponsorCheck = await SponsorService.checkSponsorForumAccess(memberNum);
    if (sponsorCheck.isSponsor && !sponsorCheck.canPost) {
      Alert.alert('Masa Aktif Sponsor Berakhir', sponsorCheck.reason);
      return;
    }

    setSubmitting(true);
    try {
      let authorId = user?.id;
      if (!authorId) {
        // Fallback profile super_admin bila belum login session Supabase
        const { data: prof } = await (supabase.from('profiles') as any).select('id').limit(1).single();
        authorId = prof?.id || '6c5ee3db-97be-445e-ab99-d03175ad7bc6';
      }

      const newThreadPayload = {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        author_id: authorId,
        is_pinned: false,
        is_locked: false,
        reply_count: 0,
        view_count: 1,
        last_reply_at: new Date().toISOString(),
      };

      const { data, error } = await (supabase.from('forum_threads') as any)
        .insert(newThreadPayload)
        .select()
        .single();

      if (error) throw error;

      if (authorId) {
        try {
          await TierService.addPoints(
            authorId,
            1,
            `Membuat topik diskusi: "${newTitle.trim().slice(0, 30)}..."`
          );
        } catch {}
      }

      Alert.alert('Berhasil! 🎉', 'Topik diskusi Anda telah berhasil diterbitkan (+1 Poin Loyalitas).');
      setNewTitle('');
      setNewContent('');
      setCreateModalVisible(false);
      fetchThreads();
    } catch (err: any) {
      Alert.alert('Gagal Menerbitkan Diskusi', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase().trim();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.content && t.content.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── 1. Top Header ───────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>Forum Diskusi</Text>
        <Pressable
          onPress={handleOpenCreateModal}
          android_ripple={{ color: 'rgba(0,0,0,0.2)', borderless: true }}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color="#111111" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 2. Category Square Cards (Horizontal) ────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={styles.categoryScrollView}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setSelectedCategory(cat.key)}
                style={[
                  styles.categoryBox,
                  isSelected ? styles.categoryBoxActive : styles.categoryBoxInactive,
                ]}
              >
                {cat.key === 'koperasi' ? (
                  <Image
                    source={KOPERASI_LOGO}
                    style={[
                      styles.koperasiLogoIcon,
                      isSelected && styles.koperasiLogoIconActive,
                    ]}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons
                    name={cat.icon}
                    size={24}
                    color={isSelected ? '#111111' : '#A1A1AA'}
                  />
                )}
                <Text
                  style={[
                    styles.categoryBoxText,
                    isSelected ? styles.categoryBoxTextActive : styles.categoryBoxTextInactive,
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── 3. Search Bar ────────────────────────────────────────── */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search-outline" size={17} color="#71717A" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari diskusi..."
            placeholderTextColor="#52525B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#71717A" />
            </Pressable>
          )}
        </View>

        {/* ── 4. Filter Tabs: Terbaru, Populer, Tanpa Jawaban ──────── */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setActiveTab('terbaru')}
            style={styles.tabItem}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'terbaru' ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              Terbaru
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('populer')}
            style={styles.tabItem}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'populer' ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              Populer
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('tanpa_jawaban')}
            style={styles.tabItem}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'tanpa_jawaban' ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              Tanpa Jawaban
            </Text>
          </Pressable>
        </View>

        {/* ── 5. List Thread / Diskusi ─────────────────────────────── */}
        {filteredThreads.length > 0 ? (
          filteredThreads.map((item, index) => (
            <React.Fragment key={item.id}>
              <ThreadCard
                thread={item}
                currentUserId={user?.id}
                onPress={() => router.push(`/(main)/forum/${item.id}` as any)}
              />
              {/* Sisipkan 1 Native Ad hanya jika jumlah thread cukup banyak (setelah thread ke-3) */}
              {filteredThreads.length >= 4 && index === 2 && (
                <ForumNativeAdCard ad={CURATED_FORUM_ADS[1]} />
              )}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={36} color="#C5A059" />
            </View>
            <Text style={styles.emptyTitle}>Belum Ada Diskusi</Text>
            <Text style={styles.emptySubtitle}>
              Mulai topik diskusi pertama Anda di kategori {CATEGORIES.find((c) => c.key === selectedCategory)?.label || 'ini'} dengan menekan tombol (+) di atas.
            </Text>
          </View>
        )}

        {/* ── 6. Rekomendasi Mitra Teknis & Sponsor Forum (Hanya jika belum ada iklan di feed) ── */}
        {filteredThreads.length < 4 && (
          <View style={styles.sponsorSection}>
            <View style={styles.sponsorSectionHeader}>
              <View style={styles.sponsorAccentLine} />
              <Text style={styles.sponsorSectionTitle}>REKOMENDASI & MITRA TEKNIS RESMI</Text>
            </View>
            <ForumNativeAdCard ad={CURATED_FORUM_ADS[0]} />
          </View>
        )}
      </ScrollView>

      {/* ── Modal Buat Topik Diskusi Baru ───────────────────────── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="chatbubbles" size={18} color="#C5A059" />
                </View>
                <Text style={styles.modalTitle}>Buat Topik Baru</Text>
              </View>

              <Pressable
                onPress={() => setCreateModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* Banner Fasilitas Sponsor Aktif */}
              {sponsorForumInfo?.isSponsor && (
                <View
                  style={{
                    backgroundColor: 'rgba(251, 191, 36, 0.12)',
                    borderWidth: 1,
                    borderColor: '#FBBF24',
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 12,
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="star" size={18} color="#FBBF24" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FBBF24', fontWeight: '800', fontSize: 12 }}>
                      ⭐ Mitra Sponsor Resmi MB INA
                    </Text>
                    <Text style={{ color: '#D4D4D8', fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                      Hak Akses & Posting Forum Aktif selama 3 Bulan ({memberNum}) — Sisa masa aktif: {sponsorForumInfo.remainingDays} hari
                    </Text>
                  </View>
                </View>
              )}

              {/* Pilih Kategori Diskusi */}
              <Text style={styles.inputLabel}>Pilih Kategori Diskusi *</Text>
              <View style={styles.categorySelectRow}>
                {CATEGORIES.filter((c) => c.dbCategory).map((cat) => {
                  const isSelected = newCategory === cat.dbCategory;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => cat.dbCategory && setNewCategory(cat.dbCategory)}
                      style={[
                        styles.catSelectChip,
                        isSelected && styles.catSelectChipActive,
                      ]}
                    >
                      {cat.key === 'koperasi' ? (
                        <Image
                          source={KOPERASI_LOGO}
                          style={styles.koperasiModalLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons
                          name={cat.icon}
                          size={14}
                          color={isSelected ? '#111111' : '#A1A1AA'}
                        />
                      )}
                      <Text
                        style={[
                          styles.catSelectChipText,
                          isSelected && styles.catSelectChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Judul Topik */}
              <Text style={styles.inputLabel}>Judul Topik Diskusi *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="contoh: Tips Merawat W124 di Musim Hujan"
                placeholderTextColor="#52525B"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Isi Pesan / Pembahasan */}
              <Text style={styles.inputLabel}>Isi Pesan / Pembahasan *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Tuliskan pertanyaan, tips, atau bahan diskusi Anda secara rinci..."
                placeholderTextColor="#52525B"
                value={newContent}
                onChangeText={setNewContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Action Buttons */}
              <View style={styles.modalActionRow}>
                <Pressable
                  onPress={() => setCreateModalVisible(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </Pressable>

                <Pressable
                  onPress={handleCreateTopic}
                  disabled={submitting}
                  style={styles.submitBtn}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#111111" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={16} color="#111111" />
                      <Text style={styles.submitBtnText}>Terbitkan Topik</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090A0C',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C5A059',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },

  // Category Boxes
  categoryScrollView: {
    marginBottom: 16,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  categoryBox: {
    width: 68,
    height: 68,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  categoryBoxActive: {
    backgroundColor: '#C5A059',
  },
  categoryBoxInactive: {
    backgroundColor: '#16171B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryBoxText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBoxTextActive: {
    color: '#111111',
  },
  categoryBoxTextInactive: {
    color: '#A1A1AA',
  },

  // Search Bar
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16171B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    padding: 0,
  },

  // Sub Tabs (Terbaru, Populer, Tanpa Jawaban)
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabText: {
    fontSize: 13.5,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabTextInactive: {
    color: '#71717A',
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  // ── Create Modal Styles ─────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  createModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#111215',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D4D4D8',
    marginBottom: 8,
    marginTop: 10,
  },
  categorySelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  catSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catSelectChipActive: {
    backgroundColor: '#C5A059',
    borderColor: '#C5A059',
  },
  catSelectChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  catSelectChipTextActive: {
    color: '#111111',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#18191E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  submitBtn: {
    flex: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#C5A059',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111111',
  },
  sponsorSection: {
    marginTop: 20,
    marginBottom: 28,
  },
  sponsorSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sponsorAccentLine: {
    width: 3,
    height: 14,
    backgroundColor: '#C5A059',
    borderRadius: 2,
    marginRight: 8,
  },
  sponsorSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C5A059',
    letterSpacing: 1.2,
  },
  koperasiLogoIcon: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
  },
  koperasiLogoIconActive: {
    borderColor: '#111111',
  },
  koperasiModalLogo: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    marginRight: 4,
  },
});

