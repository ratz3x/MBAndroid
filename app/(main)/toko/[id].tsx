// ============================================================
// Detail Produk & Iklan Marketplace — Mercedes-Benz Club Indonesia
// Mengadopsi Proses Bisnis Modul M7 MBCINA
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, CommonStyles } from '../../../src/constants/theme';
import { LuxuryCard } from '../../../src/components/ui/LuxuryCard';
import {
  MarketplaceService,
  type LapakProduct,
} from '../../../src/services/marketplaceService';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<LapakProduct | null>(null);

  useEffect(() => {
    if (!id) return;
    MarketplaceService.getProductById(id).then((p) => {
      if (p) setProduct(p);
    });
  }, [id]);

  const handleContactWhatsApp = async () => {
    if (!product) return;

    // Record interaction in marketplace service
    await MarketplaceService.recordInteraction(
      product.lapak_id,
      product.lapak_name || 'Lapak MB INA',
      product.seller_name,
      product.name
    );

    const cleanWa = (product.contact_whatsapp || '081234567890').replace(/\D/g, '');
    const waNumber = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
    const msg = encodeURIComponent(
      `Halo om ${product.seller_name}, salam satu bintang dari sesama anggota MB Club Indonesia. Saya melihat iklan Anda "${product.name}" di Marketplace resmi MB INA seharga Rp ${product.price.toLocaleString('id-ID')}. Apakah barang ini masih tersedia?`
    );

    const waUrl = `https://wa.me/${waNumber}?text=${msg}`;
    Linking.openURL(waUrl);
  };

  if (!product) {
    return (
      <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="storefront-outline" size={36} color="#71717A" />
          <Text style={styles.loadingText}>Memuat rincian produk...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const mainImage = product.images?.[0] || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600';

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#F4F4F5" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Detail Produk Iklan
          </Text>
          <Pressable onPress={handleContactWhatsApp} style={styles.shareBtn}>
            <Ionicons name="logo-whatsapp" size={18} color="#34D399" />
          </Pressable>
        </View>

        {/* Hero Image Container */}
        <View style={styles.heroImageContainer}>
          <Image source={{ uri: mainImage }} style={styles.heroImage} resizeMode="cover" />
          <View style={[styles.conditionBadge, product.condition === 'NEW' ? styles.pillNew : styles.pillUsed]}>
            <Text style={styles.conditionBadgeText}>
              {product.condition === 'NEW' ? 'BARU (NEW)' : 'BEKAS (USED)'}
            </Text>
          </View>
        </View>

        {/* Product Details Card */}
        <LuxuryCard style={styles.infoCard} padding={16}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryText}>{product.category}</Text>
            <View style={styles.verifiedMerchantBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#34D399" />
              <Text style={styles.verifiedMerchantText}>Verified Member MB INA</Text>
            </View>
          </View>

          <Text style={styles.productTitle}>{product.name}</Text>
          <Text style={styles.productPrice}>Rp {product.price.toLocaleString('id-ID')}</Text>

          <View style={styles.divider} />

          {/* Toko & Seller Info */}
          <View style={styles.storeCard}>
            <View style={styles.storeIconBox}>
              <Ionicons name="storefront" size={20} color="#FBBF24" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.storeName}>{product.lapak_name}</Text>
              <Text style={styles.storeSeller}>
                Penjual: {product.seller_name} • <Text style={{ fontFamily: 'monospace' }}>{product.member_id}</Text>
              </Text>
              <View style={styles.storeLocRow}>
                <Ionicons name="location-outline" size={12} color="#71717A" />
                <Text style={styles.storeLocText}>{product.location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>Deskripsi Produk</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>

          {/* Disclaimer */}
          <View style={styles.disclaimerContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#FBBF24" />
            <Text style={styles.disclaimerContent}>
              Transaksi dilakukan secara mandiri antara sesama anggota Mercedes-Benz Club Indonesia via WhatsApp resmi penjual. MB INA memfasilitasi lapak resmi tanpa potongan komisi.
            </Text>
          </View>
        </LuxuryCard>

        {/* Action Button: Direct WhatsApp */}
        <Pressable onPress={handleContactWhatsApp} style={styles.whatsappCtaBtn}>
          <Ionicons name="logo-whatsapp" size={18} color="#09090B" />
          <Text style={styles.whatsappCtaBtnText}>Hubungi Penjual via WhatsApp</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.base,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 10,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F4F4F5',
    maxWidth: width * 0.6,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageContainer: {
    position: 'relative',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#18181B',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  conditionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillNew: {
    backgroundColor: 'rgba(52, 211, 153, 0.9)',
  },
  pillUsed: {
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
  },
  conditionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  infoCard: {
    marginBottom: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#A1A1AA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  verifiedMerchantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedMerchantText: {
    fontSize: 9.5,
    color: '#34D399',
    fontWeight: '700',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F4F4F5',
    lineHeight: 24,
    marginTop: 4,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FBBF24',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  storeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  storeSeller: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  storeLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  storeLocText: {
    fontSize: 10,
    color: '#71717A',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F4F4F5',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 12.5,
    color: '#D4D4D8',
    lineHeight: 19,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    marginTop: 16,
  },
  disclaimerContent: {
    flex: 1,
    fontSize: 10.5,
    color: '#A1A1AA',
    lineHeight: 15,
  },
  whatsappCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E4E4E7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsappCtaBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#09090B',
  },
});
