import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';

export default function LegalLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        navigationBarHidden: true,
      }}
    >
      <Stack.Screen
        name="privacy"
        options={{
          title: '隐私政策',
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          title: '服务条款',
        }}
      />
    </Stack>
  );
}
