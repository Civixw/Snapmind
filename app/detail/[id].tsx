import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import TagChip from '../../components/TagChip';
import { getScreenshotById, deleteScreenshot, updateScreenshot, Screenshot } from '../../services/database';
import { deleteImage } from '../../services/image';
import { recordView } from '../../services/interactions';
import { colors, gradientColors, borderRadius, shadows } from '../../constants/theme';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ocrExpanded, setOcrExpanded] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [imageHeight, setImageHeight] = useState(400);

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError(true);
        setLoading(false);
        return;
      }

      console.log('加载详情页数据，id:', id);
      try {
        // Use Platform.OS to detect environment
        const isWeb = Platform.OS === 'web';

        if (isWeb) {
          // In web, simulate loading delay then show demo data
          await new Promise(resolve => setTimeout(resolve, 500));

          // For demo purposes, create mock data based on id
          if (id.startsWith('demo-')) {
            const demoData: Screenshot = {
              id: id,
              image_path: 'https://picsum.photos/seed/' + id.split('-')[1] + '/400/500',
              raw_text: '',
              summary: '这是一张示例截图',
              category: '美食',
              tags: '["示例","演示"]',
              embedding: '[]',
              created_at: new Date().toISOString()
            };
            setScreenshot(demoData);
          } else {
            setError(true);
          }
        } else {
          const data = await getScreenshotById(id);
          if (data) {
            setScreenshot(data);
            // 打印该截图的分数
            const score = data.importance_score ?? 0;
            const scoreBadge = score >= 80 ? '🔥' : score >= 60 ? '⭐' : '';
            console.log('════════════════════════════════════════');
            console.log(`📸 截图分数: ${score} 分 ${scoreBadge}`);
            console.log(`📝 内容: ${data.summary?.substring(0, 30)}...`);
            console.log(`📂 分类: ${data.category}`);
            console.log(`🏷️  标签: ${data.tags}`);
            console.log(`⏰ 导入时间: ${new Date(data.created_at).toLocaleString('zh-CN')}`);
            console.log('════════════════════════════════════════');
          } else {
            console.error('未找到数据，id:', id);
            setError(true);
          }
        }
      } catch (e) {
        console.error('加载详情失败:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Track view when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (id) {
        // Fire-and-forget: record view analytics without awaiting
        recordView(id);
      }
    }, [id, recordView])
  );

  const handleDelete = () => {
    Alert.alert('删除截图', '确定要删除这张截图吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          if (!screenshot) return;
          await deleteImage(screenshot.image_path);
          await deleteScreenshot(screenshot.id);
          router.back();
        },
      },
    ]);
  };

  const addTag = async () => {
    if (!screenshot || !newTag.trim()) return;
    let tags: string[] = [];
    try {
      tags = JSON.parse(screenshot.tags) as string[];
    } catch {
      tags = [];
    }
    tags.push(newTag.trim());
    const updatedTags = JSON.stringify(tags);
    await updateScreenshot(screenshot.id, { tags: updatedTags });
    setScreenshot({ ...screenshot, tags: updatedTags });
    setNewTag('');
    setAddingTag(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  if (error || !screenshot) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tags: string[] = (() => {
    try {
      return JSON.parse(screenshot.tags) as string[];
    } catch {
      return [];
    }
  })();

  function formatFullDate(isoStr: string): string {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{screenshot.category || '详情'}</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Full Image */}
        <Image
          source={{ uri: screenshot.image_path }}
          style={[styles.image, { height: imageHeight }]}
          onLoad={(e) => {
            const { width, height } = e.nativeEvent.source;
            const screenWidth = Dimensions.get('window').width;
            const calculatedHeight = (height / width) * screenWidth;
            setImageHeight(calculatedHeight);
          }}
        />

        {/* AI Summary */}
        <View style={styles.section}>
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <LinearGradient colors={gradientColors.solar} style={styles.aiBadge}>
                <Ionicons name="sparkles" size={18} color="#fff" />
              </LinearGradient>
              <Text style={styles.summaryTitle}>AI 摘要</Text>
            </View>
            <Text style={styles.summaryText}>{screenshot.summary || '暂无摘要'}</Text>
          </GlassCard>
        </View>

        {/* Category & Tags */}
        <View style={styles.section}>
          <View style={styles.categoryRow}>
            <LinearGradient colors={gradientColors.solar} style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{screenshot.category}</Text>
            </LinearGradient>
          </View>
          <View style={styles.tagRow}>
            {tags.map((tag, i) => (
              <TagChip key={i} label={tag} colorIndex={i} />
            ))}
            {addingTag ? (
              <View style={styles.addTagRow}>
                <TextInput
                  style={styles.tagInput}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="新标签"
                  autoFocus
                  onSubmitEditing={addTag}
                />
                <TouchableOpacity onPress={addTag}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addTagBtn} onPress={() => setAddingTag(true)}>
                <Ionicons name="add" size={18} color={colors.outline} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* OCR Text */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.ocrToggle}
            onPress={() => setOcrExpanded(!ocrExpanded)}
          >
            <Text style={styles.ocrToggleText}>识别到的文字</Text>
            <Ionicons
              name={ocrExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.onSurface}
            />
          </TouchableOpacity>
          {ocrExpanded && (
            <View style={styles.ocrContent}>
              <Text style={styles.ocrText}>
                {screenshot.raw_text || '无识别文字'}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Ionicons name="calendar-outline" size={14} color={colors.outline} />
            <Text style={styles.footerDate}>{formatFullDate(screenshot.created_at)}</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { textAlign: 'center', marginTop: 100, fontSize: 16, color: colors.onSurfaceVariant },
  errorText: { fontSize: 18, fontWeight: '600', color: colors.error },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.primary },
  scroll: { flex: 1 },
  image: {
    width: '100%',
    backgroundColor: '#000',
  },
  section: { paddingHorizontal: 20, marginTop: 24 },
  summaryCard: { padding: 20 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 20, fontWeight: '600', color: colors.primary },
  summaryText: { fontSize: 16, lineHeight: 26, color: colors.onSurfaceVariant },
  categoryRow: { marginBottom: 12 },
  categoryPill: { alignSelf: 'flex-start', paddingHorizontal: 24, paddingVertical: 8, borderRadius: borderRadius.full },
  categoryPillText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  addTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 14,
    minWidth: 80,
  },
  addTagBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(141, 113, 104, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  ocrToggleText: { fontSize: 14, fontWeight: '500', color: colors.onSurface },
  ocrContent: {
    backgroundColor: colors.surfaceContainerLow,
    padding: 16,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  ocrText: { fontSize: 14, lineHeight: 24, color: colors.onSurfaceVariant },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    paddingBottom: 120,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerDate: { fontSize: 12, color: colors.outline },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '500', color: colors.error },
});
