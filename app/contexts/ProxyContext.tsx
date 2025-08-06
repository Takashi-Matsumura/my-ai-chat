'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProxySettings {
  httpProxy: string;
  httpsProxy: string;
  noProxy: string;
  enabled: boolean;
}

interface ProxyContextType {
  proxySettings: ProxySettings;
  setProxySettings: (settings: ProxySettings) => void;
  resetToDefault: () => void;
}

const ProxyContext = createContext<ProxyContextType | undefined>(undefined);

const DEFAULT_PROXY_SETTINGS: ProxySettings = {
  httpProxy: '',
  httpsProxy: '',
  noProxy: 'localhost,127.0.0.1,::1,host.docker.internal',
  enabled: false,
};

const STORAGE_KEY = 'proxy-settings';

export function ProxyProvider({ children }: { children: ReactNode }) {
  const [proxySettings, setProxySettingsState] = useState<ProxySettings>(DEFAULT_PROXY_SETTINGS);

  // ローカルストレージと環境変数から設定を読み込み
  useEffect(() => {
    // まずローカルストレージを確認
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setProxySettingsState(parsed);
        return;
      } catch (error) {
        console.error('Failed to parse proxy settings:', error);
      }
    }

    // 環境変数から設定を取得
    fetch('/api/proxy')
      .then(res => res.json())
      .then(envSettings => {
        if (envSettings.enabled) {
          setProxySettingsState(envSettings);
        }
      })
      .catch(error => {
        console.error('Failed to fetch proxy settings:', error);
      });
  }, []);

  // 設定変更時にローカルストレージに保存
  const setProxySettings = (settings: ProxySettings) => {
    setProxySettingsState(settings);
    
    if (!settings.enabled) {
      // プロキシが無効の場合はストレージから削除
      localStorage.removeItem(STORAGE_KEY);
    } else {
      // 有効の場合は保存
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  };

  // デフォルト値にリセット
  const resetToDefault = () => {
    setProxySettings(DEFAULT_PROXY_SETTINGS);
  };

  return (
    <ProxyContext.Provider value={{
      proxySettings,
      setProxySettings,
      resetToDefault,
    }}>
      {children}
    </ProxyContext.Provider>
  );
}

export function useProxy() {
  const context = useContext(ProxyContext);
  if (context === undefined) {
    throw new Error('useProxy must be used within a ProxyProvider');
  }
  return context;
}