// ============================================================
// KTACard — VIP Black Card (Mercedes-Benz Luxury & Sleek)
// Finish: Deep Dark Gradient, Brushed Metallic Silver Border,
// High-Tracking Typography
// ============================================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../ui/StatusBadge';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { generateKTAQRData, formatChapter, getInitials } from '../../utils/helpers';
import { TierService, TIER_CONFIG, MemberTierData } from '../../services/tierService';
import type { Member, Profile } from '../../types/database.types';

const MBCI_LOGO = require('../../../assets/images/logo-mbci.jpg');

interface KTACardProps {
  profile: Profile;
  member: Member;
}

export function KTACard({ profile, member }: KTACardProps) {
  const [avatarError, setAvatarError] = useState(false);
  const [tierData, setTierData] = useState<MemberTierData | null>(null);
  const isPending = member.status === 'pending' || !member.is_approved;
  const memberNumber = member.member_number || (isPending ? 'PENDING VERIFIKASI' : 'MBINA-MEMBER');

  useEffect(() => {
    let isMounted = true;
    if (profile?.id) {
      TierService.getMemberTierData(profile.id).then((data) => {
        if (isMounted) setTierData(data);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  const currentTier = tierData?.tier || 'BRONZE';
  const tierConfig = TIER_CONFIG[currentTier];

  const qrData = generateKTAQRData({
    memberNumber: member.member_number ?? 'PENDING',
    fullName: profile.full_name,
    status: member.status,
  });

  return (
    <View style={styles.cardContainer}>
      {/* Outer Glow & Metallic Border */}
      <View style={styles.innerCard}>
        {/* Card Header Strip */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Mercedes-Benz Official Logo Ring */}
            <View style={styles.starRing}>
              <Image source={MBCI_LOGO} style={styles.starLogoImage} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.brandTitle}>MERCEDES-BENZ</Text>
              <Text style={styles.brandSubtitle}>CLUB INDONESIA</Text>
            </View>
          </View>

          <View style={styles.statusPill}>
            <View style={[styles.statusDot, isPending ? styles.dotPending : styles.dotActive]} />
            <Text style={[styles.statusPillText, isPending ? styles.textPending : styles.textActive]}>
              {isPending ? 'PENDING' : 'OFFICIAL VIP'}
            </Text>
          </View>
        </View>

        {/* Brushed Platinum Hairline Divider */}
        <View style={styles.metallicHairline} />

        {/* Card Body */}
        <View style={styles.body}>
          {/* Member Photo & Details */}
          <View style={styles.memberInfo}>
            {/* Avatar with Metallic Ring */}
            {profile.avatar_url && !avatarError ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials(profile.full_name)}</Text>
              </View>
            )}

            <View style={styles.infoCol}>
              <Text style={styles.metaLabel}>NAMA ANGGOTA</Text>
              <Text style={styles.memberName} numberOfLines={1}>
                {profile.full_name}
              </Text>

              <Text style={[styles.metaLabel, { marginTop: 6 }]}>NOMOR ANGGOTA RESMI</Text>
              <Text style={styles.memberIdText} numberOfLines={1}>
                {memberNumber}
              </Text>

              <View style={styles.chapterBadgeRow}>
                <Ionicons name="shield-checkmark-outline" size={11} color="#A1A1AA" />
                <Text style={styles.chapterName} numberOfLines={1}>
                  {formatChapter(member.chapter)}
                </Text>
              </View>

              {/* Vehicle Specs */}
              <View style={styles.vehicleRow}>
                <Ionicons name="car-sport-outline" size={12} color="#71717A" />
                <Text style={styles.vehicleText} numberOfLines={1}>
                  {member.car_model} ({member.car_year})
                </Text>
              </View>
            </View>
          </View>

          {/* QR Code in Glass Frame */}
          <View style={styles.qrGlassBox}>
            <QRCode
              value={qrData}
              size={76}
              color="#090A0C"
              backgroundColor="#F4F4F5"
            />
            <Text style={styles.qrMicroText}>SCAN VALIDASI</Text>
          </View>
        </View>

        {/* Tier Loyalitas & Prestige Strip */}
        <View style={styles.tierStrip}>
          <View style={styles.tierStripLeft}>
            <View style={[styles.tierIconBadge, { backgroundColor: tierConfig.badgeColor + '22', borderColor: tierConfig.badgeColor }]}>
              <Ionicons name="sparkles" size={11} color={tierConfig.badgeColor} />
            </View>
            <View>
              <Text style={styles.tierMetaLabel}>TIER LOYALITAS RESMI</Text>
              <Text style={[styles.tierTitleText, { color: tierConfig.badgeColor }]}>
                {tierConfig.tier} • {tierConfig.title}
              </Text>
            </View>
          </View>
          <View style={styles.pointsPill}>
            <Ionicons name="star" size={11} color="#FBBF24" />
            <Text style={styles.pointsText}>{tierData?.points ?? 0} Poin</Text>
          </View>
        </View>

        {/* Card Bottom Strip */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>STATUS KENDARAAN RESMI</Text>
            <Text style={styles.plateText}>{member.car_plate}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerLabel}>MASA BERLAKU</Text>
            <Text style={styles.validityText}>LIFETIME MEMBER</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: Spacing.base,
    borderRadius: 20,
    // Outer subtle metallic glow
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  innerCard: {
    // VIP Black Card: dark gradient from neutral-900 via zinc-950 to black
    backgroundColor: '#0D0E12',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.4)', // border-zinc-700/50
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  starRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(212, 212, 216, 0.35)', // Brushed Silver
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  starLogoImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F4F4F5',
    letterSpacing: 2.2,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: '#A1A1AA',
    letterSpacing: 1.8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#10B981',
  },
  dotPending: {
    backgroundColor: '#F59E0B',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  textActive: {
    color: '#E4E4E7',
  },
  textPending: {
    color: '#F59E0B',
  },
  metallicHairline: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },

  // Body
  body: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 212, 216, 0.35)',
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 212, 216, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  infoCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  memberIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E7',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  chapterBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  chapterName: {
    fontSize: 10,
    color: '#A1A1AA',
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  vehicleText: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '500',
  },

  // QR Frame
  qrGlassBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrMicroText: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.2,
    marginTop: 5,
  },

  // Tier Strip
  tierStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  tierStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierMetaLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tierTitleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    gap: 4,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  plateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F4F4F5',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  validityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4D4D8',
    letterSpacing: 1,
    marginTop: 2,
  },
});
