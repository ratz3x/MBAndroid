// ============================================================
// NativeAdCard — Komponen Iklan Menyatu (Mercedes-Benz MBUX Style)
// Desain 100% selaras dengan Card Album Kegiatan Galeri
// ============================================================

import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '../../constants/theme';
import type { NativeAdItem } from '../../services/adService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.base * 2 - Spacing.sm) / 2;

interface NativeAdCardProps {
  ad: NativeAdItem;
  onPress?: () => void;
}

export const NativeAdCard: React.FC<NativeAdCardProps> = ({ ad, onPress }) => {
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
        styles.adCard,
        pressed && styles.adCardPressed,
      ]}
    >
      {/* 16:9 Thumbnail Image Wrapper */}
      <View style={styles.adImageWrapper}>
        <Image
          source={{ uri: ad.image_url }}
          style={styles.adImage}
          resizeMode="cover"
        />
        <View style={styles.adImageOverlay} />

        {/* Top Left: Sponsor Badge (Gold/MBUX) */}
        <View style={styles.sponsorBadge}>
          <Ionicons name="sparkles" size={9} color="#C5A059" style={{ marginRight: 3 }} />
          <Text style={styles.sponsorBadgeText}>{ad.badge_label}</Text>
        </View>

        {/* Top Right: Discount or Privilege Tag */}
        {ad.discount_tag ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{ad.discount_tag}</Text>
          </View>
        ) : null}
      </View>

      {/* Content Section */}
      <View style={styles.adInfoContent}>
        {/* Title */}
        <Text style={styles.adTitle} numberOfLines={2}>
          {ad.title}
        </Text>

        {/* Sponsor Brand Name with Verified Checkmark */}
        <View style={styles.sponsorBrandRow}>
          <Ionicons name="checkmark-circle" size={12} color="#C5A059" style={{ marginRight: 4 }} />
          <Text style={styles.sponsorBrandText} numberOfLines={1}>
            {ad.sponsor_name}
          </Text>
        </View>

        {/* Tagline / Category */}
        <View style={styles.taglineRow}>
          <Text style={styles.taglineText} numberOfLines={1}>
            {ad.tagline}
          </Text>
        </View>

        {/* CTA Button */}
        <View style={styles.ctaButtonWrapper}>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>{ad.cta_text}</Text>
            <Ionicons name="arrow-forward" size={11} color="#090A0C" style={{ marginLeft: 3 }} />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  adCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 22, 31, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)', // Subtle gold border for official sponsor
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
  adCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
    borderColor: 'rgba(197, 160, 89, 0.6)',
  },
  adImageWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0E1117',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 21, 0.2)',
  },
  sponsorBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(11, 15, 21, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      } as any,
    }),
  },
  sponsorBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#C5A059',
    letterSpacing: 0.5,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: '#C5A059',
  },
  discountBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#090A0C',
    letterSpacing: 0.3,
  },
  adInfoContent: {
    padding: 12,
    justifyContent: 'space-between',
  },
  adTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  sponsorBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  sponsorBrandText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C5A059',
    flex: 1,
  },
  taglineRow: {
    marginTop: 3,
  },
  taglineText: {
    fontSize: 10,
    color: '#A1A1AA',
  },
  ctaButtonWrapper: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C5A059',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#090A0C',
    letterSpacing: 0.2,
  },
});
