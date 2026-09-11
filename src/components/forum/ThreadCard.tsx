import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { formatDateTime, truncate } from '../../utils/helpers';
import type { ForumThread, ForumCategory } from '../../types/database.types';

import { supabase } from '../../services/supabase';

export interface ThreadCardProps {
  thread: ForumThread & {
    author?: {
      full_name?: string;
      chapter?: string;
      avatar_url?: string | null;
    } | null;
    likes?: { user_id: string }[];
  };
  currentUserId?: string | null;
  onPress?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Semua',
  teknis_restorasi: 'Teknis',
  pasaran_mobil: 'Pasaran',
  nongkrong_santai: 'Santai',
  pengumuman: 'Info',
  koperasi: 'Koperasi',
};

function getRelativeTime(dateString?: string): string {
  if (!dateString) return 'Baru saja';
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari lalu`;
    return formatDateTime(dateString);
  } catch {
    return 'Baru saja';
  }
}

export function ThreadCard({ thread, currentUserId, onPress }: ThreadCardProps) {
  const authorName = thread.author?.full_name || 'Anggota MB INA';
  const authorChapter = thread.author?.chapter || 'JBR';
  const authorAvatar = thread.author?.avatar_url;
  const categoryLabel = CATEGORY_LABELS[thread.category] || 'Semua';
  const isSemua = thread.category === ('all' as any);

  // ── State Suka / Love ───────────────────────────────────────
  const initialLiked = Array.isArray(thread.likes) && currentUserId
    ? thread.likes.some((l) => l.user_id === currentUserId)
    : false;
  const initialCount = Array.isArray(thread.likes)
    ? thread.likes.length
    : (thread.like_count ?? 0);

  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialCount);
  const [avatarError, setAvatarError] = useState(false);

  const LIKE_STORAGE_KEY = `@mbclub_forum_like_${thread.id}`;

  useEffect(() => {
    if (Array.isArray(thread.likes)) {
      setLikesCount(thread.likes.length);
      if (currentUserId) {
        setIsLiked(thread.likes.some((l) => l.user_id === currentUserId));
      }
    } else {
      // Fallback load local
      AsyncStorage.getItem(LIKE_STORAGE_KEY).then((v) => {
        if (v === 'true') setIsLiked(true);
      }).catch(() => {});
    }
  }, [thread.likes, thread.id, currentUserId]);

  const handleToggleLike = async () => {
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    setIsLiked(nextLiked);
    setLikesCount(nextCount);

    try {
      await AsyncStorage.setItem(LIKE_STORAGE_KEY, String(nextLiked));

      let effectiveUserId = currentUserId;
      if (!effectiveUserId) {
        const { data: prof } = await (supabase.from('profiles') as any).select('id').limit(1).single();
        effectiveUserId = prof?.id || '6c5ee3db-97be-445e-ab99-d03175ad7bc6';
      }

      if (nextLiked) {
        await (supabase.from('forum_likes') as any)
          .insert({ thread_id: thread.id, user_id: effectiveUserId });
      } else {
        await (supabase.from('forum_likes') as any)
          .delete()
          .match({ thread_id: thread.id, user_id: effectiveUserId });
      }
    } catch (e) {
      console.warn('Like toggle error:', e);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: false }}
      style={styles.card}
    >
      {/* Top Row: Avatar + Author Info + Category Tag */}
      <View style={styles.topRow}>
        <View style={styles.authorRow}>
          {authorAvatar && !avatarError ? (
            <Image
              source={{ uri: authorAvatar }}
              style={styles.avatar}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={16} color="#A1A1AA" />
            </View>
          )}

          <View style={styles.authorMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <Text style={styles.authorName} numberOfLines={1}>
                {authorName}
                {authorChapter ? ` · ${authorChapter}` : ''}
              </Text>
              {(authorName.toLowerCase().includes('sponsor') ||
                authorName.toLowerCase().includes('pro motor') ||
                (authorChapter || '').includes('SPN')) && (
                <View style={styles.sponsorBadge}>
                  <Ionicons name="star" size={8} color="#FBBF24" />
                  <Text style={styles.sponsorBadgeText}>Sponsor</Text>
                </View>
              )}
            </View>
            <Text style={styles.timeText}>{getRelativeTime(thread.created_at)}</Text>
          </View>
        </View>

        {/* Category Badge (Gold Pill or Outline Pill) */}
        <View style={[styles.badge, isSemua ? styles.badgeSemua : styles.badgeOutline]}>
          {isSemua && (
            <Ionicons name="grid-outline" size={11} color="#C5A059" style={{ marginRight: 3 }} />
          )}
          <Text style={[styles.badgeText, isSemua ? styles.badgeTextSemua : styles.badgeTextOutline]}>
            {categoryLabel}
          </Text>
        </View>
      </View>

      {/* Thread Title */}
      <Text style={styles.title} numberOfLines={2}>
        {thread.title}
      </Text>

      {/* Content Preview */}
      {thread.content ? (
        <Text style={styles.preview} numberOfLines={2}>
          {thread.content}
        </Text>
      ) : null}

      {/* Footer Stats Row: Comments, Likes, Views */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={13} color="#71717A" />
          <Text style={styles.statText}>{thread.reply_count ?? 0}</Text>
        </View>

        {/* Tombol Suka / Love Interaktif */}
        <Pressable
          onPress={handleToggleLike}
          hitSlop={8}
          style={[styles.statItem, styles.likeBtn, isLiked && styles.likeBtnActive]}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={14}
            color={isLiked ? '#EF4444' : '#71717A'}
          />
          <Text
            style={[
              styles.statText,
              isLiked && { color: '#EF4444', fontWeight: '700' },
            ]}
          >
            {likesCount}
          </Text>
        </Pressable>

        <View style={styles.statItem}>
          <Ionicons name="eye-outline" size={13} color="#71717A" />
          <Text style={styles.statText}>{thread.view_count ?? 0}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111215',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#27272A',
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#222328',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  },
  timeText: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeSemua: {
    backgroundColor: 'rgba(197, 160, 89, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
  },
  badgeOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.5)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextSemua: {
    color: '#C5A059',
  },
  badgeTextOutline: {
    color: '#D4AF37',
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#F4F4F5',
    lineHeight: 20,
    marginBottom: 6,
  },
  preview: {
    fontSize: 12.5,
    color: '#A1A1AA',
    lineHeight: 18,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11.5,
    color: '#71717A',
    fontWeight: '500',
  },
  likeBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  likeBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  sponsorBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 0.5,
    borderColor: '#FBBF24',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sponsorBadgeText: {
    fontSize: 9,
    color: '#FBBF24',
    fontWeight: '800',
  },
});
