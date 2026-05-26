import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenshotCard from '../../components/ScreenshotCard';
import { getTopScreenshots, recalculateAllScores } from '../../services/scoring';
import { colors, borderRadius } from '../../constants/theme';
import type { Screenshot } from '../../services/database';
import { useTheme } from '../../hooks/useTheme';

type TimeWindow = 'week' | 'month';

// Reusable component for rendering a screenshot card item
interface VaultScreenshotCardProps {
  item: Screenshot;
  onPress: () => void;
}

function VaultScreenshotCard({ item, onPress }: VaultScreenshotCardProps) {
  return (
    <ScreenshotCard
      key={item.id}
      id={item.id}
      imagePath={item.image_path}
      summary={item.summary}
      category={item.category}
      tags={item.tags}
      createdAt={item.created_at}
      importanceScore={item.importance_score ?? undefined}
      sensitiveFlags={item.sensitive_flags ?? undefined}
      onPress={onPress}
    />
  );
}

export default function VaultScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('week');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const loadVault = async (window: TimeWindow, autoDowngrade: boolean = true, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Refresh all scores in background before loading vault content
      // Fire-and-forget: don't block the UI
      void recalculateAllScores();

      const days = window === 'week' ? 7 : 30;
      const results = await getTopScreenshots(days, 24);

      // Auto-downgrade if no results
      if (autoDowngrade && results.length < 3 && window === 'week') {
        const monthResults = await getTopScreenshots(30, 24);
        if (monthResults.length >= 3) {
          setTimeWindow('month');
          setScreenshots(monthResults);
          setLoading(false);
          return;
        }
      }

      setScreenshots(results);
    } catch (error) {
      console.error('[Vault] Failed to load:', error);
      setScreenshots([]);
    } finally {
      if (showLoading) setLoading(false);
      initialLoadDone.current = true;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVault(timeWindow, true, !initialLoadDone.current);
    }, [timeWindow])
  );

  const { left, right } = React.useMemo(() => {
    const l: Screenshot[] = [];
    const r: Screenshot[] = [];
    screenshots.forEach((item, i) => {
      (i % 2 === 0 ? l : r).push(item);
    });
    return { left: l, right: r };
  }, [screenshots]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerTitleWrapper}>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>智能精选</Text>
          <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>AI 为你挑选的高光时刻</Text>
        </View>
      </SafeAreaView>

      {/* Segmented Control */}
      <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceContainerLow }]}>
        <TouchableOpacity
          style={[styles.segment, timeWindow === 'week' && { backgroundColor: colors.primary }]}
          onPress={() => setTimeWindow('week')}
        >
          <Text style={[styles.segmentText, { color: timeWindow === 'week' ? '#fff' : colors.onSurfaceVariant }, timeWindow === 'week' && styles.segmentTextActive]}>
            本周
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, timeWindow === 'month' && { backgroundColor: colors.primary }]}
          onPress={() => setTimeWindow('month')}
        >
          <Text style={[styles.segmentText, { color: timeWindow === 'month' ? '#fff' : colors.onSurfaceVariant }, timeWindow === 'month' && styles.segmentTextActive]}>
            本月
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>AI 正在整理...</Text>
        </View>
      ) : screenshots.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={64} color={colors.outlineVariant} />
          <Text style={[styles.emptyTitle, { color: colors.onSurfaceVariant }]}>暂无精选内容</Text>
          <Text style={[styles.emptySubtitle, { color: colors.outline }]}>导入截图后，AI 会帮你找出重要内容</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            {left.map((item) => (
              <VaultScreenshotCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/detail/${item.id}`)}
              />
            ))}
          </View>
          <View style={styles.column}>
            {right.map((item) => (
              <VaultScreenshotCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/detail/${item.id}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitleWrapper: {},
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: borderRadius.full,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  segmentActive: {},
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 16,
  },
});
