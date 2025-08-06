'use client';

import React, { useState, useEffect } from 'react';
import { useProxy } from '../contexts/ProxyContext';
import { useTheme } from '../contexts/ThemeContext';
import { HiXMark, HiGlobeAlt, HiArrowPath, HiCheckCircle, HiInformationCircle } from 'react-icons/hi2';

interface ProxySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProxySettingsDialog({ isOpen, onClose }: ProxySettingsDialogProps) {
  const { theme } = useTheme();
  const { proxySettings, setProxySettings, resetToDefault } = useProxy();
  const [localSettings, setLocalSettings] = useState(proxySettings);

  // ダイアログが開かれた時に現在の設定を読み込む
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(proxySettings);
    }
  }, [isOpen, proxySettings]);

  // 設定の保存
  const handleSave = () => {
    setProxySettings(localSettings);
    onClose();
  };

  // デフォルト値にリセット
  const handleReset = () => {
    resetToDefault();
    setLocalSettings({
      httpProxy: '',
      httpsProxy: '',
      noProxy: '127.0.0.1,::1,host.docker.internal',
      enabled: false,
    });
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
            <HiGlobeAlt className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              プロキシ設定
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
          {/* プロキシ有効化 */}
          <div>
            <label className={`
              flex items-center gap-3 cursor-pointer
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
            `}>
              <input
                type="checkbox"
                checked={localSettings.enabled}
                onChange={(e) => setLocalSettings({ ...localSettings, enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium">プロキシを使用する</span>
            </label>
          </div>

          {/* HTTP プロキシ */}
          <div>
            <label className={`
              block text-sm font-medium mb-2
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
            `}>
              HTTP プロキシ
            </label>
            <input
              type="text"
              value={localSettings.httpProxy}
              onChange={(e) => setLocalSettings({ ...localSettings, httpProxy: e.target.value })}
              disabled={!localSettings.enabled}
              placeholder="http://proxy.example.com:8080"
              className={`
                w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
                ${!localSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          </div>

          {/* HTTPS プロキシ */}
          <div>
            <label className={`
              block text-sm font-medium mb-2
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
            `}>
              HTTPS プロキシ
            </label>
            <input
              type="text"
              value={localSettings.httpsProxy}
              onChange={(e) => setLocalSettings({ ...localSettings, httpsProxy: e.target.value })}
              disabled={!localSettings.enabled}
              placeholder="http://proxy.example.com:8080"
              className={`
                w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
                ${!localSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          </div>

          {/* NO_PROXY */}
          <div>
            <label className={`
              block text-sm font-medium mb-2
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
            `}>
              プロキシ除外リスト (NO_PROXY)
            </label>
            <textarea
              value={localSettings.noProxy}
              onChange={(e) => setLocalSettings({ ...localSettings, noProxy: e.target.value })}
              disabled={!localSettings.enabled}
              placeholder="127.0.0.1,::1,host.docker.internal"
              rows={3}
              className={`
                w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
                ${!localSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              カンマ区切りでホスト名やIPアドレスを指定
            </p>
          </div>

          {/* 情報メッセージ */}
          <div className={`
            p-3 rounded-md text-xs flex items-start gap-2
            ${theme === 'dark' 
              ? 'bg-blue-900 text-blue-200' 
              : 'bg-blue-50 text-blue-800'
            }
          `}>
            <HiInformationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium mb-1">プロキシ設定について</div>
              <div>• 社内ネットワークなどでプロキシサーバーを経由する必要がある場合に設定してください</div>
              <div>• プロキシ除外リストには、プロキシを経由せずに直接接続したいホストを指定します</div>
              <div>• Docker環境では host.docker.internal を除外リストに含めることを推奨します</div>
            </div>
          </div>
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
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
                }
                text-white
              `}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}