import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

export default function VaultScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="sparkles-outline" size={64} color={colors.outlineVariant} />
      <Text style={styles.title}>智能精选</Text>
      <Text style={styles.subtitle}>AI 正在整理你的高光时刻</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  subtitle: {
    fontSize: 14,
    color: colors.outline,
  },
});
