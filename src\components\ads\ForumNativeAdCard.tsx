// ============================================================
// ForumNativeAdCard — Iklan Menyatu Khusus Halaman Forum Diskusi
// Tampilan 100% selaras dengan ThreadCard (Gaya Thread Rekomendasi Resmi)
// ============================================================

import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeAdItem } from '../../services/adService';

interface ForumNativeAdCardProps {
  ad: NativeAdItem;
  onPress?: () => void;
}

export const ForumNativeAdCard: React.FC<ForumNativeAdCardProps> = ({ ad, onPress }) => {
  const handleOpenAd = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (ad.cta_url) {
      Linking.openURL(ad.cta_url).catch((err) =>
        console.warn('Could not open ad URL:', err)
      );
    }
  };

  return (
    <Pressable
      onPress={handleOpenAd}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      {/* ── 1. Top Row: Identitas Mitra & Badge Sponsor ─────── */}
      <View style={styles.topRow}>
        <View style={styles.authorRow}>
          <View style={styles.avatarWrap}>
            <Ionicons name="shield-checkmark" size={18} color="#C5A059" />
          </View>
          <View style={styles.authorMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.authorName} numberOfLines={1}>
                {ad.sponsor_name}
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={13}
                color="#C5A059"
                style={{ marginLeft: 4 }}
              />
            </View>
            <Text style={styles.subText}>Mitra Teknis Terverifikasi MB INA</Text>
          </View>
        </View>

        {/* Badge Sponsor Resmi */}
        <View style={styles.sponsorBadge}>
          <Ionicons name="sparkles" size={10} color="#C5A059" style={{ marginRight: 4 }} />
          <Text style={styles.sponsorBadgeText}>{ad.badge_label}</Text>
        </View>
      </View>

      {/* ── 2. Banner Foto 16:9 / 21:9 Elegan ────────────────── */}
      {ad.image_url ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: ad.image_url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          {ad.discount_tag ? (
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>{ad.discount_tag}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── 3. Judul & Cuplikan Konten ───────────────────────── */}
      <Text style={styles.title}>{ad.title}</Text>
      <Text style={styles.description} numberOfLines={3}>
        {ad.description}
      </Text>

      {/* ── 4. Bottom Row: Kategori & Tombol Aksi ────────────── */}
      <View style={styles.bottomRow}>
        <View style={styles.categoryPill}>
          <Ionicons name="build" size={11} color="#A1A1AA" style={{ marginRight: 4 }} />
          <Text style={styles.categoryPillText}>{ad.category}</Text>
        </View>

        <View style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>{ad.cta_text}</Text>
          <Ionicons name="arrow-forward" size={11} color="#090A0C" style={{ marginLeft: 4 }} />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111215',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)', // Golden MBUX accent
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
      } as any,
    }),
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
    borderColor: 'rgba(197, 160, 89, 0.65)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorMeta: {
    marginLeft: 10,
    justifyContent: 'center',
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  subText: {
    fontSize: 10.5,
    color: '#71717A',
    marginTop: 2,
  },
  sponsorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.45)',
  },
  sponsorBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C5A059',
    letterSpacing: 0.4,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
    backgroundColor: '#0D0E12',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 10, 12, 0.25)',
  },
  discountPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: '#C5A059',
  },
  discountPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#090A0C',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: '#A1A1AA',
    lineHeight: 18,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  categoryPillText: {
    fontSize: 10.5,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C5A059',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#090A0C',
    letterSpacing: 0.2,
  },
});
