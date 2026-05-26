import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageAdapter } from '../store/persist';

const PRIVACY_SETTINGS_KEY = 'snapmind_show_sensitive_markers';

interface PrivacyContextValue {
  showSensitiveMarkers: boolean;
  setShowSensitiveMarkers: (value: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [showSensitiveMarkers, setShowSensitiveMarkersState] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    storageAdapter.getItem(PRIVACY_SETTINGS_KEY).then((saved) => {
      if (saved !== null) {
        setShowSensitiveMarkersState(saved === 'true');
      }
      setIsLoaded(true);
    }).catch((error) => {
      console.warn('[PrivacyContext] Failed to load settings:', error);
      setIsLoaded(true);
    });
  }, []);

  const setShowSensitiveMarkers = (value: boolean) => {
    setShowSensitiveMarkersState(value);
    storageAdapter.setItem(PRIVACY_SETTINGS_KEY, String(value)).catch((error) => {
      console.warn('[PrivacyContext] Failed to save settings:', error);
    });
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <PrivacyContext.Provider value={{ showSensitiveMarkers, setShowSensitiveMarkers }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within PrivacyProvider');
  }
  return context;
}
