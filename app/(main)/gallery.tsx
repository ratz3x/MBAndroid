// ============================================================
// Gallery — Dokumentasi & Media Mercedes-Benz Club Indonesia
// Modern Luxury MBUX Automotive UI
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Modal,
  Image,
  TextInput,
  ScrollView,
  Linking,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/services/supabase';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import {
  galleryService,
  GALLERY_CATEGORIES,
  GalleryAlbum,
  GalleryMediaItem,
} from '../../src/services/galleryService';
import {
  mergeAlbumsWithNativeAds,
  isNativeAd,
  GalleryFeedItem,
} from '../../src/services/adService';
import { NativeAdCard } from '../../src/components/ads/NativeAdCard';

const { width } = Dimensions.get('window');
const GRID_GAP = 14;
const CARD_WIDTH = (width - Spacing.base * 2 - GRID_GAP) / 2;

export default function GalleryScreen() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();

  // Album & Media States
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Album for Detail View
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);

  // Lightbox Viewer State (Inside Album or from Spotlight)
  const [selectedMedia, setSelectedMedia] = useState<{
    media_url: string;
    media_type: 'image' | 'video';
    video_url?: string;
    title: string;
    location: string;
    year: string;
    chapter: string;
    description: string | null;
  } | null>(null);

  // Modal 1: Create New Album (Full Metadata)
  const [createAlbumModalVisible, setCreateAlbumModalVisible] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumCategory, setNewAlbumCategory] = useState('Touring & Rally');
  const [newAlbumCoverUrl, setNewAlbumCoverUrl] = useState('');
  const [newAlbumLocation, setNewAlbumLocation] = useState('');
  const [newAlbumYear, setNewAlbumYear] = useState('2026');
  const [newAlbumChapter, setNewAlbumChapter] = useState('Mercedes-Benz Club Indonesia');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [savingAlbum, setSavingAlbum] = useState(false);

  // Modal 2: Quick Add Media to Album (NO REPETITIVE FORM!)
  const [addMediaModalVisible, setAddMediaModalVisible] = useState(false);
  const [quickMediaType, setQuickMediaType] = useState<'image' | 'video'>('image');
  const [quickMediaUrl, setQuickMediaUrl] = useState('');
  const [quickVideoUrl, setQuickVideoUrl] = useState('');
  const [savingMedia, setSavingMedia] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGallery();

    // Supabase Realtime Channel: Dengarkan media baru dari Admin secara live
    const channel = supabase
      .channel('public:gallery')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gallery' },
        (payload) => {
          console.log('[Gallery Realtime] Change received:', payload.eventType);
          loadGallery();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadGallery() {
    try {
      const albumList = await galleryService.getAlbums();
      setAlbums(albumList);
      // Jika ada album yang sedang dibuka, sinkronkan datanya
      if (selectedAlbum) {
        const updated = albumList.find((a) => a.id === selectedAlbum.id);
        if (updated) setSelectedAlbum(updated);
      }
    } catch (e) {
      console.warn('Error loading gallery albums:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGallery();
    setRefreshing(false);
  };

  // ── Handler: Pilih Cover Album Baru ────────────────────────
  const handlePickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Izin akses galeri diperlukan untuk memilih foto sampul.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setNewAlbumCoverUrl(result.assets[0].uri);
      }
    } catch (err: any) {
      alert('Gagal memilih gambar: ' + err.message);
    }
  };

  // ── Handler: Simpan Album Baru (Admin Only) ─────────────────
  const handleSaveAlbum = async () => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya admin atau pengurus yang berwenang membuat album kegiatan.');
      return;
    }
    if (!newAlbumTitle.trim()) {
      alert('Mohon masukkan judul kegiatan.');
      return;
    }
    if (!newAlbumCoverUrl.trim()) {
      alert('Mohon pilih foto sampul (cover) kegiatan.');
      return;
    }

    setSavingAlbum(true);
    try {
      const created = await galleryService.createAlbum({
        title: newAlbumTitle.trim(),
        category: newAlbumCategory,
        cover_url: newAlbumCoverUrl.trim(),
        location: newAlbumLocation.trim() || 'Indonesia',
        year: newAlbumYear.trim() || new Date().getFullYear().toString(),
        chapter: newAlbumChapter.trim() || 'Mercedes-Benz Club Indonesia',
        description: newAlbumDesc.trim() || undefined,
        created_by: user?.id || '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
      });

      await loadGallery();
      setCreateAlbumModalVisible(false);
      setNewAlbumTitle('');
      setNewAlbumCoverUrl('');
      setNewAlbumLocation('');
      setNewAlbumDesc('');
      alert('Album kegiatan baru berhasil dibuat! Anda kini dapat menambahkan banyak foto ke dalamnya.');
      setSelectedAlbum(created);
    } catch (e: any) {
      alert('Gagal membuat album: ' + e.message);
    } finally {
      setSavingAlbum(false);
    }
  };

  // ── Handler: Pilih Foto Cepat untuk Album Aktif ─────────────
  const handlePickQuickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Izin akses galeri diperlukan.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setQuickMediaUrl(result.assets[0].uri);
      }
    } catch (err: any) {
      alert('Gagal memilih foto: ' + err.message);
    }
  };

  // ── Handler: Tambah Media Cepat ke Album Aktif ──────────────
  // TANPA FORM REPETITIF! Tidak perlu input judul/lokasi/chapter lagi!
  const handleQuickAddMedia = async () => {
    if (!selectedAlbum) return;
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya admin/pengurus yang boleh menambahkan media.');
      return;
    }

    const finalUrl = quickMediaType === 'video' ? quickVideoUrl.trim() : quickMediaUrl.trim();
    if (!finalUrl) {
      alert(quickMediaType === 'video' ? 'Mohon masukkan tautan video YouTube 4K.' : 'Mohon pilih foto.');
      return;
    }

    setSavingMedia(true);
    try {
      await galleryService.addMediaToAlbum({
        album_id: selectedAlbum.id,
        media_url: finalUrl,
        media_type: quickMediaType,
        video_url: quickMediaType === 'video' ? finalUrl : undefined,
        uploaded_by: user?.id || '6c5ee3db-97be-445e-ab99-d03175ad7bc6',
      });

      await loadGallery();
      setAddMediaModalVisible(false);
      setQuickMediaUrl('');
      setQuickVideoUrl('');
      alert('Media berhasil ditambahkan ke dalam album ini!');
    } catch (e: any) {
      alert('Gagal menambahkan media: ' + e.message);
    } finally {
      setSavingMedia(false);
    }
  };

  // Filtered Albums
  const filteredAlbums = useMemo(() => {
    return albums.filter((alb) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const catObj = GALLERY_CATEGORIES.find((c) => c.id === selectedCategory);
        if (catObj && alb.category !== catObj.label) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = alb.title.toLowerCase().includes(q);
        const matchDesc = alb.description?.toLowerCase().includes(q) ?? false;
        const matchLoc = alb.location.toLowerCase().includes(q);
        const matchChap = alb.chapter.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc && !matchChap) {
          return false;
        }
      }

      return true;
    });
  }, [albums, selectedCategory, searchQuery]);

  // Featured Album (Spotlight)
  const featuredAlbum = useMemo(() => {
    return albums.find((a) => a.is_featured) ?? albums[0];
  }, [albums]);

  // Gabungkan album dengan Native Ads (Sponsor Otomotif / Mitra Resmi setiap 5 kegiatan)
  const feedItems = useMemo<GalleryFeedItem[]>(() => {
    return mergeAlbumsWithNativeAds(filteredAlbums, 5);
  }, [filteredAlbums]);

  const totalPhotoCount = useMemo(() => {
    return albums.reduce((acc, alb) => acc + alb.items.filter((i) => i.media_type === 'image').length, 0);
  }, [albums]);

  const totalVideoCount = useMemo(() => {
    return albums.reduce((acc, alb) => acc + alb.items.filter((i) => i.media_type === 'video').length, 0);
  }, [albums]);

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#090A0C" />
      <View style={styles.container}>
        {/* ============================================================ */}
        {/* TOP BAR / HEADER                                            */}
        {/* ============================================================ */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color="#F4F4F5" />
          </Pressable>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerEyebrow}>MERCEDES-BENZ CLUB INDONESIA</Text>
            <Text style={styles.headerTitle}>Album Kegiatan & Galeri</Text>
          </View>
          <View style={styles.headerActionGroup}>
            {isAdmin && (
              <Pressable
                onPress={() => setCreateAlbumModalVisible(true)}
                style={styles.headerUploadBtn}
              >
                <Ionicons name="add-circle" size={14} color="#090A0C" style={{ marginRight: 4 }} />
                <Text style={styles.headerUploadBtnText}>+ Buat Album</Text>
              </Pressable>
            )}
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{albums.length} Album</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={feedItems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#C5A059"
              colors={['#C5A059']}
            />
          }
          ListHeaderComponent={
            <View>
              {/* ============================================================ */}
              {/* FEATURED SPOTLIGHT HERO BANNER                              */}
              {/* ============================================================ */}
              {featuredAlbum && !searchQuery.trim() && selectedCategory === 'all' && (
                <Pressable
                  onPress={() => setSelectedAlbum(featuredAlbum)}
                  style={styles.heroCard}
                >
                  <Image
                    source={{ uri: featuredAlbum.cover_url }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                  <View style={styles.heroGradientOverlay} />

                  {/* Top Badges */}
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroSpotlightPill}>
                      <Ionicons name="star" size={11} color="#C5A059" style={{ marginRight: 4 }} />
                      <Text style={styles.heroSpotlightText}>ALBUM SOROTAN</Text>
                    </View>
                    <View style={styles.heroCategoryPill}>
                      <Text style={styles.heroCategoryText}>{featuredAlbum.category}</Text>
                    </View>
                  </View>

                  {/* Bottom Info */}
                  <View style={styles.heroBottomRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heroTitle} numberOfLines={1}>
                        {featuredAlbum.title}
                      </Text>
                      <Text style={styles.heroLocation} numberOfLines={1}>
                        <Ionicons name="location-outline" size={12} color="#C5A059" />{' '}
                        {featuredAlbum.location} · {featuredAlbum.year} • {featuredAlbum.items.length} Media
                      </Text>
                    </View>
                    <View style={styles.heroActionBtn}>
                      <Ionicons name="albums-outline" size={15} color="#F4F4F5" />
                    </View>
                  </View>
                </Pressable>
              )}

              {/* ============================================================ */}
              {/* CATEGORY FILTER PILLS (MBUX SLEEK GLASS)                    */}
              {/* ============================================================ */}
              <View style={styles.categorySection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {GALLERY_CATEGORIES.map((cat) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedCategory(cat.id)}
                        style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={13}
                          color={isActive ? '#C5A059' : '#A1A1AA'}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.categoryPillText,
                            isActive && styles.categoryPillTextActive,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ============================================================ */}
              {/* SEARCH BAR & TOTAL STATS                                     */}
              {/* ============================================================ */}
              <View style={styles.searchFilterContainer}>
                <View style={styles.searchBar}>
                  <Ionicons
                    name="search-outline"
                    size={16}
                    color="#71717A"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Cari album kegiatan, kota, chapter..."
                    placeholderTextColor="#71717A"
                  />
                  {searchQuery.length > 0 && (
                    <Pressable
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#A1A1AA" />
                    </Pressable>
                  )}
                </View>

                {/* Quick Info Counter */}
                <View style={styles.statsRow}>
                  <View style={styles.statsBadge}>
                    <Ionicons name="albums" size={12} color="#C5A059" style={{ marginRight: 5 }} />
                    <Text style={styles.statsBadgeText}>{albums.length} Album Acara</Text>
                  </View>
                  <View style={styles.statsBadge}>
                    <Ionicons name="images" size={12} color="#A1A1AA" style={{ marginRight: 5 }} />
                    <Text style={styles.statsBadgeText}>{totalPhotoCount} Foto</Text>
                  </View>
                  <View style={styles.statsBadge}>
                    <Ionicons name="videocam" size={12} color="#A1A1AA" style={{ marginRight: 5 }} />
                    <Text style={styles.statsBadgeText}>{totalVideoCount} Video</Text>
                  </View>
                </View>
              </View>

              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentLine} />
                <Text style={styles.sectionTitle}>
                  {selectedCategory === 'all'
                    ? 'DAFTAR ALBUM DOKUMENTASI'
                    : `ALBUM: ${GALLERY_CATEGORIES.find((c) => c.id === selectedCategory)?.label.toUpperCase()}`}
                </Text>
                <Text style={styles.sectionSubCount}>
                  {filteredAlbums.length} album ditemukan
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="albums-outline" size={32} color="#71717A" />
              </View>
              <Text style={styles.emptyTitle}>Album Tidak Ditemukan</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? `Tidak ada album kegiatan yang cocok dengan kata kunci "${searchQuery}".`
                  : 'Belum ada album kegiatan dalam kategori ini.'}
              </Text>
              {(searchQuery || selectedCategory !== 'all') && (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  style={styles.resetFilterBtn}
                >
                  <Text style={styles.resetFilterText}>Reset Filter</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => {
            // Render Native Ad jika item adalah slot sponsor resmi
            if (isNativeAd(item)) {
              return <NativeAdCard ad={item} />;
            }

            const alb = item;
            const photoCount = alb.items.filter((i) => i.media_type === 'image').length;
            const videoCount = alb.items.filter((i) => i.media_type === 'video').length;

            return (
              <Pressable
                onPress={() => setSelectedAlbum(alb)}
                style={({ pressed }) => [
                  styles.albumCard,
                  pressed && styles.albumCardPressed,
                ]}
              >
                {/* Thumbnail Cover 16:9 */}
                <View style={styles.albumImageWrapper}>
                  <Image
                    source={{ uri: alb.cover_url }}
                    style={styles.albumImage}
                    resizeMode="cover"
                  />
                  <View style={styles.albumImageOverlay} />

                  {/* Top Left: Category Badge */}
                  <View style={styles.albumCategoryBadge}>
                    <Text style={styles.albumCategoryText}>{alb.category}</Text>
                  </View>

                  {/* Top Right: Total Media Counter Badge */}
                  <View style={styles.albumMediaCounterBadge}>
                    <Ionicons name="images" size={9} color="#0B0F15" style={{ marginRight: 3 }} />
                    <Text style={styles.albumMediaCounterText}>{alb.items.length}</Text>
                  </View>

                  {/* Bottom Right: Year Pill */}
                  <View style={styles.albumYearBadge}>
                    <Text style={styles.albumYearText}>{alb.year}</Text>
                  </View>
                </View>

                {/* Album Meta Info */}
                <View style={styles.albumInfoContent}>
                  <Text style={styles.albumTitle} numberOfLines={2}>
                    {alb.title}
                  </Text>

                  {/* Location with Muted Gold Icon */}
                  <View style={styles.albumMetaRow}>
                    <Ionicons name="location-sharp" size={12} color="rgba(251, 191, 36, 0.85)" />
                    <Text style={styles.albumLocationText} numberOfLines={1}>
                      {alb.location}
                    </Text>
                  </View>

                  {/* Chapter */}
                  <View style={styles.albumChapterRow}>
                    <Ionicons name="shield-checkmark-outline" size={11} color="#71717A" />
                    <Text style={styles.albumChapterText} numberOfLines={1}>
                      {alb.chapter}
                    </Text>
                  </View>

                  {/* Media Composition Tag */}
                  <View style={styles.albumTagRow}>
                    <Text style={styles.albumTagText}>
                      {photoCount} foto {videoCount > 0 ? `• ${videoCount} video 4K` : ''}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />

        {/* ============================================================ */}
        {/* MODAL: DETAIL ALBUM KEGIATAN (Kumpulan Foto & Video Acara)    */}
        {/* ============================================================ */}
        <Modal
          visible={!!selectedAlbum}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedAlbum(null)}
        >
          {selectedAlbum && (
            <SafeAreaView style={[CommonStyles.safeArea, { backgroundColor: '#090A0C' }]} edges={['top']}>
              {/* Header Detail Album */}
              <View style={styles.detailHeader}>
                <Pressable
                  onPress={() => setSelectedAlbum(null)}
                  style={styles.headerBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                </Pressable>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.headerEyebrow}>DETAIL ALBUM KEGIATAN</Text>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {selectedAlbum.title}
                  </Text>
                </View>
                {isAdmin && (
                  <Pressable
                    onPress={() => setAddMediaModalVisible(true)}
                    style={styles.detailAddBtn}
                  >
                    <Ionicons name="add" size={16} color="#090A0C" />
                    <Text style={styles.detailAddBtnText}>+ Tambah Foto</Text>
                  </Pressable>
                )}
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.detailScrollContent}
              >
                {/* Meta Banner Card */}
                <View style={styles.detailMetaCard}>
                  <View style={styles.detailPillRow}>
                    <View style={styles.detailCategoryPill}>
                      <Text style={styles.detailCategoryText}>{selectedAlbum.category}</Text>
                    </View>
                    <View style={styles.detailYearPill}>
                      <Text style={styles.detailYearText}>{selectedAlbum.year}</Text>
                    </View>
                  </View>

                  <Text style={styles.detailTitle}>{selectedAlbum.title}</Text>

                  <View style={styles.detailInfoRow}>
                    <Ionicons name="location" size={13} color="#C5A059" style={{ marginRight: 4 }} />
                    <Text style={styles.detailInfoText}>{selectedAlbum.location}</Text>
                    <Text style={styles.sheetDot}>•</Text>
                    <Ionicons name="shield-checkmark" size={13} color="#71717A" style={{ marginRight: 4 }} />
                    <Text style={styles.detailInfoSubText}>{selectedAlbum.chapter}</Text>
                  </View>

                  {selectedAlbum.description && (
                    <Text style={styles.detailDesc}>{selectedAlbum.description}</Text>
                  )}

                  {/* Summary Bar */}
                  <View style={styles.detailCountBar}>
                    <Text style={styles.detailCountBarText}>
                      Total {selectedAlbum.items.length} Dokumentasi Terlampir
                    </Text>
                    {isAdmin && (
                      <Text style={styles.detailAdminHintText}>
                        *Klik "+ Tambah Foto" untuk memasukkan media baru ke album ini
                      </Text>
                    )}
                  </View>
                </View>

                {/* Grid Semua Foto & Video Dalam Album Ini */}
                <View style={styles.detailGrid}>
                  {selectedAlbum.items.map((media, idx) => (
                    <Pressable
                      key={media.id}
                      onPress={() =>
                        setSelectedMedia({
                          media_url: media.media_url,
                          media_type: media.media_type,
                          video_url: media.video_url,
                          title: selectedAlbum.title,
                          location: selectedAlbum.location,
                          year: selectedAlbum.year,
                          chapter: selectedAlbum.chapter,
                          description: selectedAlbum.description,
                        })
                      }
                      style={styles.detailGridItem}
                    >
                      <Image
                        source={{ uri: media.thumbnail_url || media.media_url }}
                        style={styles.detailMediaImage}
                        resizeMode="cover"
                      />
                      {media.media_type === 'video' && (
                        <View style={styles.detailVideoBadge}>
                          <Ionicons name="play" size={12} color="#0B0F15" />
                        </View>
                      )}
                      <View style={styles.detailItemIndexBadge}>
                        <Text style={styles.detailItemIndexText}>#{idx + 1}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </SafeAreaView>
          )}
        </Modal>

        {/* ============================================================ */}
        {/* LIGHTBOX / FULL SCREEN VIEWER MODAL                         */}
        {/* ============================================================ */}
        <Modal
          visible={!!selectedMedia}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedMedia(null)}
        >
          {selectedMedia && (
            <View style={styles.lightboxContainer}>
              <SafeAreaView edges={['top']} style={styles.lightboxHeader}>
                <View style={styles.lightboxPill}>
                  <Ionicons name="sparkles" size={12} color="#C5A059" style={{ marginRight: 5 }} />
                  <Text style={styles.lightboxPillText}>Dokumentasi Resmi</Text>
                </View>
                <Pressable
                  onPress={() => setSelectedMedia(null)}
                  style={styles.lightboxCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </Pressable>
              </SafeAreaView>

              <View style={styles.lightboxMediaArea}>
                <Image
                  source={{ uri: selectedMedia.media_url }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />

                {selectedMedia.media_type === 'video' && (
                  <Pressable
                    onPress={() => {
                      if (selectedMedia.video_url) {
                        Linking.openURL(selectedMedia.video_url);
                      }
                    }}
                    style={styles.lightboxVideoOverlay}
                  >
                    <View style={styles.playButtonCircle}>
                      <Ionicons name="play" size={32} color="#090A0C" style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={styles.playButtonText}>Putar Video Resmi (4K)</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.lightboxSheet}>
                <Text style={styles.sheetTitle}>{selectedMedia.title}</Text>
                <View style={styles.sheetLocationRow}>
                  <Ionicons name="location" size={13} color="#C5A059" style={{ marginRight: 4 }} />
                  <Text style={styles.sheetLocationText}>
                    {selectedMedia.location} · {selectedMedia.year}
                  </Text>
                  <Text style={styles.sheetDot}>•</Text>
                  <Text style={styles.sheetChapterText}>{selectedMedia.chapter}</Text>
                </View>

                {selectedMedia.description && (
                  <Text style={styles.sheetDesc} numberOfLines={3}>
                    {selectedMedia.description}
                  </Text>
                )}

                <View style={styles.sheetActionRow}>
                  {selectedMedia.media_type === 'video' && selectedMedia.video_url ? (
                    <Pressable
                      onPress={() => Linking.openURL(selectedMedia.video_url!)}
                      style={styles.actionBtnGold}
                    >
                      <Ionicons name="play-circle" size={16} color="#090A0C" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnGoldText}>Buka Tautan Video</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => Linking.openURL(selectedMedia.media_url)}
                      style={styles.actionBtnGold}
                    >
                      <Ionicons name="expand-outline" size={15} color="#090A0C" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnGoldText}>Resolusi Penuh</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => setSelectedMedia(null)}
                    style={styles.actionBtnSecondary}
                  >
                    <Text style={styles.actionBtnSecondaryText}>Tutup</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </Modal>

        {/* ============================================================ */}
        {/* MODAL 1: BUAT ALBUM BARU OLEH ADMIN (Lengkap dengan Metadata) */}
        {/* ============================================================ */}
        {isAdmin && (
          <Modal
            visible={createAlbumModalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setCreateAlbumModalVisible(false)}
          >
            <View style={styles.uploadModalOverlay}>
              <View style={styles.uploadModalContainer}>
                <View style={styles.uploadModalHeader}>
                  <View>
                    <Text style={styles.uploadModalEyebrow}>KONTROL ADMIN MB CLUB INA</Text>
                    <Text style={styles.uploadModalTitle}>Buat Album Kegiatan Baru</Text>
                  </View>
                  <Pressable
                    onPress={() => setCreateAlbumModalVisible(false)}
                    style={styles.lightboxCloseBtn}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.uploadFormScroll}
                >
                  <Text style={styles.inputLabel}>Judul Kegiatan *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newAlbumTitle}
                    onChangeText={setNewAlbumTitle}
                    placeholder="Contoh: Jamnas XXIII · Konvoi Bintang Nusantara"
                    placeholderTextColor="#71717A"
                  />

                  <Text style={styles.inputLabel}>Kategori Kegiatan *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {[
                      'Touring & Rally',
                      'Jambore Nasional',
                      'Classic Concours',
                      'Track Day & AMG',
                      'Bakti Sosial',
                      'Video Sinematik',
                    ].map((cat) => {
                      const isSel = newAlbumCategory === cat;
                      return (
                        <Pressable
                          key={cat}
                          onPress={() => setNewAlbumCategory(cat)}
                          style={[styles.modalCatChip, isSel && styles.modalCatChipActive]}
                        >
                          <Text style={[styles.modalCatChipText, isSel && styles.modalCatChipTextActive]}>
                            {cat}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.inputLabel}>Foto Sampul (Cover 16:9) *</Text>
                  {newAlbumCoverUrl ? (
                    <View style={styles.previewImageContainer}>
                      <Image source={{ uri: newAlbumCoverUrl }} style={styles.previewImage} resizeMode="cover" />
                      <Pressable onPress={() => setNewAlbumCoverUrl('')} style={styles.removePreviewBtn}>
                        <Ionicons name="trash" size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.pickerBox}>
                      <Pressable onPress={handlePickCoverImage} style={styles.pickFileBtn}>
                        <Ionicons name="image-outline" size={18} color="#C5A059" style={{ marginRight: 6 }} />
                        <Text style={styles.pickFileBtnText}>Pilih Foto Sampul dari Perangkat</Text>
                      </Pressable>
                      <Text style={styles.pickerOrText}>atau masukkan URL foto:</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={newAlbumCoverUrl}
                        onChangeText={setNewAlbumCoverUrl}
                        placeholder="https://images.unsplash.com/..."
                        placeholderTextColor="#71717A"
                      />
                    </View>
                  )}

                  <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Kota & Lokasi *</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={newAlbumLocation}
                        onChangeText={setNewAlbumLocation}
                        placeholder="Contoh: Banyuwangi, Jatim"
                        placeholderTextColor="#71717A"
                      />
                    </View>
                    <View style={{ width: 90 }}>
                      <Text style={styles.inputLabel}>Tahun *</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={newAlbumYear}
                        onChangeText={setNewAlbumYear}
                        keyboardType="numeric"
                        placeholder="2026"
                        placeholderTextColor="#71717A"
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Chapter / Klub Penyelenggara</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newAlbumChapter}
                    onChangeText={setNewAlbumChapter}
                    placeholder="Contoh: Pengurus Pusat MB INA"
                    placeholderTextColor="#71717A"
                  />

                  <Text style={styles.inputLabel}>Deskripsi Lengkap Kegiatan</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                    value={newAlbumDesc}
                    onChangeText={setNewAlbumDesc}
                    multiline
                    numberOfLines={3}
                    placeholder="Tuliskan catatan rute, momen spesial, atau jumlah peserta..."
                    placeholderTextColor="#71717A"
                  />

                  <Pressable
                    onPress={handleSaveAlbum}
                    disabled={savingAlbum}
                    style={[styles.modalSubmitBtn, savingAlbum && { opacity: 0.6 }]}
                  >
                    {savingAlbum ? (
                      <ActivityIndicator size="small" color="#090A0C" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#090A0C" style={{ marginRight: 6 }} />
                        <Text style={styles.modalSubmitBtnText}>Buat Album & Buka Detail</Text>
                      </>
                    )}
                  </Pressable>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* ============================================================ */}
        {/* MODAL 2: TAMBAH MEDIA CEPAT KE ALBUM (TANPA FORM REPETITIF!) */}
        {/* ============================================================ */}
        {isAdmin && selectedAlbum && (
          <Modal
            visible={addMediaModalVisible}
            animationType="fade"
            transparent
            onRequestClose={() => setAddMediaModalVisible(false)}
          >
            <View style={styles.uploadModalOverlay}>
              <View style={[styles.uploadModalContainer, { maxHeight: '65%' }]}>
                <View style={styles.uploadModalHeader}>
                  <View>
                    <Text style={styles.uploadModalEyebrow}>TAMBAH MEDIA KE ALBUM</Text>
                    <Text style={styles.uploadModalTitle} numberOfLines={1}>
                      {selectedAlbum.title}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setAddMediaModalVisible(false)}
                    style={styles.lightboxCloseBtn}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>

                <View style={{ padding: Spacing.base }}>
                  <Text style={styles.inputLabel}>Tipe Media</Text>
                  <View style={styles.mediaTypeSwitchRow}>
                    <Pressable
                      onPress={() => setQuickMediaType('image')}
                      style={[
                        styles.mediaTypeSwitchBtn,
                        quickMediaType === 'image' && styles.mediaTypeSwitchBtnActive,
                      ]}
                    >
                      <Ionicons
                        name="image"
                        size={15}
                        color={quickMediaType === 'image' ? '#090A0C' : '#A1A1AA'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.mediaTypeSwitchText,
                          quickMediaType === 'image' && styles.mediaTypeSwitchTextActive,
                        ]}
                      >
                        Foto Dokumentasi
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setQuickMediaType('video')}
                      style={[
                        styles.mediaTypeSwitchBtn,
                        quickMediaType === 'video' && styles.mediaTypeSwitchBtnActive,
                      ]}
                    >
                      <Ionicons
                        name="videocam"
                        size={15}
                        color={quickMediaType === 'video' ? '#090A0C' : '#A1A1AA'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.mediaTypeSwitchText,
                          quickMediaType === 'video' && styles.mediaTypeSwitchTextActive,
                        ]}
                      >
                        Video 4K (YouTube)
                      </Text>
                    </Pressable>
                  </View>

                  {quickMediaType === 'image' ? (
                    <View style={{ marginTop: 8 }}>
                      {quickMediaUrl ? (
                        <View style={[styles.previewImageContainer, { height: 140 }]}>
                          <Image source={{ uri: quickMediaUrl }} style={styles.previewImage} resizeMode="cover" />
                          <Pressable onPress={() => setQuickMediaUrl('')} style={styles.removePreviewBtn}>
                            <Ionicons name="trash" size={14} color="#FFFFFF" />
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.pickerBox}>
                          <Pressable onPress={handlePickQuickPhoto} style={styles.pickFileBtn}>
                            <Ionicons name="images-outline" size={18} color="#C5A059" style={{ marginRight: 6 }} />
                            <Text style={styles.pickFileBtnText}>Pilih Foto dari Galeri HP</Text>
                          </Pressable>
                          <Text style={styles.pickerOrText}>atau masukkan URL foto langsung:</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={quickMediaUrl}
                            onChangeText={setQuickMediaUrl}
                            placeholder="https://images.unsplash.com/..."
                            placeholderTextColor="#71717A"
                          />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.inputLabel}>Tautan Video YouTube 4K</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={quickVideoUrl}
                        onChangeText={setQuickVideoUrl}
                        placeholder="https://www.youtube.com/watch?v=..."
                        placeholderTextColor="#71717A"
                      />
                    </View>
                  )}

                  <Pressable
                    onPress={handleQuickAddMedia}
                    disabled={savingMedia}
                    style={[styles.modalSubmitBtn, savingMedia && { opacity: 0.6 }]}
                  >
                    {savingMedia ? (
                      <ActivityIndicator size="small" color="#090A0C" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={17} color="#090A0C" style={{ marginRight: 6 }} />
                        <Text style={styles.modalSubmitBtnText}>Simpan ke Album Ini</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// STYLESHEET — Mercedes-Benz MBUX Modern Luxury Aesthetic
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A0C',
  },

  // Header Bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#090A0C',
  },
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C5A059',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
  },
  headerUploadBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#090A0C',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerEyebrow: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#C5A059',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginTop: 1,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4D4D8',
  },

  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },

  // Featured Hero Card
  heroCard: {
    width: '100%',
    height: 205,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: Spacing.base,
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 16,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 10, 12, 0.45)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSpotlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(10, 12, 16, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
  },
  heroSpotlightText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C5A059',
    letterSpacing: 0.8,
  },
  heroCategoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(10, 12, 16, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F4F4F5',
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroLocation: {
    fontSize: 11.5,
    color: '#E4E4E7',
    marginTop: 3,
    fontWeight: '500',
  },
  heroActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(10, 12, 16, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category Pills
  categorySection: {
    marginTop: Spacing.base,
  },
  categoryScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryPillActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderColor: 'rgba(197, 160, 89, 0.45)',
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#A1A1AA',
    letterSpacing: 0.2,
  },
  categoryPillTextActive: {
    color: '#F4F4F5',
    fontWeight: '700',
  },

  // Search & Filter
  searchFilterContainer: {
    marginTop: Spacing.md,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  typeChipActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderColor: 'rgba(197, 160, 89, 0.45)',
  },
  typeChipText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#F4F4F5',
    fontWeight: '700',
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionAccentLine: {
    width: 3,
    height: 16,
    backgroundColor: '#C5A059',
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E7',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flex: 1,
  },
  sectionSubCount: {
    fontSize: 11,
    color: '#71717A',
  },

  // Grid & Album Cards (MBUX Modern Luxury)
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  albumCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 22, 31, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
      } as any,
    }),
  },
  albumCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
    borderColor: 'rgba(197, 160, 89, 0.35)',
  },
  albumImageWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0E1117',
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 21, 0.25)',
  },
  albumCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      } as any,
    }),
  },
  albumCategoryText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#D4D4D8',
    letterSpacing: 0.3,
  },
  albumVideoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#C5A059',
  },
  albumVideoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0B0F15',
    letterSpacing: 0.5,
  },
  albumYearBadge: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  albumYearText: {
    fontSize: 8.5,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  albumInfoContent: {
    padding: 12,
  },
  albumTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  albumMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  albumLocationText: {
    fontSize: 11,
    color: '#A1A1AA',
    flex: 1,
  },
  albumChapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  albumChapterText: {
    fontSize: 10,
    color: '#71717A',
    flex: 1,
  },

  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFilterBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
  },
  resetFilterText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#C5A059',
  },

  // Lightbox Modal
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(6, 8, 12, 0.96)',
    justifyContent: 'space-between',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    zIndex: 10,
  },
  lightboxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  lightboxPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F4F4F5',
    letterSpacing: 0.5,
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxMediaArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    position: 'relative',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
    maxHeight: 380,
  },
  lightboxVideoOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#C5A059',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  playButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  lightboxSheet: {
    backgroundColor: 'rgba(18, 20, 26, 0.9)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  sheetLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  sheetLocationText: {
    fontSize: 12,
    color: '#C5A059',
    fontWeight: '500',
  },
  sheetDot: {
    color: '#71717A',
    marginHorizontal: 6,
  },
  sheetChapterText: {
    fontSize: 11.5,
    color: '#A1A1AA',
  },
  sheetDesc: {
    fontSize: 12.5,
    color: '#D4D4D8',
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 16,
  },
  sheetActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnGold: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C5A059',
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnGoldText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#090A0C',
    letterSpacing: 0.3,
  },
  actionBtnSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#F4F4F5',
  },

  // Upload Modal Styles
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 8, 0.85)',
    justifyContent: 'flex-end',
  },
  uploadModalContainer: {
    backgroundColor: 'rgba(16, 18, 24, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
  },
  uploadModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  uploadModalEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C5A059',
    letterSpacing: 1.2,
  },
  uploadModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  uploadFormScroll: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#D4D4D8',
    marginBottom: 6,
    marginTop: 10,
  },
  mediaTypeSwitchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  mediaTypeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mediaTypeSwitchBtnActive: {
    backgroundColor: '#C5A059',
    borderColor: '#C5A059',
  },
  mediaTypeSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  mediaTypeSwitchTextActive: {
    color: '#090A0C',
    fontWeight: '800',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  modalCatChipActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderColor: 'rgba(197, 160, 89, 0.45)',
  },
  modalCatChipText: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  modalCatChipTextActive: {
    color: '#F4F4F5',
    fontWeight: '700',
  },
  previewImageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 4,
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePreviewBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBox: {
    gap: 8,
    marginTop: 4,
  },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(197, 160, 89, 0.45)',
  },
  pickFileBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F4F4F5',
  },
  pickerOrText: {
    fontSize: 10.5,
    color: '#71717A',
    textAlign: 'center',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C5A059',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 22,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#090A0C',
    letterSpacing: 0.3,
  },

  // Stats Bar (Top)
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4D4D8',
  },

  // Album Card Extra Badges
  albumMediaCounterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#C5A059',
  },
  albumMediaCounterText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0B0F15',
    letterSpacing: 0.3,
  },
  albumTagRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  albumTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C5A059',
    letterSpacing: 0.2,
  },

  // Album Detail Modal
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#090A0C',
  },
  detailAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C5A059',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 4,
  },
  detailAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#090A0C',
  },
  detailScrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  detailMetaCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(18, 22, 31, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    padding: 16,
    marginBottom: 20,
  },
  detailPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailCategoryPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
  },
  detailCategoryText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#C5A059',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailYearPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailYearText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  detailInfoText: {
    fontSize: 12,
    color: '#E4E4E7',
    fontWeight: '500',
  },
  detailInfoSubText: {
    fontSize: 11.5,
    color: '#A1A1AA',
  },
  detailDesc: {
    fontSize: 12.5,
    color: '#A1A1AA',
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 12,
  },
  detailCountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailCountBarText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  detailAdminHintText: {
    fontSize: 10.5,
    color: '#C5A059',
    fontStyle: 'italic',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailGridItem: {
    width: (width - Spacing.base * 2 - 12) / 2,
    aspectRatio: 16 / 10,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#12161F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailMediaImage: {
    width: '100%',
    height: '100%',
  },
  detailVideoBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#C5A059',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailItemIndexBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  detailItemIndexText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
