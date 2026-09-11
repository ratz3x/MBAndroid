import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../src/services/supabase';
import { LuxuryCard } from '../../../src/components/ui/LuxuryCard';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../../src/constants/theme';
import { formatDateTime } from '../../../src/utils/helpers';
import { useAuth } from '../../../src/context/AuthContext';
import { useProfile } from '../../../src/hooks/useProfile';
import { TierService } from '../../../src/services/tierService';
import { SponsorService } from '../../../src/services/sponsorService';
import type { ForumThread, ForumReply } from '../../../src/types/database.types';

export default function ForumThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile: authProfile } = useAuth();
  const { member, profile } = useProfile(user?.id);
  const memberNum = member?.member_number || (profile as any)?.member_number || (authProfile as any)?.member_number;
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // ── State Suka / Love Thread Utama ──────────────────────────
  const [isThreadLiked, setIsThreadLiked] = useState(false);
  const [threadLikesCount, setThreadLikesCount] = useState(0);

  // ── State Suka / Love Per Balasan (Map) ──────────────────────
  const [replyLikes, setReplyLikes] = useState<Record<string, { liked: boolean; count: number }>>({});

  const loadThreadData = useCallback(async () => {
    if (!id) return;
    try {
      const [{ data: t }, { data: r }, { data: likesData }] = await Promise.all([
        supabase.from('forum_threads').select('*, author:profiles(full_name, avatar_url)').eq('id', id).single(),
        supabase.from('forum_replies').select('*, author:profiles(full_name, avatar_url)').eq('thread_id', id).order('created_at', { ascending: true }),
        supabase.from('forum_likes').select('user_id').eq('thread_id', id),
      ]);
      setThread(t);
      setReplies(r ?? []);

      // Sinkronkan Like Thread dari Supabase
      if (likesData) {
        const rawLikes = likesData as unknown as { user_id: string }[];
        setThreadLikesCount(rawLikes.length);
        if (user?.id) {
          setIsThreadLiked(rawLikes.some((l) => l.user_id === user.id));
        } else {
          // fallback cek local
          const savedStatus = await AsyncStorage.getItem(`@mbclub_forum_like_${id}`);
          if (savedStatus === 'true') setIsThreadLiked(true);
        }
      }

      // Load reply likes dari AsyncStorage
      if (r && r.length > 0) {
        const map: Record<string, { liked: boolean; count: number }> = {};
        await Promise.all(
          r.map(async (rep: any) => {
            try {
              const [s, c] = await Promise.all([
                AsyncStorage.getItem(`@mbclub_reply_like_${rep.id}`),
                AsyncStorage.getItem(`@mbclub_reply_likes_count_${rep.id}`),
              ]);
              map[rep.id] = {
                liked: s === 'true',
                count: c !== null ? parseInt(c, 10) || 0 : 0,
              };
            } catch {}
          })
        );
        setReplyLikes(map);
      }
    } catch {}
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadThreadData();
    }, [loadThreadData])
  );

  const handleToggleThreadLike = async () => {
    if (!id) return;
    const nextLiked = !isThreadLiked;
    const nextCount = nextLiked ? threadLikesCount + 1 : Math.max(0, threadLikesCount - 1);

    setIsThreadLiked(nextLiked);
    setThreadLikesCount(nextCount);

    try {
      await AsyncStorage.setItem(`@mbclub_forum_like_${id}`, String(nextLiked));

      let effectiveUserId = user?.id;
      if (!effectiveUserId) {
        const { data: prof } = await (supabase.from('profiles') as any).select('id').limit(1).single();
        effectiveUserId = prof?.id || '6c5ee3db-97be-445e-ab99-d03175ad7bc6';
      }

      if (nextLiked) {
        await (supabase.from('forum_likes') as any)
          .insert({ thread_id: id, user_id: effectiveUserId });
      } else {
        await (supabase.from('forum_likes') as any)
          .delete()
          .match({ thread_id: id, user_id: effectiveUserId });
      }
    } catch (e) {
      console.warn('Like toggle thread error:', e);
    }
  };

  const handleToggleReplyLike = async (replyId: string) => {
    const current = replyLikes[replyId] || { liked: false, count: 0 };
    const nextLiked = !current.liked;
    const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);

    setReplyLikes((prev) => ({
      ...prev,
      [replyId]: { liked: nextLiked, count: nextCount },
    }));

    try {
      await Promise.all([
        AsyncStorage.setItem(`@mbclub_reply_like_${replyId}`, String(nextLiked)),
        AsyncStorage.setItem(`@mbclub_reply_likes_count_${replyId}`, String(nextCount)),
      ]);
    } catch {}
  };

  const sendReply = async () => {
    if (!replyText.trim() || !id) return;

    // Validasi masa aktif forum mitra sponsor resmi (3 bulan)
    const sponsorCheck = await SponsorService.checkSponsorForumAccess(memberNum);
    if (sponsorCheck.isSponsor && !sponsorCheck.canPost) {
      Alert.alert(
        'Masa Aktif Sponsor Berakhir',
        sponsorCheck.reason ||
          'Masa aktif fasilitas forum untuk akun sponsor Anda telah berakhir. Silakan hubungi Admin MB INA untuk perpanjangan.'
      );
      return;
    }

    setSending(true);
    try {
      let authorId = user?.id;
      if (!authorId) {
        const { data: prof } = await (supabase.from('profiles') as any).select('id').limit(1).single();
        authorId = prof?.id || '6c5ee3db-97be-445e-ab99-d03175ad7bc6';
      }

      const { data, error } = await (supabase
        .from('forum_replies') as any)
        .insert({ thread_id: id, author_id: authorId, content: replyText.trim(), is_solution: false })
        .select('*, author:profiles(full_name, avatar_url)')
        .single();
      if (error) throw error;
      setReplies((prev) => [...prev, data]);
      setReplyText('');

      // Perbarui reply_count pada thread
      await (supabase.from('forum_threads') as any)
        .update({
          reply_count: (thread?.reply_count || 0) + 1,
          last_reply_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (authorId) {
        try {
          await TierService.addPoints(
            authorId,
            1,
            `Membalas diskusi: "${thread?.title?.slice(0, 25) || 'Thread'}..."`
          );
        } catch {}
      }
    } catch (err: any) {
      Alert.alert('Gagal Mengirim Balasan', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSending(false);
    }
  };

  if (!thread) return null;

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Forum</Text>
          <View style={{ width: 22 }} />
        </View>

        <FlatList
          data={replies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Thread */}
              <LuxuryCard variant="gold" style={styles.threadCard}>
                <Text style={styles.threadTitle}>{thread.title}</Text>
                
                {/* Author Thread Info */}
                <View style={styles.threadAuthorRow}>
                  {(thread as any).author?.avatar_url ? (
                    <Image source={{ uri: (thread as any).author.avatar_url }} style={styles.threadAvatar} />
                  ) : (
                    <View style={styles.threadAvatarPlaceholder}>
                      <Ionicons name="person" size={14} color="#C5A059" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.threadAuthorName}>
                        {(thread as any).author?.full_name || 'Anggota MB INA'}
                      </Text>
                      {(((thread as any).author?.full_name || '').toLowerCase().includes('sponsor') ||
                        ((thread as any).author?.full_name || '').toLowerCase().includes('pro motor') ||
                        ((thread as any).author?.chapter || '').includes('SPN')) && (
                        <View style={styles.sponsorBadgeBox}>
                          <Ionicons name="star" size={9} color="#FBBF24" />
                          <Text style={styles.sponsorBadgeText}>Sponsor Resmi</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.threadMeta}>{formatDateTime(thread.created_at)}</Text>
                  </View>
                </View>

                <View style={styles.separator} />
                <Text style={styles.threadContent}>{thread.content}</Text>

                {/* Thread Actions / Stats: Suka & Komentar */}
                <View style={styles.threadActionRow}>
                  <Pressable
                    onPress={handleToggleThreadLike}
                    hitSlop={8}
                    style={[
                      styles.threadLikeBtn,
                      isThreadLiked && styles.threadLikeBtnActive,
                    ]}
                  >
                    <Ionicons
                      name={isThreadLiked ? 'heart' : 'heart-outline'}
                      size={17}
                      color={isThreadLiked ? '#EF4444' : '#A1A1AA'}
                    />
                    <Text
                      style={[
                        styles.threadLikeText,
                        isThreadLiked && { color: '#EF4444', fontWeight: '700' },
                      ]}
                    >
                      {threadLikesCount > 0 ? `${threadLikesCount} Suka` : 'Suka'}
                    </Text>
                  </Pressable>

                  <View style={styles.threadStatItem}>
                    <Ionicons name="eye-outline" size={16} color="#71717A" />
                    <Text style={styles.threadStatText}>{thread.view_count || 1} dilihat</Text>
                  </View>
                </View>
              </LuxuryCard>

              <View style={styles.replyHeader}>
                <Ionicons name="chatbubbles-outline" size={16} color={Colors.brand.gold} />
                <Text style={styles.replyCount}>{replies.length} balasan</Text>
              </View>
            </>
          }
          renderItem={({ item }) => {
            const authorName = (item as any).author?.full_name || 'Anggota MB INA';
            const avatarUrl = (item as any).author?.avatar_url;
            const replyLikeInfo = replyLikes[item.id] || { liked: false, count: 0 };

            return (
              <LuxuryCard style={styles.replyCard} padding={14}>
                <View style={styles.replyMeta}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.replyAvatarImg} />
                  ) : (
                    <View style={styles.replyAvatar}>
                      <Ionicons name="person" size={14} color={Colors.text.tertiary} />
                    </View>
                  )}
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.replyAuthor}>{authorName}</Text>
                    {((authorName || '').toLowerCase().includes('sponsor') ||
                      (authorName || '').toLowerCase().includes('pro motor')) && (
                      <View style={styles.sponsorBadgeBox}>
                        <Ionicons name="star" size={8} color="#FBBF24" />
                        <Text style={styles.sponsorBadgeText}>Sponsor</Text>
                      </View>
                    )}
                    <Text style={styles.replyDate}>{formatDateTime(item.created_at)}</Text>
                  </View>
                  {item.is_solution && (
                    <View style={styles.solutionBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.status.active} />
                      <Text style={styles.solutionText}>Solusi</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.replyContent}>{item.content}</Text>

                {/* Tombol Suka pada Balasan */}
                <View style={styles.replyActionRow}>
                  <Pressable
                    onPress={() => handleToggleReplyLike(item.id)}
                    hitSlop={8}
                    style={[
                      styles.replyLikeBtn,
                      replyLikeInfo.liked && styles.replyLikeBtnActive,
                    ]}
                  >
                    <Ionicons
                      name={replyLikeInfo.liked ? 'heart' : 'heart-outline'}
                      size={14}
                      color={replyLikeInfo.liked ? '#EF4444' : '#71717A'}
                    />
                    <Text
                      style={[
                        styles.replyLikeText,
                        replyLikeInfo.liked && { color: '#EF4444', fontWeight: '700' },
                      ]}
                    >
                      {replyLikeInfo.count > 0 ? replyLikeInfo.count : 'Suka'}
                    </Text>
                  </Pressable>
                </View>
              </LuxuryCard>
            );
          }}
        />

        {/* Reply Input */}
        {!thread.is_locked && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Tulis balasan..."
              placeholderTextColor={Colors.text.disabled}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={sendReply}
              disabled={!replyText.trim() || sending}
              style={[styles.sendBtn, (!replyText.trim() || sending) && styles.sendBtnDisabled]}
            >
              <Ionicons name="send" size={20} color={replyText.trim() ? Colors.background.primary : Colors.text.tertiary} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border.default },
  headerTitle: { fontSize: Typography.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary, flex: 1, textAlign: 'center', marginHorizontal: Spacing.sm },
  list: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.md },
  threadCard: { marginTop: Spacing.md, marginBottom: Spacing.base },
  threadTitle: { fontSize: Typography.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, lineHeight: 26 },
  threadAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  threadAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272A',
  },
  threadAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  threadMeta: { fontSize: Typography.xs, color: Colors.text.tertiary, marginTop: 1 },
  separator: { height: 0.5, backgroundColor: Colors.border.default, marginVertical: Spacing.md },
  threadContent: { fontSize: Typography.base, color: Colors.text.secondary, lineHeight: 24 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  replyCount: { fontSize: Typography.sm, color: Colors.brand.gold, fontWeight: Typography.weight.semibold },
  replyCard: { marginBottom: Spacing.sm },
  replyMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  replyAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.background.cardLight, alignItems: 'center', justifyContent: 'center',
  },
  replyAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#27272A',
  },
  replyAuthor: { fontSize: Typography.sm, color: Colors.text.primary, fontWeight: Typography.weight.medium },
  replyDate: { fontSize: Typography.xs, color: Colors.text.tertiary, flex: 1 },
  solutionBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  solutionText: { fontSize: Typography.xs, color: Colors.status.active },
  replyContent: { fontSize: Typography.sm, color: Colors.text.secondary, lineHeight: 20 },
  threadActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#27272A',
  },
  threadLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  threadLikeBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  threadLikeText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
  },
  threadStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  threadStatText: {
    fontSize: 12,
    color: '#71717A',
  },
  replyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 6,
  },
  replyLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
  },
  replyLikeBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  replyLikeText: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderTopWidth: 0.5, borderTopColor: Colors.border.default,
    backgroundColor: Colors.background.card,
  },
  replyInput: {
    flex: 1, backgroundColor: Colors.background.primary,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border.default,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: Typography.sm, color: Colors.text.primary, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.brand.gold, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.background.cardLight },
  sponsorBadgeBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 0.5,
    borderColor: '#FBBF24',
    borderRadius: 4,
    paddingHorizontal: 5,
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
