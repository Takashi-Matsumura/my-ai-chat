'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDefaultOllamaUrl, getEnvironmentInfo } from '../utils/environment';

interface OllamaContextType {
  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;
  resetToDefault: () => void;
  isDefaultUrl: boolean;
  environmentInfo: {
    environment: string;
    defaultOllamaUrl: string;
    isDocker: boolean;
    isDevelopment: boolean;
    isProduction: boolean;
  };
}

const OllamaContext = createContext<OllamaContextType | undefined>(undefined);

const STORAGE_KEY = 'ollama-url';

export function OllamaProvider({ children }: { children: ReactNode }) {
  const [environmentInfo] = useState(() => getEnvironmentInfo());
  const DEFAULT_OLLAMA_URL = environmentInfo.defaultOllamaUrl;
  const [ollamaUrl, setOllamaUrlState] = useState<string>(DEFAULT_OLLAMA_URL);

  // ローカルストレージからURL設定を読み込み
  useEffect(() => {
    const savedUrl = localStorage.getItem(STORAGE_KEY);
    if (savedUrl) {
      setOllamaUrlState(savedUrl);
    }
  }, []);

  // URL変更時にローカルストレージに保存
  const setOllamaUrl = (url: string) => {
    const cleanUrl = url.trim();
    setOllamaUrlState(cleanUrl);
    
    if (cleanUrl === DEFAULT_OLLAMA_URL) {
      // デフォルト値の場合はストレージから削除
      localStorage.removeItem(STORAGE_KEY);
    } else {
      // カスタム値の場合は保存
      localStorage.setItem(STORAGE_KEY, cleanUrl);
    }
  };

  // デフォルト値にリセット
  const resetToDefault = () => {
    setOllamaUrl(DEFAULT_OLLAMA_URL);
  };

  // 現在の設定がデフォルト値かどうか
  const isDefaultUrl = ollamaUrl === DEFAULT_OLLAMA_URL;

  return (
    <OllamaContext.Provider value={{
      ollamaUrl,
      setOllamaUrl,
      resetToDefault,
      isDefaultUrl,
      environmentInfo,
    }}>
      {children}
    </OllamaContext.Provider>
  );
}

export function useOllama() {
  const context = useContext(OllamaContext);
  if (context === undefined) {
    throw new Error('useOllama must be used within an OllamaProvider');
  }
  return context;
}