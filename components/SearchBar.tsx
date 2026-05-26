import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
}

export default function SearchBar({
  placeholder = '搜任何你记得的内容...',
  value,
  onChangeText,
  onPress,
  editable = true,
  autoFocus = false,
}: Props) {
  const { colors } = useTheme();

  const input = (
    <View style={[styles.container, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
      <View style={styles.iconWrapper}>
        <Ionicons name="search" size={20} color={colors.primary} />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
    </View>
  );

  if (onPress && !editable) {
    return <TouchableOpacity onPress={onPress}>{input}</TouchableOpacity>;
  }
  return input;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
    gap: 12,
    borderWidth: 1,
    ...(Platform.OS === 'ios' ? shadows.card : {}),
  },
  iconWrapper: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    backgroundColor: 'transparent',
  },
});
