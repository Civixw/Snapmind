import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, borderRadius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

function tagColor(index: number, colors: any) {
  const colorSchemes = [
    { bg: `${colors.primary}15`, border: `${colors.primary}30`, text: colors.primary },
    { bg: `${colors.secondary}15`, border: `${colors.secondary}30`, text: colors.secondary },
    { bg: `${colors.tertiary}15`, border: `${colors.tertiary}30`, text: colors.tertiary },
    { bg: `${colors.surfaceContainerHigh}`, border: `${colors.outlineVariant}50`, text: colors.onSurfaceVariant },
  ];
  return colorSchemes[index % colorSchemes.length];
}

interface Props {
  label: string;
  colorIndex?: number;
  onPress?: () => void;
  variant?: 'filled' | 'outlined';
}

export default function TagChip({ label, colorIndex = 0, onPress, variant = 'outlined' }: Props) {
  const { colors } = useTheme();

  if (variant === 'filled') {
    return (
      <TouchableOpacity
        style={[styles.filled, { backgroundColor: colors.primary }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.filledLabel, { color: colors.onPrimary }]}># {label}</Text>
      </TouchableOpacity>
    );
  }

  const c = tagColor(colorIndex, colors);
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: c.bg, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.outlinedLabel, { color: c.text }]}># {label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  filled: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginRight: 8,
    marginBottom: 8,
  },
  outlinedLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  filledLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
