'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { HiArrowLeft, HiArrowDownTray, HiCheckCircle, HiCog6Tooth, HiExclamationTriangle, HiTrash } from 'react-icons/hi2';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface AvailableModel {
  name: string;
  displayName: string;
  description: string;
  size: string;
  capabilities: string[];
  recommended?: boolean;
  installed: boolean;
}

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

interface ModelManagerProps {
  onClose: () => void;
  onModelSelected?: (modelName: string) => void;
  selectedModel?: string;
}

export default function ModelManager({ onClose, onModelSelected, selectedModel }: ModelManagerProps) {
  const { theme } = useTheme();
  
  // 状態管理
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [showDownloadDialog, setShowDownloadDialog] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'installed' | 'available'>('installed');
  
  // アンインストール関連の状態
  const [showUninstallDialog, setShowUninstallDialog] = useState<string | null>(null);
  const [uninstallingModel, setUninstallingModel] = useState<string | null>(null);
  const [isUninstallBlocked, setIsUninstallBlocked] = useState(false);

  // インストール済みモデルを取得
  const fetchInstalledModels = async () => {
    setLoadingInstalled(true);
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setInstalledModels(data.models || []);
      }
    } catch (error) {
      console.error('Failed to fetch installed models:', error);
    } finally {
      setLoadingInstalled(false);
    }
  };

  // 利用可能モデルを取得
  const fetchAvailableModels = async () => {
    setLoadingAvailable(true);
    try {
      const response = await fetch('/api/ollama/available');
      const data = await response.json();
      setAvailableModels(data.models || []);
    } catch (error) {
      console.error('Failed to fetch available models:', error);
    } finally {
      setLoadingAvailable(false);
    }
  };

  // モデルダウンロード処理（バックグラウンド）
  const handleDownloadModel = async (modelName: string) => {
    // 既にダウンロード中の場合は処理を中断
    if (downloadingModels.has(modelName)) {
      console.log(`Model ${modelName} is already downloading`);
      return;
    }

    setDownloadingModels(prev => {
      const newSet = new Set(prev);
      newSet.add(modelName);
      return newSet;
    });
    
    try {
      const response = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          model: modelName,
          background: true // バックグラウンドダウンロードを指定
        }),
      });

      const result = await response.json();
      
      if (result.success && result.background) {
        // バックグラウンドダウンロード開始成功
        alert(`モデル '${result.model}' のダウンロードをバックグラウンドで開始しました。完了時に通知されます。`);
        setShowDownloadDialog(null);
        
        // ダウンロード進捗を監視開始
        startProgressMonitoring(modelName);
      } else {
        console.error('Background download failed:', result.error);
        alert(`ダウンロードの開始に失敗しました: ${result.error}`);
        setDownloadingModels(prev => {
          const newSet = new Set(prev);
          newSet.delete(modelName);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(`ダウンロードエラーが発生しました: ${error}`);
      setDownloadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  };

  // ダウンロード進捗監視
  const startProgressMonitoring = (modelName: string) => {
    // 進捗監視開始前に確実にダウンロード中状態を設定
    setDownloadingModels(prev => {
      const newSet = new Set(prev);
      newSet.add(modelName);
      return newSet;
    });

    const checkProgress = async () => {
      try {
        const response = await fetch(`/api/ollama/pull?model=${encodeURIComponent(modelName)}`);
        const data = await response.json();
        
        if (data.downloadStatus) {
          const status = data.downloadStatus;
          
          if (status.status === 'completed') {
            // ダウンロード完了
            setDownloadingModels(prev => {
              const newSet = new Set(prev);
              newSet.delete(modelName);
              return newSet;
            });
            
            // モデル一覧を再取得
            await fetchInstalledModels();
            await fetchAvailableModels();
            
            // 完了通知（ブラウザリロードを促すメッセージ付き）
            if (Notification.permission === 'granted') {
              new Notification('モデルダウンロード完了', {
                body: `${modelName} のダウンロードが完了しました！ブラウザをリロードしてご利用ください。`,
                icon: '/favicon.ico'
              });
            } else {
              alert(`モデル '${modelName}' のダウンロードが完了しました！\n\nブラウザをリロード（F5キーまたはCtrl+R）すると、インストールしたLLMモデルを利用できるようになります。`);
            }
            
            return; // 監視終了
          } else if (status.status === 'failed') {
            // ダウンロード失敗
            setDownloadingModels(prev => {
              const newSet = new Set(prev);
              newSet.delete(modelName);
              return newSet;
            });
            
            alert(`モデル '${modelName}' のダウンロードに失敗しました: ${status.error}`);
            return; // 監視終了
          }
        }
        
        // 3秒後に再チェック
        setTimeout(checkProgress, 3000);
      } catch (error) {
        console.error('Progress check error:', error);
        // エラーが発生しても5秒後に再試行
        setTimeout(checkProgress, 5000);
      }
    };
    
    // 初回チェックを1秒後に開始
    setTimeout(checkProgress, 1000);
  };

  // モデルアンインストール処理（同期・ブロッキング）
  const handleUninstallModel = async (modelName: string) => {
    // 全体をブロック
    setIsUninstallBlocked(true);
    setUninstallingModel(modelName);
    setShowUninstallDialog(null);
    
    try {
      const response = await fetch('/api/ollama/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelName }),
      });

      const result = await response.json();
      
      if (result.success) {
        // アンインストール成功
        alert(`モデル '${result.model}' のアンインストールが完了しました。`);
        
        // モデル一覧を再取得
        await fetchInstalledModels();
        await fetchAvailableModels();
      } else {
        console.error('Model uninstall failed:', result.error);
        alert(`モデルのアンインストールに失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Uninstall error:', error);
      alert(`アンインストールエラーが発生しました: ${error}`);
    } finally {
      // ブロックを解除
      setIsUninstallBlocked(false);
      setUninstallingModel(null);
    }
  };

  // サーバー側の進行中ダウンロードを同期
  const syncDownloadingModels = async () => {
    try {
      const response = await fetch('/api/ollama/pull');
      if (response.ok) {
        const data = await response.json();
        if (data.activeDownloads && Array.isArray(data.activeDownloads)) {
          setDownloadingModels(new Set(data.activeDownloads));
          
          // アクティブなダウンロードがある場合は進捗監視を開始
          data.activeDownloads.forEach((modelName: string) => {
            startProgressMonitoring(modelName);
          });
        }
      }
    } catch (error) {
      console.error('Failed to sync downloading models:', error);
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    fetchInstalledModels();
    fetchAvailableModels();
    syncDownloadingModels(); // サーバー側の状態と同期
    
    // 通知許可を要求
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <div className={`
          border-b px-6 py-4 flex items-center
          ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        `}>
          <button
            onClick={onClose}
            className={`
              p-2 rounded-md transition-colors mr-4
              ${theme === 'dark' 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
              }
            `}
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              LLMモデル管理
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              モデルの選択、ダウンロード、インストールを管理
            </p>
          </div>
          
          {/* バックグラウンドタスク表示 */}
          {downloadingModels.size > 0 && (
            <div className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              ${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700'}
            `}>
              <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                {downloadingModels.size}個のモデルをダウンロード中
              </span>
            </div>
          )}
        </div>

        {/* タブナビゲーション */}
        <div className={`
          border-b px-6
          ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        `}>
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('installed')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'installed'
                  ? 'border-blue-500 text-blue-600'
                  : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              インストール済み ({installedModels.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'available'
                  ? 'border-blue-500 text-blue-600'
                  : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              ダウンロード可能 ({availableModels.filter(m => !m.installed).length})
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'installed' && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  インストール済みモデル
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  現在利用可能なモデルから選択してください
                </p>
              </div>

              {loadingInstalled ? (
                <div className="text-center py-12">
                  <AiOutlineLoading3Quarters className="animate-spin w-8 h-8 mx-auto mb-4 text-blue-500" />
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    インストール済みモデルを読み込み中...
                  </p>
                </div>
              ) : installedModels.length === 0 ? (
                <div className="text-center py-12">
                  <HiExclamationTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                  <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    インストール済みモデルがありません
                  </h3>
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    「ダウンロード可能」タブから新しいモデルをインストールしてください
                  </p>
                  <button
                    onClick={() => setActiveTab('available')}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    ダウンロード可能なモデルを見る
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {installedModels.map((model) => (
                    <div
                      key={model.name}
                      className={`
                        p-4 border rounded-lg cursor-pointer transition-colors
                        ${selectedModel === model.name
                          ? theme === 'dark'
                            ? 'bg-blue-900 border-blue-700'
                            : 'bg-blue-50 border-blue-200'
                          : theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }
                      `}
                      onClick={() => onModelSelected?.(model.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {model.name}
                            </h3>
                            {selectedModel === model.name && (
                              <HiCheckCircle className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            サイズ: {Math.round(model.size / (1024 * 1024 * 1024) * 10) / 10} GB
                          </p>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            最終更新: {new Date(model.modified_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        
                        {/* アンインストールボタン */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowUninstallDialog(model.name);
                          }}
                          disabled={isUninstallBlocked}
                          className={`
                            ml-3 p-2 rounded-md transition-colors
                            ${isUninstallBlocked
                              ? 'opacity-50 cursor-not-allowed'
                              : theme === 'dark'
                                ? 'hover:bg-red-900 text-gray-400 hover:text-red-400'
                                : 'hover:bg-red-50 text-gray-600 hover:text-red-600'
                            }
                          `}
                          title={`${model.name}をアンインストール`}
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'available' && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  ダウンロード可能なモデル
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  新しいモデルをダウンロードしてインストールできます
                </p>
              </div>

              {loadingAvailable ? (
                <div className="text-center py-12">
                  <AiOutlineLoading3Quarters className="animate-spin w-8 h-8 mx-auto mb-4 text-blue-500" />
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    利用可能なモデルを読み込み中...
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {availableModels.map((model) => (
                    <div
                      key={model.name}
                      className={`
                        p-4 border rounded-lg
                        ${theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {model.displayName}
                            </h3>
                            {model.recommended && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                推奨
                              </span>
                            )}
                            {model.installed && (
                              <HiCheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {model.description} • {model.size}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {model.capabilities.slice(0, 4).map((cap) => (
                              <span
                                key={cap}
                                className={`text-xs px-2 py-0.5 rounded ${
                                  theme === 'dark'
                                    ? 'bg-gray-700 text-gray-300'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {cap}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="ml-4 flex items-center gap-2">
                          {model.installed ? (
                            <span className={`text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                              インストール済み
                            </span>
                          ) : downloadingModels.has(model.name) ? (
                            <div className={`
                              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                              ${theme === 'dark' 
                                ? 'bg-orange-900 text-orange-200 border border-orange-700' 
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                              }
                            `}>
                              <AiOutlineLoading3Quarters className="animate-spin w-4 h-4" />
                              <span>バックグラウンドでダウンロード中...</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowDownloadDialog(model.name)}
                              className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600"
                            >
                              <HiArrowDownTray className="w-4 h-4 inline mr-2" />
                              ダウンロード
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ダウンロード確認ダイアログ */}
      {showDownloadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`
            max-w-md w-full mx-4 p-6 rounded-lg shadow-xl
            ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          `}>
            {(() => {
              const model = availableModels.find(m => m.name === showDownloadDialog);
              return model ? (
                <>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    モデルのダウンロード確認
                  </h3>
                  <div className="mb-4">
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {model.displayName}
                    </h4>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {model.description}
                    </p>
                    <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      サイズ: {model.size}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg mb-4 ${theme === 'dark' ? 'bg-yellow-900 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'}`}>
                      このモデルをOllamaサーバーにダウンロードしますか？
                      ダウンロードには時間がかかる場合があります。
                    </p>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowDownloadDialog(null)}
                      className={`
                        px-4 py-2 text-sm border rounded-md transition-colors
                        ${theme === 'dark'
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        if (!downloadingModels.has(model.name)) {
                          handleDownloadModel(model.name);
                        }
                      }}
                      disabled={downloadingModels.has(model.name)}
                      className={`
                        px-4 py-2 text-sm rounded-md transition-colors font-medium
                        ${downloadingModels.has(model.name)
                          ? 'bg-gray-400 text-white cursor-not-allowed opacity-75'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                        }
                      `}
                    >
                      {downloadingModels.has(model.name) ? (
                        <>
                          <AiOutlineLoading3Quarters className="animate-spin w-4 h-4 inline mr-2" />
                          処理中...
                        </>
                      ) : (
                        'ダウンロード開始'
                      )}
                    </button>
                  </div>
                </>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* ブロッキングオーバーレイ（アンインストール中） */}
      {isUninstallBlocked && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className={`
            max-w-md w-full mx-4 p-6 rounded-lg shadow-xl text-center
            ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          `}>
            <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              モデルをアンインストール中
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {uninstallingModel} を削除しています...
            </p>
            <p className={`text-xs mt-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              処理が完了するまでお待ちください
            </p>
          </div>
        </div>
      )}

      {/* アンインストール確認ダイアログ */}
      {showUninstallDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`
            max-w-md w-full mx-4 p-6 rounded-lg shadow-xl
            ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          `}>
            {(() => {
              const model = installedModels.find(m => m.name === showUninstallDialog);
              return model ? (
                <>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    モデルのアンインストール確認
                  </h3>
                  <div className="mb-4">
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {model.name}
                    </h4>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      サイズ: {Math.round(model.size / (1024 * 1024 * 1024) * 10) / 10} GB
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg mb-4 ${theme === 'dark' ? 'bg-red-900 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-red-200' : 'text-red-800'}`}>
                      このモデルを完全に削除しますか？
                      削除されたモデルを再度使用するには、再ダウンロードが必要です。
                    </p>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowUninstallDialog(null)}
                      className={`
                        px-4 py-2 text-sm border rounded-md transition-colors
                        ${theme === 'dark'
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleUninstallModel(model.name)}
                      className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      完全に削除
                    </button>
                  </div>
                </>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}