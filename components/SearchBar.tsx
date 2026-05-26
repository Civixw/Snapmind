import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

interface Props {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  editable?: boolean;
  autoFocus?: boolean;
  showSearchButton?: boolean;
  onSearchPress?: () => void;
}

export default function SearchBar({
  placeholder = '搜任何你记得的内容...',
  value,
  onChangeText,
  onPress,
  editable = true,
  autoFocus = false,
  showSearchButton = false,
  onSearchPress,
}: Props) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.container, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
      <View style={styles.iconWrapper}>
        <Ionicons name="search" size={20} color={colors.primary} />
      </View>
      <TextInput
        style={[styles.input, { color: colors.onSurface }]}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSearchPress}
      />
      {showSearchButton && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={onSearchPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.searchButtonText, { color: colors.primary }]}>Search</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  if (onPress && !editable) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 38,
    gap: 8,
    borderWidth: 1,
    ...(Platform.OS === 'ios' ? shadows.card : {}),
  },
  iconWrapper: {
    marginLeft: 0,
  },
  input: {
    flex: 1,
    height: 38,
    fontSize: 13,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  divider: {
    width: 1,
    height: 20,
  },
  searchButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
