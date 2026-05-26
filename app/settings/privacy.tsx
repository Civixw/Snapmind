import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../constants/theme';
import { getAllScreenshots } from '../../services/database';

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [showSensitiveMarkers, setShowSensitiveMarkers] = useState(true);
  const [sensitiveCount, setSensitiveCount] = useState(0);

  useEffect(() => {
    loadSensitiveCount();
  }, []);

  const loadSensitiveCount = async () => {
    try {
      const screenshots = await getAllScreenshots();
      const count = screenshots.filter(s => {
        if (!s.sensitive_flags) return false;
        try {
          const flags = JSON.parse(s.sensitive_flags) as string[];
          return flags.length > 0;
        } catch {
          return false;
        }
      }).length;
      setSensitiveCount(count);
    } catch (error) {
      console.error('[Privacy] Failed to load sensitive count:', error);
    }
  };

  const PrivacyOption = ({
    icon,
    label,
    value,
    onValueChange,
  }: {
    icon: string;
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
  }) => (
    <View style={styles.option}>
      <View style={styles.optionLeft}>
        <Ionicons name={icon as any} size={20} color={colors.onSurfaceVariant} />
        <Text style={[styles.optionLabel, { color: colors.onSurface }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>隐私与安全</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.onSurfaceVariant }]}>敏感内容提醒</Text>

          <PrivacyOption
            icon="eye"
            label="显示敏感标记"
            value={showSensitiveMarkers}
            onValueChange={setShowSensitiveMarkers}
          />
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.onSurfaceVariant }]}>敏感内容统计</Text>

          <View style={styles.statRow}>
            <Ionicons name="lock-closed" size={20} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.onSurface }]}>检测到敏感截图</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{sensitiveCount} 张</Text>
          </View>

          {sensitiveCount > 0 && (
            <TouchableOpacity
              style={[styles.viewAllBtn, { borderColor: colors.primary }]}
              onPress={() => router.push('/privacy/sensitive')}
            >
              <Text style={[styles.viewAllBtnText, { color: colors.primary }]}>查看所有敏感截图</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </GlassCard>
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
    paddingTop: 60,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statLabel: {
    flex: 1,
    fontSize: 15,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: borderRadius.full,
  },
  viewAllBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
