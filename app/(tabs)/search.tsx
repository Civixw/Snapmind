import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ImageBackground } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SearchBar from '../../components/SearchBar';
import ScreenshotCard from '../../components/ScreenshotCard';
import { getAllScreenshots, searchByKeyword, Screenshot } from '../../services/database';
import { getEmbedding, semanticSearch } from '../../services/ai';
import { colors, borderRadius, gradientColors, shadows } from '../../constants/theme';
import { useStore } from '../../store';

const RECOMMEND_ITEMS = [
  {
    emoji: '🍜',
    label: '美食',
    category: '美食',
    color: '#ff6b35',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    span: 2,
  },
  {
    emoji: '✈️',
    label: '旅行',
    category: '旅行',
    color: '#51a3c9',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
    span: 1,
  },
  {
    emoji: '🛍️',
    label: '购物',
    category: '购物',
    color: '#89f87a',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    span: 1,
  },
];

const HOT_TAG_STYLES = [
  { bg: 'rgba(137,248,122,0.2)', border: 'rgba(137,248,122,0.3)', text: colors.secondary },
  { bg: 'rgba(171,53,0,0.1)', border: 'rgba(171,53,0,0.2)', text: colors.primary },
  { bg: 'rgba(81,163,201,0.1)', border: 'rgba(81,163,201,0.25)', text: colors.tertiary },
  { bg: 'rgba(255,228,195,0.6)', border: 'rgba(255,255,255,0.5)', text: colors.onSurfaceVariant },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Screenshot[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const recentSearches = useStore(state => state.recentSearches);
  const addRecentSearch = useStore(state => state.addRecentSearch);
  const clearRecentSearches = useStore(state => state.clearRecentSearches);
  const [allScreenshots, setAllScreenshots] = useState<Screenshot[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      setResults([]);
      setHasSearched(false);
      setQuery('');
    }, [])
  );

  useEffect(() => {
    getAllScreenshots().then(setAllScreenshots);
  }, []);

  const handleSearch = async (searchQuery?: string) => {
    console.log('[Search] handleSearch called, searchQuery:', searchQuery, 'query state:', query);
    const trimmed = (searchQuery ?? query).trim();
    console.log('[Search] trimmed query:', trimmed);
    if (!trimmed) return;

    setSearching(true);
    setHasSearched(true);
    addRecentSearch(trimmed);

    try {
      // Get fresh screenshot data
      const freshScreenshots = await getAllScreenshots();
      setAllScreenshots(freshScreenshots);

      // Keyword search (works in web environment)
      const keywordResults = await searchByKeyword(trimmed);
      const keywordIds = new Set(keywordResults.map((r) => r.id));

      // Semantic search (skip on web due to CORS)
      if (Platform.OS !== 'web' && freshScreenshots.length > 0) {
        try {
          const queryEmbedding = await getEmbedding(trimmed);
          if (queryEmbedding.length > 0) {
            const semanticResults = semanticSearch(
              queryEmbedding,
              freshScreenshots.map((s) => ({ id: s.id, embedding: s.embedding }))
            );

            const merged: Screenshot[] = [...keywordResults];
            for (const sr of semanticResults) {
              if (!keywordIds.has(sr.id)) {
                const screenshot = freshScreenshots.find((s) => s.id === sr.id);
                if (screenshot) merged.push(screenshot);
              }
            }
            setResults(merged);
            return;
          }
        } catch (e) {
          console.error('Semantic search failed, using keyword results only:', e);
        }
      }

      // Use keyword results as fallback
      setResults(keywordResults);
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const { left, right } = useMemo(() => {
    const l: Screenshot[] = [];
    const r: Screenshot[] = [];
    results.forEach((item, i) => {
      (i % 2 === 0 ? l : r).push(item);
    });
    return { left: l, right: r };
  }, [results]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.searchInputWrapper}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="咖啡店、旅行攻略、聊天地址..."
          />
        </View>
        <TouchableOpacity onPress={() => handleSearch()}>
          <LinearGradient
            colors={['#ff6b35', '#ab3500']}
            style={styles.searchBtn}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {searching ? (
        <View style={styles.searchingContainer}>
          <View style={styles.spinnerRing}>
            <View style={styles.spinnerTrack} />
            <View style={styles.spinnerFill} />
          </View>
          <Text style={styles.searchingText}>正在帮你找...</Text>
        </View>
      ) : hasSearched ? (
        results.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.outlineVariant} />
            <Text style={styles.emptyText}>没有找到相关截图</Text>
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
        )
      ) : (
        /* Default state: suggestions */
        <ScrollView style={styles.suggestions} showsVerticalScrollIndicator={false}>
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={() => clearRecentSearches()}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipRow}>
                {recentSearches.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.historyChip}
                    onPress={() => { setQuery(s); handleSearch(s); }}
                  >
                    <Text style={styles.historyChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Recommended Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>推荐分类</Text>
            <View style={styles.bentoGrid}>
              {RECOMMEND_ITEMS.map((rec) => (
                <TouchableOpacity
                  key={rec.label}
                  style={[styles.recommendCard, rec.span === 2 && styles.recommendCardWide]}
                  activeOpacity={0.9}
                  onPress={() => { setQuery(rec.category); handleSearch(rec.category); }}
                >
                  <ImageBackground
                    source={{ uri: rec.image }}
                    style={styles.recommendImageBg}
                    imageStyle={styles.recommendImage}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={styles.recommendOverlay}
                    />
                    <View style={styles.recommendContent}>
                      <Text style={styles.recommendEmoji}>{rec.emoji}</Text>
                      <Text style={styles.recommendLabel}>{rec.label}</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hot Tags — from user's actual tags */}
          {(() => {
            const allTags = [...new Set(
              allScreenshots.flatMap(s => {
                try { return JSON.parse(s.tags) as string[]; }
                catch { return []; }
              })
            )];
            if (allTags.length === 0) return null;
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>热门标签</Text>
                <View style={styles.tagCloud}>
                  {allTags.slice(0, 12).map((tag, i) => {
                    const ts = HOT_TAG_STYLES[i % HOT_TAG_STYLES.length];
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.hotTag, { backgroundColor: ts.bg, borderColor: ts.border }]}
                        onPress={() => { setQuery(tag); handleSearch(tag); }}
                      >
                        <Text style={[styles.hotTagText, { color: ts.text }]}>{tag}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrapper: { flex: 1 },
  searchBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    ...shadows.fab,
  },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  searchingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  spinnerRing: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  spinnerTrack: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    borderWidth: 4, borderColor: 'rgba(171,53,0,0.15)',
  },
  spinnerFill: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    borderWidth: 4, borderColor: colors.primary, borderTopColor: 'transparent',
  },
  searchingText: { fontSize: 20, fontWeight: '600', color: colors.primary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: colors.onSurfaceVariant },
  suggestions: { paddingHorizontal: 20, paddingTop: 24 },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 12 },
  clearAllText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  historyChip: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  historyChipText: { fontSize: 14, fontWeight: '500', color: colors.onSurfaceVariant },

  // Bento grid for recommended categories
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  recommendCard: {
    width: '47%',
    height: 176,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  recommendCardWide: {
    width: '100%',
  },
  recommendImageBg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  recommendImage: {
    borderRadius: borderRadius['2xl'],
  },
  recommendOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius['2xl'],
  },
  recommendContent: {
    padding: 16,
    zIndex: 1,
  },
  recommendEmoji: { fontSize: 30, marginBottom: 4, color: '#fff' },
  recommendLabel: { fontSize: 24, fontWeight: '700', color: '#fff' },

  scrollView: { flex: 1 },
  grid: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 120, gap: 16 },
  column: { flex: 1, gap: 16 },

  // Hot tags
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hotTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  hotTagText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
