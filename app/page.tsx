'use client';

import { useChat, Message } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React, { useState, useEffect, useCallback } from 'react';
import { useThread } from './contexts/ThreadContext';
import Sidebar from './components/Sidebar';
import { HiChatBubbleLeftRight, HiPaperAirplane, HiTrash, HiArrowPath, HiStop, HiBars3, HiXMark, HiExclamationTriangle } from 'react-icons/hi2';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export default function Chat() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { 
    currentThread, 
    updateThread, 
    updateThreadMessages,
    updateThreadMetadata,
    defaultModel,
    setDefaultModel,
    createThread,
    closeCurrentThread,
    getContextInfo
  } = useThread();

  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const responseStartTimeRef = React.useRef<number | null>(null);

  const {
    error,
    input,
    status,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    messages,
    reload,
    stop,
    setMessages,
  } = useChat({
    id: currentThread?.id || 'default',
    initialMessages: [],
    api: '/api/chat',
    onFinish(message, { usage, finishReason }) {
      // メタデータを更新
      if (currentThread && responseStartTimeRef.current) {
        const responseTime = Date.now() - responseStartTimeRef.current;
        
        if (usage && (usage.totalTokens > 0 || usage.promptTokens > 0 || usage.completionTokens > 0)) {
          updateThreadMetadata(currentThread.id, usage, responseTime, message);
        } else {
          updateThreadMetadata(currentThread.id, {}, responseTime, message);
        }
        responseStartTimeRef.current = null;
        setResponseStartTime(null);
      }
    },
    onError(error) {
      console.error('Chat error:', error);
      // エラー時も応答時間をリセット
      if (responseStartTimeRef.current) {
        responseStartTimeRef.current = null;
        setResponseStartTime(null);
      }
    },
  });

  // カスタムハンドラーでモデルを動的に設定
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;
    
    // 応答時間測定開始
    const startTime = Date.now();
    setResponseStartTime(startTime);
    responseStartTimeRef.current = startTime;
    
    originalHandleSubmit(e, {
      body: {
        model: currentThread?.model || defaultModel,
      },
    });
  };

  // スレッドが変更されたときにメッセージを同期
  const previousThreadId = React.useRef<string | null>(null);
  
  useEffect(() => {
    // スレッド読み込み開始フラグを設定
    isLoadingThread.current = true;
    
    // 新しいスレッドのメッセージを読み込み
    if (currentThread) {
      setMessages(currentThread.messages || []);
      previousMessagesRef.current = currentThread.messages || [];
    } else {
      setMessages([]);
      previousMessagesRef.current = [];
    }
    
    // 現在のスレッドIDを記録
    previousThreadId.current = currentThread?.id || null;
  }, [currentThread?.id]);

  // メッセージが変更されたときにスレッドを更新
  const previousMessagesRef = React.useRef<Message[]>([]);
  const isLoadingThread = React.useRef(false);
  
  useEffect(() => {
    // スレッド読み込み中は保存しない
    if (isLoadingThread.current) {
      isLoadingThread.current = false;
      return;
    }
    
    // 現在のスレッドがない場合は何もしない
    if (!currentThread) return;
    
    // メッセージがある場合のみ更新処理を実行
    if (messages.length > 0) {
      // メッセージの内容に変化があった場合に更新
      const hasChanged = 
        messages.length !== previousMessagesRef.current.length ||
        messages.some((msg, index) => {
          const prevMsg = previousMessagesRef.current[index];
          return !prevMsg || msg.content !== prevMsg.content || msg.role !== prevMsg.role;
        });
      
      if (hasChanged) {
        // 画面に表示されているメッセージをそのまま保存
        updateThreadMessages(currentThread.id, messages);
        previousMessagesRef.current = [...messages];
      }
    }
    
    // メッセージが0になった場合の処理
    if (messages.length === 0 && previousMessagesRef.current.length > 0) {
      updateThreadMessages(currentThread.id, []);
      previousMessagesRef.current = [];
    }
  }, [messages, currentThread, updateThreadMessages]);

  // モデル情報の取得
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          // 最初のモデルをデフォルトモデルとして設定（初回のみ）
          const firstModel = data.models[0].name;
          setDefaultModel(firstModel);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []);


  const handleClearChat = () => {
    if (currentThread && messages.length > 0 && confirm('このスレッドのチャット履歴をクリアしますか？')) {
      setMessages([]);
    }
  };

  // コンテキスト情報を計算
  const contextInfo = currentThread ? getContextInfo(messages, currentThread.model) : null;

  if (!currentThread) {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* サイドバー */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* メインコンテンツ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* ヘッダー */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <HiBars3 className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-gray-800">
                チャットアプリ
              </h1>
            </div>
          </div>

          {/* 空の状態表示 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-lg mx-auto px-4">
              <div className="mb-6 flex justify-center">
                <HiChatBubbleLeftRight className="text-6xl text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                AIチャットへようこそ
              </h2>
              <p className="text-gray-600 leading-relaxed">
                左側のサイドバーから「新しいチャット」ボタンをクリックして、
                <br />
                AIとの対話を始めましょう。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* サイドバー */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <HiBars3 className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 truncate">
              {currentThread.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {currentThread.metadata && currentThread.metadata.totalTokens > 0 && (
              <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500">
                <span>{currentThread.metadata.totalTokens.toLocaleString()} トークン</span>
                <span className="text-blue-600 font-medium">
                  {Math.round((currentThread.metadata.totalTokens / currentThread.metadata.totalResponseTime) * 1000)} token/s
                </span>
              </div>
            )}
            {contextInfo && (
              <div className="hidden md:flex items-center gap-2 text-xs">
                {contextInfo.warningLevel === 'danger' && (
                  <HiExclamationTriangle className="w-4 h-4 text-red-500" />
                )}
                {contextInfo.warningLevel === 'warning' && (
                  <HiExclamationTriangle className="w-4 h-4 text-yellow-500" />
                )}
                <div className={`flex items-center gap-1 ${
                  contextInfo.warningLevel === 'danger' ? 'text-red-600' :
                  contextInfo.warningLevel === 'warning' ? 'text-yellow-600' :
                  'text-gray-500'
                }`}>
                  <span>{contextInfo.currentContextTokens.toLocaleString()} token</span>
                  <span>/</span>
                  <span>{contextInfo.contextLimit.toLocaleString()}</span>
                  <span>({Math.round(contextInfo.usagePercentage)}%)</span>
                </div>
              </div>
            )}
            <button
              onClick={handleClearChat}
              disabled={messages.length === 0 || status === 'streaming' || status === 'submitted'}
              className="px-2 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              title="チャット履歴をクリア"
            >
              <HiTrash className="w-3 h-3" />
              <span className="hidden sm:inline">クリア</span>
            </button>
            <button
              onClick={closeCurrentThread}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-700"
              title="チャットを閉じる"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* チャットエリア */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-12">
              <div className="text-lg mb-2">AIとの対話を開始</div>
              <div className="text-sm">メッセージを入力してください</div>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  max-w-2xl p-4 rounded-lg
                  ${m.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-200 shadow-sm'
                  }
                `}>
                  <div className="prose prose-sm max-w-none">
                    {m.role === 'user' ? (
                      <div className="whitespace-pre-wrap text-white">{m.content}</div>
                    ) : (
                      <div className="text-gray-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {(status === 'submitted' || status === 'streaming') && (
            <div className="flex justify-start">
              <div className="max-w-2xl p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
                <div className="flex items-center gap-2 text-gray-500">
                  {status === 'submitted' && (
                    <>
                      <AiOutlineLoading3Quarters className="animate-spin w-4 h-4 text-blue-500" />
                      <span>考え中...</span>
                    </>
                  )}
                  <button
                    type="button"
                    className="ml-auto px-3 py-1 text-xs text-blue-500 border border-blue-500 rounded hover:bg-blue-50 transition-colors flex items-center gap-1"
                    onClick={stop}
                  >
                    <HiStop className="w-3 h-3" />
                    停止
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="max-w-md p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="text-red-600 mb-2">エラーが発生しました</div>
                <button
                  type="button"
                  className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                  onClick={() => reload()}
                >
                  <HiArrowPath className="w-3 h-3" />
                  再試行
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 入力エリア */}
        <div className="bg-white border-t border-gray-200 p-4">
          {contextInfo && contextInfo.warningLevel !== 'safe' && (
            <div className={`max-w-4xl mx-auto mb-3 p-3 rounded-lg border ${
              contextInfo.warningLevel === 'danger' 
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}>
              <div className="flex items-center gap-2">
                <HiExclamationTriangle className={`w-4 h-4 ${
                  contextInfo.warningLevel === 'danger' ? 'text-red-500' : 'text-yellow-500'
                }`} />
                <div className="text-sm font-medium">
                  {contextInfo.warningLevel === 'danger' 
                    ? 'コンテキスト制限に達しています'
                    : 'コンテキスト使用量が多くなっています'
                  }
                </div>
              </div>
              <div className="text-xs mt-1">
                現在: {contextInfo.currentContextTokens.toLocaleString()} / {contextInfo.contextLimit.toLocaleString()} トークン 
                ({Math.round(contextInfo.usagePercentage)}% 使用)
                {contextInfo.warningLevel === 'danger' && (
                  <span className="block mt-1">新しいチャットを作成することをお勧めします。</span>
                )}
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={input}
                placeholder="メッセージを入力してください..."
                onChange={handleInputChange}
                disabled={status !== 'ready'}
              />
              <button
                type="submit"
                disabled={status !== 'ready' || !input.trim() || (contextInfo?.warningLevel === 'danger')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                title={contextInfo?.warningLevel === 'danger' ? 'コンテキスト制限に達しているため送信できません' : undefined}
              >
                <HiPaperAirplane className="w-4 h-4" />
                送信
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
