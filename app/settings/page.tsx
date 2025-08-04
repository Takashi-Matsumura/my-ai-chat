'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ModelManager from '../components/ModelManager';
import { useTheme } from '../contexts/ThemeContext';
import { useThread } from '../contexts/ThreadContext';

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { defaultModel, setDefaultModel } = useThread();
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);

  // ブラウザバックボタン対応
  useEffect(() => {
    const handlePopState = () => {
      // ブラウザの戻るボタンが押された場合、メイン画面に戻る
      router.push('/');
    };

    // popstateイベントをリスン
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router]);

  const handleClose = () => {
    // チャット画面に戻る
    router.push('/');
  };

  const handleModelSelected = (modelName: string) => {
    setSelectedModel(modelName);
    // 選択されたモデルをデフォルトモデルとして設定
    setDefaultModel(modelName);
    // モデル選択後は自動的にチャット画面に戻る
    router.push('/');
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ModelManager 
        onClose={handleClose}
        onModelSelected={handleModelSelected}
        selectedModel={selectedModel}
      />
    </div>
  );
}