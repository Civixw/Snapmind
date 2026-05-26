import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { getLegalDocument, refreshLegalDocument } from '../../services/legal';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../constants/theme';

interface CachedInfo {
  lastModified: string;
  usingCached: boolean;
}

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CachedInfo | null>(null);

  const loadDocument = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const result = await getLegalDocument('terms_of_service');

    if (result) {
      setContent(result.content);
      setCacheInfo({
        lastModified: result.lastModified,
        usingCached: result.usingCached,
      });
    } else {
      setError('无法加载内容，请检查网络连接');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    const result = await refreshLegalDocument('terms_of_service');

    if (result) {
      setContent(result.content);
      setCacheInfo({
        lastModified: result.lastModified,
        usingCached: false,
      });
    } else {
      setError('刷新失败，请稍后重试');
    }

    setRefreshing(false);
  }, []);

  const handleRetry = useCallback(() => {
    loadDocument();
  }, [loadDocument]);

  React.useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>服务条款</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error && !content) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>服务条款</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={64} color={colors.outlineVariant} />
          <Text style={[styles.errorTitle, { color: colors.onSurface }]}>加载失败</Text>
          <Text style={[styles.errorMessage, { color: colors.onSurfaceVariant }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={handleRetry}>
            <Text style={styles.retryBtnText}>重试</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.primary }]}>服务条款</Text>
          {cacheInfo?.lastModified && (
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              更新于 {formatDate(cacheInfo.lastModified)}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {cacheInfo?.usingCached && (
          <View style={[styles.cachedNotice, { backgroundColor: colors.surfaceContainerLow }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={[styles.cachedNoticeText, { color: colors.onSurfaceVariant }]}>
              显示的是缓存版本
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorContainer }]}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {content && (
          <Markdown
            style={{
              body: { color: colors.onSurface, fontSize: 16, lineHeight: 24 },
              heading1: { color: colors.primary, fontSize: 28, fontWeight: '700', marginTop: 16, marginBottom: 8 },
              heading2: { color: colors.primary, fontSize: 22, fontWeight: '600', marginTop: 12, marginBottom: 6 },
              heading3: { color: colors.onSurface, fontSize: 18, fontWeight: '600', marginTop: 8, marginBottom: 4 },
              paragraph: { marginBottom: 12 },
              list_item: { marginBottom: 4, flexDirection: 'row' },
              bullet_list: { marginLeft: 16, marginBottom: 12 },
              strong: { fontWeight: '700' },
              link: { color: colors.primary, textDecorationLine: 'underline' },
            }}
          >
            {content}
          </Markdown>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    marginTop: 16,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cachedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  cachedNoticeText: {
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 14,
    flex: 1,
  },
});
