import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import ScreenshotCard from '../../components/ScreenshotCard';
import { getTopScreenshots } from '../../services/scoring';
import { colors, borderRadius } from '../../constants/theme';
import type { Screenshot } from '../../services/database';

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
      importanceScore={item.importance_score}
      onPress={onPress}
    />
  );
}

export default function VaultScreen() {
  const router = useRouter();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('week');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVault = async (window: TimeWindow, autoDowngrade: boolean = true) => {
    setLoading(true);
    try {
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
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVault(timeWindow);
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>智能精选</Text>
          <Text style={styles.headerSubtitle}>AI 为你挑选的高光时刻</Text>
        </View>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, timeWindow === 'week' && styles.segmentActive]}
          onPress={() => setTimeWindow('week')}
        >
          <Text style={[styles.segmentText, timeWindow === 'week' && styles.segmentTextActive]}>
            本周
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, timeWindow === 'month' && styles.segmentActive]}
          onPress={() => setTimeWindow('month')}
        >
          <Text style={[styles.segmentText, timeWindow === 'month' && styles.segmentTextActive]}>
            本月
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>AI 正在整理...</Text>
        </View>
      ) : screenshots.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={64} color={colors.outlineVariant} />
          <Text style={styles.emptyTitle}>暂无精选内容</Text>
          <Text style={styles.emptySubtitle}>导入截图后，AI 会帮你找出重要内容</Text>
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
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitleWrapper: {},
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: borderRadius.full,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
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
    color: colors.onSurfaceVariant,
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
    color: colors.onSurfaceVariant,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.outline,
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
