import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenshotCard from '../../components/ScreenshotCard';
import { getAllScreenshots } from '../../services/database';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../constants/theme';

export default function SensitiveScreenshotsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [screenshots, setScreenshots] = useState<any[]>([]);

  useEffect(() => {
    loadSensitiveScreenshots();
  }, []);

  const loadSensitiveScreenshots = async () => {
    try {
      const allScreenshots = await getAllScreenshots();
      const sensitive = allScreenshots.filter(s => {
        if (!s.sensitive_flags) return false;
        try {
          const flags = JSON.parse(s.sensitive_flags) as string[];
          return flags.length > 0;
        } catch {
          return false;
        }
      });
      setScreenshots(sensitive);
    } catch (error) {
      console.error('Failed to load sensitive screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>敏感截图</Text>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : screenshots.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-checkmark-outline" size={64} color={colors.outlineVariant} />
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>没有敏感截图</Text>
          <Text style={[styles.emptySubtext, { color: colors.outline }]}>检测到敏感内容的截图会显示在这里</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {screenshots.map((item) => (
              <View key={item.id} style={styles.cardWrapper}>
                <ScreenshotCard
                  id={item.id}
                  imagePath={item.image_path}
                  summary={item.summary}
                  category={item.category}
                  tags={item.tags}
                  createdAt={item.created_at}
                  importanceScore={item.importance_score}
                  sensitiveFlags={item.sensitive_flags}
                  onPress={() => router.push(`/detail/${item.id}`)}
                />
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
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
  },
  emptySubtext: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    padding: 12,
    gap: 12,
  },
  cardWrapper: {
    width: '100%',
  },
});
