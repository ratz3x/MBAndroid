// ============================================================
// EventCard — Event listing card
// Mercedes-Benz Club Indonesia
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LuxuryCard } from '../ui/LuxuryCard';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { formatDateTime, truncate } from '../../utils/helpers';
import type { Event } from '../../types/database.types';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
  compact?: boolean;
}

const EVENT_TYPE_LABELS: Record<Event['type'], string> = {
  nasional: 'Nasional',
  chapter: 'Chapter',
  online: 'Online',
};

const EVENT_STATUS_COLORS: Record<string, string> = {
  upcoming: Colors.status.info,
  ongoing: Colors.status.active,
  completed: Colors.text.tertiary,
  cancelled: Colors.status.suspended,
  draft: '#C5A059',
};

export function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const statusColor = EVENT_STATUS_COLORS[event.status] || Colors.brand.gold;
  const typeLabel = (EVENT_TYPE_LABELS as any)[event.type] || event.type?.toUpperCase() || 'EVENT';
  const displayCode = event.event_code || event.title?.match(/\[(EVT-[^\]]+)\]/)?.[1] || null;
  const displayTitle = event.title?.replace(/\[(EVT-[^\]]+)\]\s*/, '') || event.title;

  return (
    <LuxuryCard onPress={onPress} style={styles.card} padding={compact ? 12 : 16}>
      <View style={styles.header}>
        {/* Type Badge & Event Code */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.typeBadge, { backgroundColor: `${Colors.brand.gold}20` }]}>
            <Text style={styles.typeLabel}>{typeLabel}</Text>
          </View>
          {displayCode && (
            <View style={{ backgroundColor: 'rgba(197, 160, 89, 0.1)', borderWidth: 1, borderColor: 'rgba(197, 160, 89, 0.3)', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5 }}>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#C5A059', letterSpacing: 0.5 }}>{displayCode}</Text>
            </View>
          )}
        </View>

        {/* Draft badge or Status dot */}
        {event.status === 'draft' ? (
          <View style={{ backgroundColor: 'rgba(197, 160, 89, 0.15)', borderWidth: 1, borderColor: 'rgba(197, 160, 89, 0.4)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#C5A059', letterSpacing: 0.5 }}>DRAFT</Text>
          </View>
        ) : (
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        )}
      </View>

      <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={compact ? 1 : 2}>
        {displayTitle}
      </Text>

      {!compact && event.description && (
        <Text style={styles.description} numberOfLines={2}>
          {truncate(event.description, 100)}
        </Text>
      )}

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.brand.gold} />
          <Text style={styles.metaText}>{formatDateTime(event.start_date)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={Colors.brand.gold} />
          <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
        </View>
        {event.chapter && (
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={13} color={Colors.brand.gold} />
            <Text style={styles.metaText}>Chapter {event.chapter}</Text>
          </View>
        )}
      </View>
    </LuxuryCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: `${Colors.brand.gold}40`,
  },
  typeLabel: { fontSize: Typography.xs, color: Colors.brand.gold, fontWeight: Typography.weight.semibold },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: Typography.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginBottom: Spacing.xs },
  titleCompact: { fontSize: Typography.sm },
  description: { fontSize: Typography.sm, color: Colors.text.tertiary, marginBottom: Spacing.sm, lineHeight: 20 },
  meta: { gap: 4, marginTop: Spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: Typography.xs, color: Colors.text.secondary, flex: 1 },
});
