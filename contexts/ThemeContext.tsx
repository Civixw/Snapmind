import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type ThemeName } from '../constants/theme';
import { storageAdapter } from '../store/persist';

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
  console.log('[ThemeContext] ThemeProvider mounted/updated');
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // 加载保存的主题模式
  useEffect(() => {
    storageAdapter.getItem(THEME_STORAGE_KEY).then((savedMode) => {
      console.log('[ThemeContext] Loading from storage:', { savedMode, currentMode: mode });
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setModeState(savedMode);
      }
      setIsLoaded(true);
    }).catch((error) => {
      console.warn('[ThemeContext] Failed to load theme mode:', error);
      setIsLoaded(true);
    });
  }, []);

  // 保存主题模式到 storage
  const setMode = (newMode: ThemeMode) => {
    console.log('[ThemeContext] Setting mode:', { from: mode, to: newMode });
    setModeState(newMode);
    storageAdapter.setItem(THEME_STORAGE_KEY, newMode).then(() => {
      console.log('[ThemeContext] Successfully saved to storage:', newMode);
    }).catch((error) => {
      console.warn('[ThemeContext] Failed to save theme mode:', error);
    });
  };

  // 计算当前生效的主题
  const activeTheme: ThemeName = React.useMemo(() => {
    const result = mode === 'system'
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : mode;
    console.log('[ThemeContext] Computing activeTheme:', { mode, systemColorScheme, result });
    return result;
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
