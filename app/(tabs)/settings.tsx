import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import { deleteScreenshot, getAllScreenshots } from '../../services/database';
import { useStore, useScreenshotCount } from '../../store';
import { deleteImage } from '../../services/image';
import { colors, borderRadius, shadows } from '../../constants/theme';

export default function SettingsScreen() {
  const screenshotCount = useScreenshotCount();
  const apiKey = useStore(state => state.apiKey);
  const setApiKey = useStore(state => state.setApiKey);
  const [showKey, setShowKey] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey);

  // Update input when apiKey changes from storage
  useEffect(() => {
    setInputValue(apiKey);
  }, [apiKey]);

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>设置</Text>
        </View>
      </View>

      {/* Stats Card */}
      <View style={styles.section}>
        <GlassCard style={styles.statsCard}>
          <View style={styles.glowOrb} />
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statsLabel}>记忆存储</Text>
              <Text style={styles.statsCount}>已保存 {screenshotCount} 张截图</Text>
            </View>
            <LinearGradient colors={['#ff6b35', '#ab3500']} style={styles.statsIcon}>
              <Ionicons name="cloud-done" size={30} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.statsBarBg}>
            <View style={[styles.statsBarFill, { width: '65%' }]} />
          </View>
          <Text style={styles.statsSubtext}>存储空间：已使用 65%</Text>
        </GlassCard>
      </View>

      {/* API Key */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>智能引擎</Text>
        <GlassCard style={styles.apiCard}>
          <View style={styles.apiHeader}>
            <Ionicons name="key" size={20} color={colors.primary} />
            <Text style={styles.apiTitle}>API Key 配置</Text>
          </View>
          <View style={styles.apiInputRow}>
            <TextInput
              style={styles.apiInput}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="输入您的 API 密钥"
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
          <TouchableOpacity onPress={handleSaveKey} style={styles.saveKeyBtn}>
            <Text style={styles.saveKeyBtnText}>保存</Text>
          </TouchableOpacity>
          <Text style={styles.apiHint}>用于启用高级 AI 分析和自动标签功能。</Text>
        </GlassCard>
      </View>

      {/* General */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通用</Text>
        <GlassCard style={styles.generalCard}>
          <SettingRow icon="notifications-outline" label="通知设置" />
          <View style={styles.divider} />
          <SettingRow icon="color-palette-outline" label="外观与主题" />
          <View style={styles.divider} />
          <SettingRow icon="shield-outline" label="隐私与安全" />
        </GlassCard>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        <GlassCard style={styles.aboutCard}>
          <LinearGradient colors={['#ff6b35', '#ab3500']} style={styles.aboutIcon}>
            <Ionicons name="sparkles" size={36} color="#fff" />
          </LinearGradient>
          <Text style={styles.aboutName}>SnapMind</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0 (Build 1)</Text>
          <View style={styles.aboutLinks}>
            <TouchableOpacity style={styles.aboutLink}>
              <Ionicons name="document-text-outline" size={14} color={colors.primary} />
              <Text style={styles.aboutLinkText}>服务条款</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aboutLink}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={styles.aboutLinkText}>隐私政策</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleClearAllData}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>清空所有数据</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function SettingRow({ icon, label }: { icon: string; label: string }) {
  return (
    <TouchableOpacity style={settingStyles.row}>
      <View style={settingStyles.rowLeft}>
        <Ionicons name={icon as any} size={20} color={colors.onSurfaceVariant} />
        <Text style={settingStyles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(89, 65, 57, 0.3)" />
    </TouchableOpacity>
  );
}

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowLabel: { fontSize: 16, color: colors.onSurface },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitleWrapper: {},
  headerTitle: { fontSize: 24, fontWeight: '700', fontFamily: 'Quicksand_700Bold', color: colors.primary },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 20, fontWeight: '600', color: colors.onSurfaceVariant,
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
  statsLabel: { fontSize: 14, fontWeight: '500', color: colors.onSurfaceVariant },
  statsCount: { fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: 4 },
  statsIcon: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.fab,
  },
  statsBarBg: {
    width: '100%', height: 8, backgroundColor: colors.surfaceContainer,
    borderRadius: 4, marginTop: 24, overflow: 'hidden',
  },
  statsBarFill: { height: '100%', backgroundColor: colors.primaryLight, borderRadius: 4 },
  statsSubtext: { fontSize: 14, fontWeight: '500', color: 'rgba(89, 65, 57, 0.7)', marginTop: 8 },
  apiCard: { padding: 20 },
  generalCard: { paddingVertical: 8, paddingLeft: 24, paddingRight: 12 },
  apiHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  apiTitle: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  apiInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5E6D3', borderRadius: 20,
    paddingHorizontal: 20, height: 48,
  },
  apiInput: { flex: 1, fontSize: 14, color: colors.onSurface },
  saveKeyBtn: {
    alignSelf: 'flex-end', marginTop: 12,
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: borderRadius.full, backgroundColor: colors.primary,
  },
  saveKeyBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  apiHint: { fontSize: 14, color: colors.onSurfaceVariant, marginTop: 8, lineHeight: 20 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  aboutCard: { padding: 24, alignItems: 'center' },
  aboutIcon: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, ...shadows.fab,
  },
  aboutName: { fontSize: 24, fontWeight: '700', color: colors.primary },
  aboutVersion: {
    fontSize: 14, fontWeight: '500', color: colors.onSurfaceVariant,
    marginTop: 4, marginBottom: 24,
  },
  aboutLinks: { flexDirection: 'row', gap: 12 },
  aboutLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary,
  },
  aboutLinkText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: borderRadius['2xl'],
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutText: { fontSize: 16, fontWeight: '500', color: colors.error },
});
