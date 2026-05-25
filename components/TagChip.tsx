import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, borderRadius } from '../constants/theme';

const TAG_COLORS = [
  { bg: 'rgba(171,53,0,0.1)', border: 'rgba(171,53,0,0.2)', text: colors.primary },
  { bg: 'rgba(0,111,12,0.1)', border: 'rgba(137,248,122,0.3)', text: colors.secondary },
  { bg: 'rgba(0,102,135,0.1)', border: 'rgba(81,163,201,0.3)', text: colors.tertiary },
  { bg: 'rgba(255,230,195,0.6)', border: 'rgba(255,221,178,0.5)', text: colors.onSurfaceVariant },
];

function tagColor(index: number) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

interface Props {
  label: string;
  colorIndex?: number;
  onPress?: () => void;
  variant?: 'filled' | 'outlined';
}

export default function TagChip({ label, colorIndex = 0, onPress, variant = 'outlined' }: Props) {
  if (variant === 'filled') {
    return (
      <TouchableOpacity
        style={styles.filled}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.filledLabel}># {label}</Text>
      </TouchableOpacity>
    );
  }

  const c = tagColor(colorIndex);
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
    backgroundColor: colors.primary,
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
    color: colors.onPrimary,
  },
});
