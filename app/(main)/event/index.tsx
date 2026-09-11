// ============================================================
// Event List — Kalender Acara Klub
// Mercedes-Benz Club Indonesia
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/hooks/useAuth';
import { useEvents } from '../../../src/hooks/useEvents';
import { EventCard } from '../../../src/components/event/EventCard';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../../src/constants/theme';
import type { Event } from '../../../src/types/database.types';

export default function EventListScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<string>('all');

  // Keamanan: Hanya pengurus/admin yang dapat memuat draft
  const activeStatus = filter === 'draft' && isAdmin ? 'draft' : 'upcoming';
  const { events, loading, refetch } = useEvents({
    status: activeStatus,
  });

  const filterOptions = React.useMemo(() => {
    const list = [
      { key: 'all', label: 'Semua' },
      { key: 'nasional', label: 'Nasional' },
      { key: 'chapter', label: 'Chapter' },
      { key: 'online', label: 'Online' },
    ];
    if (isAdmin) {
      list.push({ key: 'draft', label: 'Draft' });
    }
    return list;
  }, [isAdmin]);

  const filteredEvents = React.useMemo(() => {
    return events.filter((e) => {
      // Proteksi ketat: Member biasa tidak boleh melihat status draft dalam kondisi apapun
      if (!isAdmin && e.status === 'draft') return false;

      if (filter === 'all') return true;
      if (filter === 'draft') return isAdmin && e.status === 'draft';
      return e.type === filter;
    });
  }, [events, filter, isAdmin]);

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Event & Agenda</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isAdmin && (
              <Pressable
                onPress={() => router.push('/(main)/event/create' as any)}
                style={styles.createBtn}
              >
                <Ionicons name="add" size={16} color="#111111" />
                <Text style={styles.createBtnText}>Buat Event</Text>
              </Pressable>
            )}
            <Pressable onPress={refetch} style={styles.refreshBtn}>
              <Ionicons name="refresh-outline" size={20} color={Colors.brand.gold} />
            </Pressable>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {filterOptions.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, filter === f.key && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, filter === f.key && styles.chipLabelActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => router.push(`/(main)/event/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <SectionHeader
              title={
                filter === 'draft'
                  ? `${filteredEvents.length} Draft Proposal Event`
                  : `${filteredEvents.length} Event Mendatang`
              }
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={48} color={Colors.text.tertiary} />
                <Text style={styles.emptyText}>Belum ada event tersedia</Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.base },
  title: { fontSize: Typography.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C5A059',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#111111',
  },
  refreshBtn: { padding: Spacing.xs },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.base },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border.default,
    backgroundColor: Colors.background.card,
  },
  chipActive: { borderColor: Colors.brand.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  chipLabel: { fontSize: Typography.sm, color: Colors.text.tertiary, fontWeight: Typography.weight.medium },
  chipLabelActive: { color: Colors.brand.gold, fontWeight: Typography.weight.semibold },
  list: { paddingBottom: Spacing['3xl'] },
  empty: { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontSize: Typography.base, color: Colors.text.tertiary },
});
