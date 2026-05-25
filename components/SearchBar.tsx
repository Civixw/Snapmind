import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../constants/theme';

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
  const input = (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color={colors.primary} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(89, 65, 57, 0.5)"
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...shadows.card,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.onSurface,
  },
});
