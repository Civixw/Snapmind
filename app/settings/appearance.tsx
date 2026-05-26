import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../constants/theme';

export default function AppearanceScreen() {
  const router = useRouter();
  const { mode, setMode, activeTheme, colors } = useTheme();

  const isDarkMode = colors.background === '#1A1A1A';

  const ThemeOption = ({
    value,
    icon,
    label,
  }: {
    value: 'light' | 'dark' | 'system';
    icon: string;
    label: string;
  }) => {
    const isActive = mode === value;
    return (
      <TouchableOpacity
        style={[styles.option, isActive && { backgroundColor: 'rgba(255,107,53,0.1)' }]}
        onPress={() => setMode(value)}
      >
        <Ionicons
          name={icon as any}
          size={24}
          color={isActive ? colors.primary : colors.onSurfaceVariant}
        />
        <Text style={[styles.optionLabel, isActive ? { color: colors.primary, fontWeight: '600' } : { color: colors.onSurface }]}>
          {label}
        </Text>
        {isActive && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <SafeAreaView style={[styles.header, { backgroundColor: colors.background }]} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>外观与主题</Text>
      </SafeAreaView>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.onSurfaceVariant }]}>主题模式</Text>

          <ThemeOption value="light" icon="sunny" label="浅色模式" />
          {isDarkMode && <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />}
          <ThemeOption value="dark" icon="moon" label="深色模式" />
          {isDarkMode && <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />}
          <ThemeOption value="system" icon="phone-portrait" label="跟随系统" />
        </GlassCard>

        <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
          当前生效：{activeTheme === 'dark' ? '深色模式' : '浅色模式'}
        </Text>
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
    padding: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 16,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    marginLeft: 'auto',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
});
