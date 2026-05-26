import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlassCard from '../../components/GlassCard';
import { deleteScreenshot, getAllScreenshots } from '../../services/database';
import { getStorageInfo } from '../../services/storage';
import { useStore } from '../../store';
import { deleteImage } from '../../services/image';
import { colors, borderRadius, shadows } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [storageInfo, setStorageInfo] = useState<{
    loading: boolean;
    fileCount: number;
    formatted: string;
  }>({
    loading: true,
    fileCount: 0,
    formatted: '...',
  });
  const apiKey = useStore(state => state.apiKey);
  const setApiKey = useStore(state => state.setApiKey);
  const [showKey, setShowKey] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey);

  // Update input when apiKey changes from storage
  useEffect(() => {
    setInputValue(apiKey);
  }, [apiKey]);

  const loadStorageInfo = async () => {
    setStorageInfo({ loading: true, fileCount: 0, formatted: '...' });
    const info = await getStorageInfo();
    setStorageInfo({
      loading: false,
      fileCount: info.fileCount,
      formatted: info.formatted,
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      loadStorageInfo();
    }, [])
  );

  const handleSaveKey = async () => {
    await setApiKey(inputValue.trim());
    alert('API Key 已保存');
  };

  const handleClearAllData = async () => {
    Alert.alert(
      '清空所有数据',
      '此操作将删除所有截图和图片文件，且不可恢复。确定要继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get all screenshots
              const screenshots = await getAllScreenshots();

              if (screenshots.length === 0) {
                Alert.alert('提示', '当前没有数据可清空');
                return;
              }

              // Delete each screenshot and its image file
              let successCount = 0;
              for (const screenshot of screenshots) {
                try {
                  await deleteImage(screenshot.image_path);
                  await deleteScreenshot(screenshot.id);
                  successCount++;
                } catch (e) {
                  console.error('Failed to delete screenshot:', screenshot.id, e);
                }
              }

              // Show result
              if (successCount === screenshots.length) {
                Alert.alert('完成', `已成功清空 ${successCount} 张截图`);
              } else if (successCount > 0) {
                Alert.alert('部分完成', `已清空 ${successCount} 张截图，部分删除失败`);
              } else {
                Alert.alert('失败', '清空失败，请重试');
              }

              // Refresh store
              useStore.getState().loadInitialData();
              // Refresh storage info
              loadStorageInfo();
            } catch (e) {
              console.error('Clear data error:', e);
              Alert.alert('错误', '清空数据时发生错误');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerTitleWrapper}>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>设置</Text>
        </View>
      </SafeAreaView>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

      {/* Stats Card */}
      <View style={styles.section}>
        <GlassCard style={styles.statsCard}>
          <View style={styles.glowOrb} />
          <View style={styles.statsRow}>
            <View style={styles.statsContent}>
              <Text style={[styles.statsLabel, { color: colors.onSurfaceVariant }]}>记忆存储</Text>
              <Text style={[styles.statsCount, { color: colors.primary }]}>
                {storageInfo.loading
                  ? '计算中...'
                  : `已保存 ${storageInfo.fileCount} 张图片，约 ${storageInfo.formatted}`
                }
              </Text>
            </View>
            <LinearGradient colors={['#ff6b35', '#ab3500']} style={styles.statsIcon}>
              <Ionicons name="cloud-done" size={30} color="#fff" />
            </LinearGradient>
          </View>
        </GlassCard>
      </View>

      {/* API Key */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>智能引擎</Text>
        <GlassCard style={styles.apiCard}>
          <View style={styles.apiHeader}>
            <Ionicons name="key" size={20} color={colors.primary} />
            <Text style={[styles.apiTitle, { color: colors.onSurface }]}>API Key 配置</Text>
          </View>
          <View style={[styles.apiInputRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceContainerHigh }]}>
            <TextInput
              style={[styles.apiInput, { color: colors.onSurface }]}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="输入您的 API 密钥"
              placeholderTextColor={colors.onSurfaceVariant}
              secureTextEntry={!showKey}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowKey(!showKey)}>
              <Ionicons
                name={showKey ? 'eye-off' : 'eye'}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleSaveKey} style={[styles.saveKeyBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.saveKeyBtnText}>保存</Text>
          </TouchableOpacity>
          <Text style={[styles.apiHint, { color: colors.onSurfaceVariant }]}>用于启用高级 AI 分析和自动标签功能。</Text>
        </GlassCard>
      </View>

      {/* General */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>通用</Text>
        <GlassCard style={styles.generalCard}>
          <TouchableOpacity style={settingStyles.row}>
            <View style={settingStyles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.onSurfaceVariant} />
              <Text style={[settingStyles.rowLabel, { color: colors.onSurface }]}>通知设置</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity style={settingStyles.row} onPress={() => router.push('/settings/appearance')}>
            <View style={settingStyles.rowLeft}>
              <Ionicons name="color-palette-outline" size={20} color={colors.onSurfaceVariant} />
              <Text style={[settingStyles.rowLabel, { color: colors.onSurface }]}>外观与主题</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity style={settingStyles.row} onPress={() => router.push('/settings/privacy')}>
            <View style={settingStyles.rowLeft}>
              <Ionicons name="shield-outline" size={20} color={colors.onSurfaceVariant} />
              <Text style={[settingStyles.rowLabel, { color: colors.onSurface }]}>隐私与安全</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </GlassCard>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>关于</Text>
        <GlassCard style={styles.aboutCard}>
          <LinearGradient colors={['#ff6b35', '#ab3500']} style={styles.aboutIcon}>
            <Ionicons name="sparkles" size={36} color="#fff" />
          </LinearGradient>
          <Text style={[styles.aboutName, { color: colors.primary }]}>SnapMind</Text>
          <Text style={[styles.aboutVersion, { color: colors.onSurfaceVariant }]}>Version 1.0.0 (Build 1)</Text>
          <View style={styles.aboutLinks}>
            <TouchableOpacity style={[styles.aboutLink, { borderColor: colors.primary }]}>
              <Ionicons name="document-text-outline" size={14} color={colors.primary} />
              <Text style={[styles.aboutLinkText, { color: colors.primary }]}>服务条款</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aboutLink, { borderColor: colors.primary }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={[styles.aboutLinkText, { color: colors.primary }]}>隐私政策</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh }]} onPress={handleClearAllData}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>清空所有数据</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitleWrapper: {},
  headerTitle: { fontSize: 24, fontWeight: '700', fontFamily: 'Quicksand_700Bold' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 20, fontWeight: '600',
    marginBottom: 12, paddingLeft: 4,
  },
  statsCard: { padding: 24, overflow: 'hidden' },
  glowOrb: {
    position: 'absolute',
    right: -16,
    top: -16,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,107,53,0.1)',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsContent: { flex: 1, marginRight: 12 },
  statsLabel: { fontSize: 14, fontWeight: '500' },
  statsCount: { fontSize: 22, fontWeight: '600', fontFamily: 'Poppins_600SemiBold', marginTop: 4 },
  statsIcon: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.fab,
  },
  apiCard: { padding: 20 },
  generalCard: { paddingVertical: 8, paddingLeft: 24, paddingRight: 12 },
  apiHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  apiTitle: { fontSize: 16, fontWeight: '700' },
  apiInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 20, height: 48,
    borderWidth: 1,
  },
  apiInput: { flex: 1, fontSize: 14 },
  saveKeyBtn: {
    alignSelf: 'flex-end', marginTop: 12,
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  saveKeyBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  apiHint: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  divider: { height: 1 },
  aboutCard: { padding: 24, alignItems: 'center' },
  aboutIcon: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, ...shadows.fab,
  },
  aboutName: { fontSize: 24, fontWeight: '700' },
  aboutVersion: {
    fontSize: 14, fontWeight: '500',
    marginTop: 4, marginBottom: 24,
  },
  aboutLinks: { flexDirection: 'row', gap: 12 },
  aboutLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: borderRadius.full, borderWidth: 1,
  },
  aboutLinkText: { fontSize: 14, fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
  },
  logoutText: { fontSize: 16, fontWeight: '500' },
});

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowLabel: { fontSize: 16 },
});
