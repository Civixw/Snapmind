import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import { colors } from '../constants/theme';
import ErrorBoundary from '../components/ErrorBoundary';
import { useStore } from '../store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand_600SemiBold,
    Quicksand_700Bold,
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
    // Load screenshots from database
    // apiKey and recentSearches auto-load from persist middleware
    useStore.getState().loadInitialData();
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
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="detail/[id]" options={{ headerShown: false }} />
        </Stack>
      </ErrorBoundary>
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
