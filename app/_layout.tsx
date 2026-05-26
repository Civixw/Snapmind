import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Platform, StatusBar } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme as useThemeContext } from '../hooks/useTheme';
import {
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import {
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import { colors } from '../constants/theme';
import ErrorBoundary from '../components/ErrorBoundary';
import { useStore } from '../store';
import { backfillImportanceScores, recalculateAllScores } from '../services/scoring';
import { ThemeProvider } from '../contexts/ThemeContext';
import { PrivacyProvider } from '../contexts/PrivacyContext';

SplashScreen.preventAutoHideAsync();

function ThemedBackground({ children }: { children: React.ReactNode }) {
  const { colors } = useThemeContext();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {children}
    </View>
  );
}

function RootNavigator() {
  const { colors } = useThemeContext();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        presentation: 'card',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="detail/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings/appearance"
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="settings/privacy"
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

function StatusBarController() {
  const insets = useSafeAreaInsets();
  const { colors, activeTheme } = useThemeContext();

  return (
    <>
      <StatusBar
        barStyle={activeTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      {Platform.OS === 'ios' && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: colors.background,
          zIndex: 9999
        }} />
      )}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Poppins_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Initialize store on app mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // One-time backfill for existing screenshots without importance scores
        await backfillImportanceScores();

        // Background: refresh all scores to apply time decay
        // Fire-and-forget: don't block app initialization
        void recalculateAllScores();
      } catch (error) {
        console.error('[Init] Failed to backfill scores:', error);
      }

      // Load screenshots from database
      // apiKey and recentSearches auto-load from persist middleware
      useStore.getState().loadInitialData();
    };

    initializeApp();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>SnapMind</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{
          __html: `
            a[class*="r-padding-1uu6nss"] {
              padding: 0px !important;
              margin: 0px !important;
              border: none !important;
            }
            [role="tab"] {
              padding: 0px !important;
              margin: 0px !important;
            }
            .r-padding-1uu6nss {
              padding: 0px !important;
            }
          `
        }} />
      )}
      <ThemeProvider>
        <PrivacyProvider>
          <ThemedBackground>
            <ErrorBoundary>
              <StatusBarController />
              <RootNavigator />
            </ErrorBoundary>
          </ThemedBackground>
        </PrivacyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Quicksand_700Bold',
    color: colors.primaryLight,
  },
});
