'use client';

import { useThread } from '../contexts/ThreadContext';
import { useState, useEffect } from 'react';
import { HiCheckCircle, HiPlus, HiXMark, HiArrowDownTray, HiTrash, HiCheckBadge, HiBars3, HiPencil, HiCheck, HiExclamationTriangle } from 'react-icons/hi2';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { threads, currentThread, createThread, switchThread, deleteThread, updateThreadTitle, defaultModel, exportToJSON } = useThread();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');
  const [showModelError, setShowModelError] = useState(false);
  const [modelErrorMessage, setModelErrorMessage] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auto-save-enabled') === 'true';
    }
    return false;
  });

  const handleCreateThread = async () => {
    try {
      // モデルチェックを実行
      const response = await fetch('/api/models');
      const data = await response.json();
      
      if (!response.ok || !data.hasModels) {
        let errorMsg = 'OllamaにLLMモデルがインストールされていません。';
        
        if (!data.ollamaConnected) {
          errorMsg = 'Ollamaサーバーに接続できません。Dockerコンテナが起動しているか確認してください。';
        } else if (!data.hasModels) {
          errorMsg = 'OllamaにLLMモデルがインストールされていません。README.mdの手順に従ってモデルをインストールしてください。';
        }
        
        setModelErrorMessage(errorMsg);
        setShowModelError(true);
        return;
      }
      
      // モデルが利用可能な場合、モデル選択ダイアログを表示
      setAvailableModels(data.models);
      setSelectedModel(data.models[0]?.name || defaultModel);
      setShowModelSelector(true);
      
    } catch (error) {
      console.error('Failed to check models:', error);
      setModelErrorMessage('モデルの確認に失敗しました。再度お試しください。');
      setShowModelError(true);
    }
  };

  const handleConfirmCreateThread = () => {
    // 選択されたモデルで新規チャットを作成
    createThread(undefined, selectedModel);
    setShowModelSelector(false);
    
    // モバイルではサイドバーを閉じる
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleCancelCreateThread = () => {
    setShowModelSelector(false);
  };

  const handleSwitchThread = (threadId: string) => {
    switchThread(threadId);
    // モバイルではサイドバーを閉じる
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
        fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:z-auto
        flex flex-col
      `}>
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            AIチャット履歴
          </h2>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* 新しいチャットボタン */}
        <div className="p-4">
          <button
            onClick={handleCreateThread}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <HiPlus className="w-5 h-5" />
            新しいチャット
          </button>
          
          {/* エラーメッセージ */}
          {showModelError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <HiExclamationTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-red-800 font-medium mb-1">
                    チャットを作成できません
                  </div>
                  <div className="text-xs text-red-700">
                    {modelErrorMessage}
                  </div>
                </div>
                <button
                  onClick={() => setShowModelError(false)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <HiXMark className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* モデル選択ダイアログ */}
          {showModelSelector && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800 font-medium mb-2">
                モデルを選択してください
              </div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mb-3"
              >
                {availableModels.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmCreateThread}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
                >
                  作成
                </button>
                <button
                  onClick={handleCancelCreateThread}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>

        {/* スレッド一覧 */}
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
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
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50'
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
                              ${currentThread?.id === thread.id ? 'text-blue-900' : 'text-gray-900'}
                            `}>
                              {thread.title}
                            </h3>
                            <button
                              onClick={(e) => handleStartEditTitle(thread.id, thread.title, e)}
                              className="opacity-0 group-hover/title:opacity-100 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-all"
                              title="タイトルを編集"
                            >
                              <HiPencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {formatDate(thread.updatedAt)}
                            </span>
                            {thread.messages.length > 0 && (
                              <span className="text-xs text-gray-400">
                                • {thread.messages.length}件
                              </span>
                            )}
                          </div>
                          {thread.metadata && thread.metadata.totalTokens > 0 && (
                            <span className="text-xs text-blue-600 font-medium">
                              {calculateTokensPerSecond(thread)} token/s
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          <span>モデル: {thread.model}</span>
                        </div>
                      </div>
                      
                      {/* 削除ボタン */}
                      <button
                        onClick={(e) => handleDeleteThread(thread.id, e)}
                        className={`
                          ml-2 p-1 rounded transition-colors opacity-0 group-hover:opacity-100
                          ${showDeleteConfirm === thread.id 
                            ? 'text-red-600 bg-red-50' 
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
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
        <div className="p-4 border-t border-gray-200">
          {/* 自動保存設定 */}
          <div className="mb-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
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
              JSONエクスポート
            </button>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            {threads.length} 個のチャット
            {autoSave && threads.length > 0 && (
              <div className="text-green-600 mt-1 flex items-center gap-1">
                <HiCheckCircle className="text-sm" />
                自動保存有効
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}