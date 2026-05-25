import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { pickImages, saveImage, generateFilename } from '../services/image';
import { analyzeScreenshot, getEmbedding } from '../services/ai';
import { insertScreenshot } from '../services/database';
import { colors, borderRadius, shadows } from '../constants/theme';
import { useStore } from '../store';

type Step = 'select' | 'preview' | 'progress';

interface ProgressItem {
  uri: string;
  filename: string;
  status: 'waiting' | 'ocr' | 'understanding' | 'done' | 'error';
  label: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export default function ImportModal({ visible, onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<Step>('select');
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const addScreenshots = useStore(state => state.addScreenshots);

  const handleClose = () => {
    // Reset state when closing
    setStep('select');
    setSelectedUris([]);
    setProgressItems([]);
    onClose();
  };

  const handlePickImages = async () => {
    try {
      const uris = await pickImages();
      if (uris.length > 0) {
        setSelectedUris(uris);
        setStep('preview');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const updateProgressItem = (i: number, updates: Partial<ProgressItem>) => {
    setProgressItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...updates };
      return next;
    });
  };

  const startAnalysis = async () => {
    setStep('progress');
    const initialItems: ProgressItem[] = selectedUris.map((uri) => ({
      uri,
      filename: generateFilename(),
      status: 'waiting',
      label: '等待分析...',
    }));
    setProgressItems(initialItems);

    // Track successfully imported screenshots
    const importedScreenshots: any[] = [];

    for (let i = 0; i < initialItems.length; i++) {
      const item = initialItems[i];

      try {
        // Step 1: Save image
        const savedPath = await saveImage(item.uri, item.filename);

        // Step 2: Update status to OCR
        updateProgressItem(i, { status: 'ocr', label: '识别文字中...' });

        // Step 3: Analyze with AI
        let analysis;
        try {
          analysis = await analyzeScreenshot(savedPath);
        } catch (e) {
          console.error('Analysis failed:', e);
          updateProgressItem(i, { status: 'error', label: `分析失败: ${e instanceof Error ? e.message : '未知错误'}` });
          continue;
        }

        // Step 4: Update status to understanding
        updateProgressItem(i, { status: 'understanding', label: 'AI 理解中...' });

        // Step 5: Get embedding
        let embedding: number[] = [];
        try {
          embedding = await getEmbedding(analysis.summary);
        } catch (e) {
          console.error('Embedding failed:', e);
        }

        // Step 6: Save to database
        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const screenshotData = {
          id,
          image_path: savedPath,
          raw_text: analysis.raw_text,
          summary: analysis.summary,
          category: analysis.category,
          tags: JSON.stringify(analysis.tags),
          embedding: JSON.stringify(embedding),
          created_at: new Date().toISOString(),
        };
        await insertScreenshot(screenshotData);

        // Track successfully imported screenshot
        importedScreenshots.push(screenshotData);

        // Step 7: Mark as done
        updateProgressItem(i, { status: 'done', label: '完成 ✓' });

      } catch (e) {
        console.error('Import failed for item:', i, e);
        updateProgressItem(i, { status: 'error', label: `失败: ${e instanceof Error ? e.message : '未知错误'}` });
      }
    }

    // After successful import, add to store
    if (importedScreenshots.length > 0) {
      addScreenshots(importedScreenshots);
    }

    if (onImportComplete) {
      onImportComplete();
    }
  };

  const finish = () => {
    handleClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onDismiss={handleClose}>
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>导入截图</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {step === 'select' && (
          <View style={styles.stepContainer}>
            <View style={styles.glowWrapper}>
              <TouchableOpacity onPress={handlePickImages} activeOpacity={0.8}>
                <View style={styles.pickBtn}>
                  <View style={styles.pickIcon}>
                    <Ionicons name="add" size={40} color={colors.primary} />
                  </View>
                  <Text style={styles.pickTitle}>从相册选择</Text>
                  <Text style={styles.pickSubtitle}>支持 JPG, PNG, HEIC 格式</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'preview' && (
          <View style={styles.stepContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewCount}>已选择 ({selectedUris.length})</Text>
              <TouchableOpacity onPress={() => { setStep('select'); setSelectedUris([]); }}>
                <Text style={styles.reselectText}>重新选择</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.previewGrid}>
              {selectedUris.map((uri, i) => (
                <View key={i} style={styles.previewItem}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={startAnalysis} style={styles.analyzeBtn}>
              <LinearGradient colors={['#ff6b35', '#ab3500']} style={styles.analyzeBtnGradient}>
                <Text style={styles.analyzeBtnText}>开始分析 ({selectedUris.length})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {step === 'progress' && (
          <View style={styles.stepContainer}>
            <Text style={styles.progressTitle}>正在深度理解...</Text>
            <ScrollView style={styles.progressList}>
              {progressItems.map((item, i) => (
                <View key={i} style={styles.progressCard}>
                  <Image source={{ uri: item.uri }} style={styles.progressThumb} />
                  <View style={styles.progressInfo}>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressFilename}>{item.filename}</Text>
                      <Text
                        style={[
                          styles.progressStatus,
                          item.status === 'error' && styles.progressStatusError,
                        ]}
                      >
                        {item.status === 'done' ? '完成 ✓' : item.status === 'error' ? '失败 ✗' : item.label}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width:
                              item.status === 'done'
                                ? '100%'
                                : item.status === 'error'
                                ? '100%'
                                : item.status === 'understanding'
                                ? '65%'
                                : item.status === 'ocr'
                                ? '25%'
                                : '0%',
                            backgroundColor:
                              item.status === 'error' ? colors.error : item.status === 'done' ? colors.secondaryContainer : colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            {progressItems.every((item) => item.status === 'done' || item.status === 'error') && (
              <TouchableOpacity onPress={finish} style={styles.doneBtn}>
                <LinearGradient colors={['#ff6b35', '#ab3500']} style={styles.analyzeBtnGradient}>
                  <Text style={styles.analyzeBtnText}>完成，返回首页</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(141, 113, 104, 0.3)',
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.onSurface },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: { flex: 1, paddingHorizontal: 20 },
  glowWrapper: {
    marginTop: 24,
  },
  pickBtn: {
    aspectRatio: 16 / 9,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(171, 53, 0, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  pickIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(171, 53, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickTitle: { fontSize: 20, fontWeight: '600', color: colors.primary },
  pickSubtitle: { fontSize: 14, fontWeight: '500', color: colors.onSurfaceVariant },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  previewCount: { fontSize: 20, fontWeight: '600' },
  reselectText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 100,
  },
  previewItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%' },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtn: { marginTop: 24, marginBottom: 20 },
  analyzeBtnGradient: {
    paddingVertical: 16,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    ...shadows.fab,
  },
  analyzeBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  progressTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 24,
    marginBottom: 16,
  },
  progressList: {
    flex: 1,
  },
  progressCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius['2xl'],
    padding: 16,
    marginBottom: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  progressThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    opacity: 0.6,
  },
  progressInfo: { flex: 1, gap: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressFilename: { fontSize: 14, fontWeight: '500', color: colors.onSurface },
  progressStatus: { fontSize: 14, fontWeight: '500', color: colors.primary },
  progressStatusDone: { color: colors.secondary },
  progressStatusError: { color: colors.error },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  doneBtn: { marginTop: 24, marginBottom: 20 },
});
