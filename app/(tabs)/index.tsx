import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CategoryFilter from '../../components/CategoryFilter';
import ScreenshotCard from '../../components/ScreenshotCard';
import ImportModal from '../../components/ImportModal';
import { getAllScreenshots, Screenshot } from '../../services/database';
import { colors, gradientColors, shadows, borderRadius } from '../../constants/theme';
import { useStore } from '../../store';

export default function HomeScreen() {
  const router = useRouter();
  const screenshots = useStore(state => state.screenshots);
  const loadInitialData = useStore(state => state.loadInitialData);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const prevImportModalVisible = useRef(false);

  // Split into two columns for true masonry
  const { left, right } = useMemo(() => {
    const l: Screenshot[] = [];
    const r: Screenshot[] = [];
    screenshots.forEach((item, i) => {
      (i % 2 === 0 ? l : r).push(item);
    });
    return { left: l, right: r };
  }, [screenshots]);

  const loadData = useCallback(async () => {
    console.log('开始加载数据..., selectedCategory:', selectedCategory);
    setLoading(true);

    // 使用 Platform.OS 检测平台：'web' | 'ios' | 'android'
    const isWeb = Platform.OS === 'web';
    console.log('环境检测结果 Platform.OS:', Platform.OS, 'isWeb:', isWeb);

    try {
      if (isWeb) {
        await new Promise(resolve => setTimeout(resolve, 500));
        useStore.getState().setScreenshots([]);
      } else {
        const queryCategory = selectedCategory === 'all' ? undefined : selectedCategory;
        const data = await getAllScreenshots(queryCategory);
        useStore.getState().setScreenshots(data);
      }
    } catch (e) {
      console.error('Failed to load screenshots:', e);
      useStore.getState().setScreenshots([]);
    } finally {
      setLoading(false);
      console.log('数据加载完成，loading设为false');
    }
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // When the import modal closes, reload data to show newly imported items
  useEffect(() => {
    if (prevImportModalVisible.current && !importModalVisible) {
      loadData();
    }
    prevImportModalVisible.current = importModalVisible;
  }, [importModalVisible, loadData]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleGradientBg}>
            <Text style={styles.title}>SnapMind</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/search')}>
            <Ionicons name="search" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
      </View>

      {/* Screenshot Grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : screenshots.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={64} color={colors.outlineVariant} />
          <Text style={styles.emptyText}>还没有截图</Text>
          <Text style={styles.emptySubtext}>点击右下角 + 开始导入</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            {left.map((item) => (
              <ScreenshotCard
                key={item.id}
                id={item.id}
                imagePath={item.image_path}
                summary={item.summary}
                category={item.category}
                tags={item.tags}
                createdAt={item.created_at}
                onPress={() => router.push(`/detail/${item.id}`)}
              />
            ))}
          </View>
          <View style={styles.column}>
            {right.map((item) => (
              <ScreenshotCard
                key={item.id}
                id={item.id}
                imagePath={item.image_path}
                summary={item.summary}
                category={item.category}
                tags={item.tags}
                createdAt={item.created_at}
                onPress={() => router.push(`/detail/${item.id}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setImportModalVisible(true)}
      >
        <LinearGradient colors={['#ff6b35', '#ab3500']} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Import Modal */}
      <ImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImportComplete={() => {
          // Data reload is handled by useEffect watching importModalVisible
          // Don't close modal here - let the user review results and tap "完成"
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  titleRow: {
    overflow: 'hidden',
    borderRadius: 4,
  },
  titleGradientBg: {
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Quicksand_700Bold',
    color: colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryContainer: {
    height: 44,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 140,
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.outline,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 24,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
});
