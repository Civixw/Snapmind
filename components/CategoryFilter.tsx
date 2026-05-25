import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, gradientColors } from '../constants/theme';
import { categories } from '../constants/theme';

interface Props {
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryFilter({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const isSelected = selected === cat.key;
        if (isSelected) {
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => onSelect(cat.key)}
              activeOpacity={0.7}
              style={[styles.pillTouchable, styles.pillSelected]}
            >
              <LinearGradient
                colors={gradientColors.solar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pillGradient}
              />
              <Text style={[styles.labelSelected, styles.labelAbove]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity
            key={cat.key}
            style={[styles.pillTouchable, styles.pillDefaultBg]}
            onPress={() => onSelect(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.labelDefault}>{cat.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 12,
  },
  pillTouchable: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  pillSelected: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  labelAbove: {
    zIndex: 1,
  },
  pillDefaultBg: {
    backgroundColor: colors.surfaceContainerLow,
  },
  labelSelected: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
    color: colors.onPrimary,
  },
  labelDefault: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
    color: colors.onSurfaceVariant,
  },
});
