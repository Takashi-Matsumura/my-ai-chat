'use client';

import React, { useState, useEffect } from 'react';
import { useOllama } from '../contexts/OllamaContext';
import { useTheme } from '../contexts/ThemeContext';
import { HiXMark, HiCog6Tooth, HiArrowPath, HiExclamationTriangle, HiCheckCircle, HiGlobeAlt } from 'react-icons/hi2';
import ProxySettingsDialog from './ProxySettingsDialog';

interface OllamaSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUrlChanged?: () => void;
}

export default function OllamaSettingsDialog({ isOpen, onClose, onUrlChanged }: OllamaSettingsDialogProps) {
  const { theme } = useTheme();
  const { ollamaUrl, setOllamaUrl, resetToDefault, isDefaultUrl, environmentInfo } = useOllama();
  const [inputUrl, setInputUrl] = useState<string>(ollamaUrl);
  const [isValidUrl, setIsValidUrl] = useState<boolean>(true);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'error'>('none');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showProxySettings, setShowProxySettings] = useState<boolean>(false);

  // ダイアログが開かれた時に現在のURLを設定
  useEffect(() => {
    if (isOpen) {
      setInputUrl(ollamaUrl);
      setTestResult('none');
      setErrorMessage('');
    }
  }, [isOpen, ollamaUrl]);

  // URL形式の検証
  const validateUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // 入力値の変更処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setInputUrl(newUrl);
    setIsValidUrl(validateUrl(newUrl));
    setTestResult('none');
    setErrorMessage('');
  };

  // Ollama接続テスト
  const testConnection = async () => {
    if (!isValidUrl) return;

    setIsTesting(true);
    setTestResult('none');
    setErrorMessage('');

    try {
      // サーバー経由で接続テストを実行
      const response = await fetch('/api/ollama/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: inputUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setErrorMessage(data.error || 'Ollamaサーバーに接続できませんでした');
      }
    } catch (error) {
      setTestResult('error');
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Ollamaサーバーに接続できませんでした'
      );
    } finally {
      setIsTesting(false);
    }
  };

  // 設定の保存
  const handleSave = () => {
    if (!isValidUrl) return;
    
    const cleanUrl = inputUrl.endsWith('/') ? inputUrl.slice(0, -1) : inputUrl;
    const urlChanged = cleanUrl !== ollamaUrl;
    setOllamaUrl(cleanUrl);
    onClose();
    
    // URL変更時にコールバックを呼び出す
    if (urlChanged && onUrlChanged) {
      onUrlChanged();
    }
  };

  // デフォルト値にリセット
  const handleReset = () => {
    resetToDefault();
    setInputUrl('http://localhost:11434');
    setTestResult('none');
    setErrorMessage('');
  };

  // ESCキーでダイアログを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`
        w-full max-w-md rounded-lg shadow-xl
        ${theme === 'dark' 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
      `}>
        {/* ヘッダー */}
        <div className={`
          flex items-center justify-between p-6 border-b
          ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <div className="flex items-center gap-3">
            <HiCog6Tooth className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Ollama サーバー設定
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`
              p-1 rounded-md transition-colors
              ${theme === 'dark' 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-4">
          {/* 現在の設定表示 */}
          <div>
            <label className={`
              block text-sm font-medium mb-2
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
            `}>
              現在の設定
            </label>
            <div className={`
              p-3 rounded-md text-sm font-mono
              ${theme === 'dark' 
                ? 'bg-gray-700 text-gray-300' 
                : 'bg-gray-100 text-gray-600'
              }
            `}>
              {ollamaUrl}
            </div>
            {isDefaultUrl && (
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                デフォルト設定を使用中
              </p>
            )}
          </div>

          {/* 環境情報 */}
          <div className={`
            p-3 rounded-lg border
            ${theme === 'dark' 
              ? 'bg-blue-900/20 border-blue-700/30 text-blue-200' 
              : 'bg-blue-50 border-blue-200 text-blue-800'
            }
          `}>
            <div className="flex items-center gap-2 mb-2">
              <HiGlobeAlt className="w-4 h-4" />
              <span className="text-sm font-medium">実行環境</span>
            </div>
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">環境:</span>{' '}
                <span className="capitalize">
                  {environmentInfo.environment === 'docker' ? 'Docker コンテナ' : 
                   environmentInfo.environment === 'development' ? 'ローカル開発' : 
                   '本番環境'}
                </span>
              </p>
              <p>
                <span className="font-medium">推奨URL:</span>{' '}
                <code className={`px-1 py-0.5 rounded text-xs ${
                  theme === 'dark' ? 'bg-blue-800/50' : 'bg-blue-100'
                }`}>
                  {environmentInfo.defaultOllamaUrl}
                </code>
              </p>
            </div>
          </div>

          {/* URL入力 */}
          <div>
            <label className={`
              block text-sm font-medium mb-2
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
            `}>
              Ollama サーバー URL
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={handleInputChange}
              placeholder="http://localhost:11434"
              className={`
                w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
                ${!isValidUrl ? 'border-red-500' : ''}
              `}
            />
            {!isValidUrl && (
              <p className="text-red-500 text-xs mt-1">
                有効なURLを入力してください（http://またはhttps://）
              </p>
            )}
          </div>

          {/* 接続テスト */}
          <div>
            <button
              onClick={testConnection}
              disabled={!isValidUrl || isTesting}
              className={`
                w-full px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2
                ${theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300'
                }
                text-white disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isTesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  接続テスト中...
                </>
              ) : (
                '接続テスト'
              )}
            </button>

            {/* テスト結果表示 */}
            {testResult === 'success' && (
              <div className={`
                flex items-center gap-2 mt-2 p-2 rounded-md
                ${theme === 'dark' 
                  ? 'bg-green-900 text-green-200' 
                  : 'bg-green-50 text-green-800'
                }
              `}>
                <HiCheckCircle className="w-4 h-4" />
                <span className="text-sm">接続成功</span>
              </div>
            )}

            {testResult === 'error' && (
              <div className={`
                flex items-start gap-2 mt-2 p-2 rounded-md
                ${theme === 'dark' 
                  ? 'bg-red-900 text-red-200' 
                  : 'bg-red-50 text-red-800'
                }
              `}>
                <HiExclamationTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">接続失敗</div>
                  <div className="text-xs mt-1">{errorMessage}</div>
                </div>
              </div>
            )}
          </div>

          {/* 使用例 */}
          <div className={`
            p-3 rounded-md text-xs
            ${theme === 'dark' 
              ? 'bg-blue-900 text-blue-200' 
              : 'bg-blue-50 text-blue-800'
            }
          `}>
            <div className="font-medium mb-1">使用例:</div>
            <div>• ローカル: http://localhost:11434</div>
            <div>• カスタムポート: http://localhost:11435</div>
            <div>• リモート: http://192.168.1.100:11434</div>
          </div>

          {/* プロキシ設定ボタン */}
          <button
            onClick={() => setShowProxySettings(true)}
            className={`
              w-full px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2
              ${theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }
            `}
          >
            <HiGlobeAlt className="w-4 h-4" />
            プロキシ設定
          </button>
        </div>

        {/* フッター */}
        <div className={`
          flex items-center justify-between p-6 border-t
          ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <button
            onClick={handleReset}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2
              ${theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }
            `}
          >
            <HiArrowPath className="w-4 h-4" />
            デフォルトに戻す
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }
              `}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={!isValidUrl}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300'
                }
                text-white disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* プロキシ設定ダイアログ */}
    <ProxySettingsDialog
      isOpen={showProxySettings}
      onClose={() => setShowProxySettings(false)}
    />
    </>
  );
}