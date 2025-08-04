'use client';

import { useThread } from '../contexts/ThreadContext';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { HiCheckCircle, HiPlus, HiXMark, HiArrowDownTray, HiTrash, HiCheckBadge, HiBars3, HiPencil, HiCheck, HiExclamationTriangle, HiChevronLeft, HiMinus, HiExclamationCircle } from 'react-icons/hi2';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { threads, currentThread, createThread, switchThread, deleteThread, updateThreadTitle, defaultModel, exportToJSON, closeCurrentThread } = useThread();
  const { theme } = useTheme();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');
  const [showModelError, setShowModelError] = useState(false);
  const [modelErrorMessage, setModelErrorMessage] = useState('');
  const [modelExistenceCache, setModelExistenceCache] = useState<Map<string, boolean>>(new Map());
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auto-save-enabled') === 'true';
    }
    return false;
  });

  const handleCreateThread = async () => {
    // 現在のスレッドを閉じて初期画面を表示
    closeCurrentThread();
    
    // モバイルではサイドバーを閉じる（デスクトップでは開いたまま）
    if (window.innerWidth < 768) {
      onClose();
    }
  };


  const handleSwitchThread = (threadId: string) => {
    switchThread(threadId);
    // モバイルではサイドバーを閉じる（デスクトップでは開いたまま）
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleDeleteThread = (threadId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (showDeleteConfirm === threadId) {
      deleteThread(threadId);
      setShowDeleteConfirm(null);
    } else {
      setShowDeleteConfirm(threadId);
    }
  };

  const handleExport = async () => {
    await exportToJSON();
  };

  const toggleAutoSave = () => {
    const newAutoSave = !autoSave;
    setAutoSave(newAutoSave);
    localStorage.setItem('auto-save-enabled', newAutoSave.toString());
  };

  // モデルの存在確認（キャッシュあり）
  const checkModelExists = async (modelName: string): Promise<boolean> => {
    if (modelExistenceCache.has(modelName)) {
      return modelExistenceCache.get(modelName)!;
    }

    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        const installedModels = data.models || [];
        
        const exists = installedModels.some((m: any) => 
          m.name === modelName || 
          m.name.startsWith(modelName + ':') ||
          modelName.startsWith(m.name.split(':')[0])
        );
        
        // キャッシュに保存
        setModelExistenceCache(prev => new Map(prev.set(modelName, exists)));
        return exists;
      }
    } catch (error) {
      console.error('Error checking model existence:', error);
    }
    
    return false;
  };

  // スレッド一覧が変更されたらモデル存在確認のキャッシュをクリア
  useEffect(() => {
    setModelExistenceCache(new Map());
  }, [threads.length]);

  const handleStartEditTitle = (threadId: string, currentTitle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTitle(threadId);
    setEditTitleValue(currentTitle);
  };

  const handleSaveTitle = (threadId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    if (editTitleValue.trim() && editTitleValue !== threads.find(t => t.id === threadId)?.title) {
      updateThreadTitle(threadId, editTitleValue);
    }
    setEditingTitle(null);
    setEditTitleValue('');
  };

  const handleCancelEditTitle = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setEditingTitle(null);
    setEditTitleValue('');
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent, threadId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveTitle(threadId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEditTitle();
    }
  };

  // 1秒あたりのトークン数を計算
  const calculateTokensPerSecond = (thread: any): number => {
    if (!thread.metadata || thread.metadata.totalResponseTime === 0 || thread.metadata.totalTokens === 0) {
      return 0;
    }
    const tokensPerMs = thread.metadata.totalTokens / thread.metadata.totalResponseTime;
    return Math.round(tokensPerMs * 1000); // ミリ秒を秒に変換
  };

  // 自動保存機能（10分毎）
  useEffect(() => {
    if (!autoSave || threads.length === 0) return;

    const interval = setInterval(() => {
      exportToJSON();
    }, 10 * 60 * 1000); // 10分毎

    return () => clearInterval(interval);
  }, [autoSave, threads.length, exportToJSON]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return date.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <>
      {/* オーバーレイ（モバイル用） */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* サイドバー */}
      <div className={`
        fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:fixed md:z-50
        flex flex-col w-80
        ${theme === 'dark' 
          ? 'bg-gray-800 border-r border-gray-700' 
          : 'bg-white border-r border-gray-200'
        }
      `}>
        {/* ヘッダー */}
        <div className={`
          p-4 border-b flex items-center justify-between
          ${theme === 'dark' 
            ? 'border-gray-700' 
            : 'border-gray-200'
          }
        `}>
          <h2 className={`
            text-lg font-semibold
            ${theme === 'dark' ? 'text-white' : 'text-gray-800'}
          `}>
            AIチャット履歴
          </h2>
          <div className="flex items-center gap-1">
            {/* 新しいチャットボタン */}
            <button
              onClick={handleCreateThread}
              className={`
                p-2 rounded-md transition-colors
                ${theme === 'dark' 
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                }
              `}
              title="新しいチャット"
            >
              <HiPlus className="w-5 h-5" />
            </button>
            {/* 閉じる／折りたたみボタン */}
            <button
              onClick={onClose}
              className={`
                p-2 rounded-md transition-colors
                ${theme === 'dark' 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
                }
              `}
              title="サイドバーを折りたたむ"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* スレッド一覧 */}
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className={`
              p-4 text-center
              ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
            `}>
              AIチャット履歴がありません
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {threads
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .map((thread) => (
                  <div
                    key={thread.id}
                    className={`
                      group relative p-3 rounded-lg cursor-pointer transition-colors
                      ${currentThread?.id === thread.id 
                        ? (theme === 'dark'
                            ? 'bg-blue-900 border border-blue-700'
                            : 'bg-blue-50 border border-blue-200'
                          )
                        : (theme === 'dark'
                            ? 'hover:bg-gray-700'
                            : 'hover:bg-gray-50'
                          )
                      }
                    `}
                    onClick={() => handleSwitchThread(thread.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingTitle === thread.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitleValue}
                              onChange={(e) => setEditTitleValue(e.target.value)}
                              onKeyDown={(e) => handleTitleKeyDown(e, thread.id)}
                              onBlur={() => handleSaveTitle(thread.id)}
                              className="flex-1 text-sm font-medium bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={(e) => handleSaveTitle(thread.id, e)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="保存"
                            >
                              <HiCheck className="w-3 h-3" />
                            </button>
                            <button
                              onClick={handleCancelEditTitle}
                              className="p-1 text-gray-400 hover:bg-gray-50 rounded transition-colors"
                              title="キャンセル"
                            >
                              <HiXMark className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/title">
                            <h3 className={`
                              text-sm font-medium truncate flex-1
                              ${currentThread?.id === thread.id 
                                ? (theme === 'dark' ? 'text-blue-200' : 'text-blue-900')
                                : (theme === 'dark' ? 'text-white' : 'text-gray-900')
                              }
                            `}>
                              {thread.title}
                            </h3>
                            <button
                              onClick={(e) => handleStartEditTitle(thread.id, thread.title, e)}
                              className={`
                                opacity-0 group-hover/title:opacity-100 p-1 rounded transition-all
                                ${theme === 'dark'
                                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }
                              `}
                              title="タイトルを編集"
                            >
                              <HiPencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            <span className={`
                              text-xs
                              ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                            `}>
                              {formatDate(thread.updatedAt)}
                            </span>
                            {thread.messages.length > 0 && (
                              <span className={`
                                text-xs flex items-center gap-1
                                ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}
                              `}>
                                <HiMinus className="w-2 h-2" />
                                {thread.messages.length}件
                              </span>
                            )}
                          </div>
                          {thread.metadata && thread.metadata.totalTokens > 0 && (
                            <span className="text-xs text-blue-600 font-medium">
                              {calculateTokensPerSecond(thread)} token/s
                            </span>
                          )}
                        </div>
                        <div className={`
                          text-xs mt-1 flex items-center gap-2
                          ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}
                        `}>
                          <span>モデル: {thread.model}</span>
                          {/* モデル存在確認アイコン */}
                          <ModelExistenceIndicator modelName={thread.model} checkModelExists={checkModelExists} />
                        </div>
                      </div>
                      
                      {/* 削除ボタン */}
                      <button
                        onClick={(e) => handleDeleteThread(thread.id, e)}
                        className={`
                          ml-2 p-1 rounded transition-colors opacity-0 group-hover:opacity-100
                          ${showDeleteConfirm === thread.id 
                            ? (theme === 'dark' ? 'text-red-400 bg-red-900' : 'text-red-600 bg-red-50')
                            : (theme === 'dark'
                                ? 'text-gray-400 hover:text-red-400 hover:bg-red-900'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              )
                          }
                        `}
                        title={showDeleteConfirm === thread.id ? 'クリックして削除' : '削除'}
                      >
                        {showDeleteConfirm === thread.id ? (
                          <HiCheckBadge className="w-4 h-4" />
                        ) : (
                          <HiTrash className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className={`
          p-4 border-t
          ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          {/* 自動保存設定 */}
          <div className="mb-3">
            <label className={`
              flex items-center gap-2 text-sm
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
            `}>
              <input
                type="checkbox"
                checked={autoSave}
                onChange={toggleAutoSave}
                className="rounded"
              />
              自動保存（10分毎）
            </label>
          </div>

          {/* エクスポートボタン */}
          <div className="mb-3">
            <button
              onClick={handleExport}
              className="w-full px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={threads.length === 0}
            >
              <HiArrowDownTray className="w-4 h-4" />
              会話データをエクスポート
            </button>
          </div>
          
          <div className={`
            text-xs text-center
            ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
          `}>
            {threads.length} 個のチャット
            {autoSave && threads.length > 0 && (
              <div className="text-green-500 mt-1 flex items-center justify-center gap-1">
                <HiCheckCircle className="w-3 h-3" />
                自動保存有効
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// モデル存在確認インジケーターコンポーネント
function ModelExistenceIndicator({ 
  modelName, 
  checkModelExists 
}: { 
  modelName: string; 
  checkModelExists: (modelName: string) => Promise<boolean>;
}) {
  const { theme } = useTheme();
  const [exists, setExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const checkModel = async () => {
      if (!modelName) return;
      
      setChecking(true);
      try {
        const result = await checkModelExists(modelName);
        if (mounted) {
          setExists(result);
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    checkModel();

    return () => {
      mounted = false;
    };
  }, [modelName, checkModelExists]);

  if (checking) {
    return null; // チェック中は何も表示しない
  }

  if (exists === false) {
    return (
      <HiExclamationCircle 
        className={`w-3 h-3 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}
        title="このモデルは利用できません"
      />
    );
  }

  return null; // モデルが存在する場合や確認前は何も表示しない
}