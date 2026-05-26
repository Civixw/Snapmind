import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, type ThemeName } from '../constants/theme';

const THEME_STORAGE_KEY = 'snapmind_theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  activeTheme: ThemeName;
  setMode: (mode: ThemeMode) => void;
  colors: typeof lightTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // 加载保存的主题模式
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedMode) => {
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setModeState(savedMode);
      }
      setIsLoaded(true);
    }).catch((error) => {
      console.warn('[ThemeContext] Failed to load theme mode:', error);
      setIsLoaded(true);
    });
  }, []);

  // 保存主题模式到 AsyncStorage
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch((error) => {
      console.warn('[ThemeContext] Failed to save theme mode:', error);
    });
  };

  // 计算当前生效的主题
  const activeTheme: ThemeName = React.useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  }, [mode, systemColorScheme]);

  // 获取当前主题颜色
  const colors = activeTheme === 'dark' ? darkTheme : lightTheme;

  // 等待加载完成再渲染
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, activeTheme, setMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
