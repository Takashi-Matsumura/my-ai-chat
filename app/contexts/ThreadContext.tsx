'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Message } from '@ai-sdk/react';
import { encode } from 'gpt-tokenizer';

// モデル別コンテキスト制限の定義
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'gemma2:2b': 8192,
  'gemma2:9b': 8192,
  'gemma2:27b': 8192,
  'llama2:latest': 4096,
  'llama2:7b': 4096,
  'llama2:13b': 4096,
  'mistral:latest': 8192,
  'mistral:7b': 8192,
  'codellama:latest': 16384,
  'tinyllama:latest': 2048,
  'dsasai/llama3-elyza-jp-8b:latest': 8192,
  'llama3:latest': 8192,
  'llama3.1:latest': 128000,
  'llama3.1:8b': 128000,
  'llama3.1:70b': 128000,
  'gpt-oss:20b': 131072, // 128K context window
};

export interface ChatThreadMetadata {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalResponseTime: number; // milliseconds
  messageCount: number;
  averageResponseTime: number; // milliseconds
}

export interface ContextInfo {
  currentContextTokens: number;
  contextLimit: number;
  usagePercentage: number;
  warningLevel: 'safe' | 'warning' | 'danger';
}

export interface LLMParameters {
  temperature: number;
  maxTokens: number;
  contextWindowSize?: number;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
  metadata: ChatThreadMetadata;
  parameters: LLMParameters;
}

interface ThreadContextType {
  threads: ChatThread[];
  currentThread: ChatThread | null;
  createThread: (title?: string, model?: string) => string;
  createThreadWithInitialMessage: (message: Message, model?: string) => string;
  switchThread: (threadId: string) => void;
  closeCurrentThread: () => void;
  deleteThread: (threadId: string) => void;
  updateThread: (threadId: string, updates: Partial<ChatThread>) => void;
  updateThreadMessages: (threadId: string, messages: Message[]) => void;
  updateThreadMetadata: (threadId: string, usage: any, responseTime: number, lastMessage?: Message) => void;
  updateThreadTitle: (threadId: string, title: string) => void;
  updateThreadParameters: (threadId: string, parameters: Partial<LLMParameters>) => void;
  generateThreadTitle: (messages: Message[]) => string;
  getContextInfo: (messages: Message[], model: string) => ContextInfo;
  defaultModel: string;
  setDefaultModel: (model: string) => void;
  exportToJSON: () => Promise<void>;
  importFromJSON: (file: File) => Promise<boolean>;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

const STORAGE_KEY = 'chat-threads';

export function ThreadProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [defaultModel, setDefaultModel] = useState<string>('gpt-oss:20b');

  // ローカルストレージからスレッドを読み込み
  useEffect(() => {
    const loadThreads = () => {
      const savedThreads = localStorage.getItem(STORAGE_KEY);
      if (savedThreads) {
        try {
          const parsed = JSON.parse(savedThreads);
          const threadsWithDates = parsed.map((thread: any) => ({
            ...thread,
            createdAt: new Date(thread.createdAt),
            updatedAt: new Date(thread.updatedAt),
            metadata: thread.metadata || {
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0,
              totalResponseTime: 0,
              messageCount: 0,
              averageResponseTime: 0,
            },
            parameters: thread.parameters || {
              temperature: 0.7,
              maxTokens: 2000,
              contextWindowSize: undefined,
            },
          }));
          setThreads(threadsWithDates);
          
          // 起動時は常に初期チャット画面を表示（currentThreadはnullのまま）
          // ユーザーが明示的にスレッドを選択した場合のみスレッドを表示
        } catch (error) {
          console.error('Failed to load threads from localStorage:', error);
        }
      }
    };

    // 初期読み込み
    loadThreads();

    // ページの表示/非表示時に再読み込み（別のタブでの変更を反映）
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadThreads();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // スレッドの変更をローカルストレージに保存
  useEffect(() => {
    if (threads.length > 0) {
      // 保存前にデータを検証
      const threadsToSave = threads.map(thread => ({
        ...thread,
        messages: thread.messages || [], // undefinedを防ぐ
      }));
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threadsToSave));
    }
  }, [threads]);

  const createDefaultThread = (): ChatThread => {
    return {
      id: generateId(),
      title: generateInitialTitle(),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: defaultModel,
      metadata: {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalResponseTime: 0,
        messageCount: 0,
        averageResponseTime: 0,
      },
      parameters: {
        temperature: 0.7,
        maxTokens: 2000,
        contextWindowSize: undefined,
      },
    };
  };

  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const generateInitialTitle = (): string => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const dateString = now.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    });
    return `新しいチャット ${dateString} ${timeString}`;
  };

  const generateThreadTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim();
      return content.length > 30 ? content.substring(0, 30) + '...' : content;
    }
    return generateInitialTitle();
  };

  const getContextInfo = (messages: Message[], model: string): ContextInfo => {
    // 現在の会話で送信されるトークン数を計算
    const currentContextTokens = messages.reduce((total, message) => {
      return total + estimateTokens(message.content);
    }, 0);

    // モデルのコンテキスト制限を取得（未知のモデルの場合はデフォルト値）
    const contextLimit = MODEL_CONTEXT_LIMITS[model] || 4096;

    // 使用率を計算
    const usagePercentage = Math.min((currentContextTokens / contextLimit) * 100, 100);

    // 警告レベルを決定
    let warningLevel: 'safe' | 'warning' | 'danger' = 'safe';
    if (usagePercentage >= 95) {
      warningLevel = 'danger';
    } else if (usagePercentage >= 80) {
      warningLevel = 'warning';
    }

    return {
      currentContextTokens,
      contextLimit,
      usagePercentage,
      warningLevel
    };
  };

  const createThread = (title?: string, model?: string): string => {
    const newThread: ChatThread = {
      id: generateId(),
      title: title || generateInitialTitle(),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: model || defaultModel,
      metadata: {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalResponseTime: 0,
        messageCount: 0,
        averageResponseTime: 0,
      },
      parameters: {
        temperature: 0.7,
        maxTokens: 2000,
        contextWindowSize: undefined,
      },
    };
    
    setThreads(prev => [newThread, ...prev]);
    setCurrentThread(newThread);
    return newThread.id;
  };

  const createThreadWithInitialMessage = (message: Message, model?: string): string => {
    const title = generateThreadTitle([message]);
    const newThread: ChatThread = {
      id: generateId(),
      title,
      messages: [message],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: model || defaultModel,
      metadata: {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalResponseTime: 0,
        messageCount: 0,
        averageResponseTime: 0,
      },
      parameters: {
        temperature: 0.7,
        maxTokens: 2000,
        contextWindowSize: undefined,
      },
    };
    
    setThreads(prev => [newThread, ...prev]);
    setCurrentThread(newThread);
    return newThread.id;
  };

  const switchThread = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setCurrentThread(thread);
    }
  };

  const closeCurrentThread = () => {
    setCurrentThread(null);
  };

  const deleteThread = (threadId: string) => {
    setThreads(prev => {
      const filtered = prev.filter(t => t.id !== threadId);
      
      // 削除したスレッドが現在のスレッドの場合、初期画面に戻る
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
      }
      
      return filtered;
    });
  };

  const updateThread = (threadId: string, updates: Partial<ChatThread>) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId 
        ? { ...thread, ...updates, updatedAt: new Date() }
        : thread
    ));
    
    if (currentThread?.id === threadId) {
      setCurrentThread(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
    }
  };

  const isAutoGeneratedTitle = (title: string): boolean => {
    return title === '新しいチャット' || 
           title.startsWith('新しいチャット ') || 
           !title.trim();
  };

  const updateThreadMessages = (threadId: string, messages: Message[]) => {
    const updates: Partial<ChatThread> = {
      messages,
      updatedAt: new Date(),
    };
    
    // メッセージがある場合、自動生成タイトルの場合のみ最初のユーザーメッセージからタイトルを生成
    if (messages.length > 0) {
      const thread = threads.find(t => t.id === threadId);
      if (thread && isAutoGeneratedTitle(thread.title)) {
        const newTitle = generateThreadTitle(messages);
        // 最初のユーザーメッセージが存在する場合のみタイトルを更新
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage && firstUserMessage.content.trim()) {
          updates.title = newTitle;
        }
      }
    }
    
    updateThread(threadId, updates);
  };

  const updateThreadTitle = (threadId: string, title: string) => {
    if (!title.trim()) return;
    
    updateThread(threadId, { title: title.trim() });
  };

  const updateThreadParameters = (threadId: string, parameters: Partial<LLMParameters>) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    const updatedParameters = { ...thread.parameters, ...parameters };
    updateThread(threadId, { parameters: updatedParameters });
  };

  // GPTトークナイザーを使用した正確なトークン数推定
  const estimateTokens = (text: string): number => {
    if (!text) return 0;
    
    try {
      // GPT-3.5/GPT-4と同じエンコーディングを使用
      const tokens = encode(text);
      return tokens.length;
    } catch (error) {
      console.error('Error in token estimation:', error);
      // フォールバック: 簡易推定
      const words = text.split(/\s+/).length;
      return Math.ceil(words * 1.3); // 単語数 × 1.3 の近似
    }
  };

  const updateThreadMetadata = (threadId: string, usage: any, responseTime: number, lastMessage?: Message) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    const newTotalResponseTime = thread.metadata.totalResponseTime + responseTime;
    const newMessageCount = thread.metadata.messageCount + 1;

    // トークン数の計算：usageデータがあれば使用、なければ推定
    let totalTokens = thread.metadata.totalTokens;
    let promptTokens = thread.metadata.promptTokens;
    let completionTokens = thread.metadata.completionTokens;

    if (usage && (usage.totalTokens > 0 || usage.promptTokens > 0 || usage.completionTokens > 0)) {
      // Ollamaからusageデータが取得できた場合
      totalTokens += usage.totalTokens || 0;
      promptTokens += usage.promptTokens || 0;
      completionTokens += usage.completionTokens || 0;
    } else if (lastMessage) {
      // usageデータがない場合は推定
      const estimatedTokens = estimateTokens(lastMessage.content);
      totalTokens += estimatedTokens;
      if (lastMessage.role === 'assistant') {
        completionTokens += estimatedTokens;
      } else {
        promptTokens += estimatedTokens;
      }
    }

    const newMetadata: ChatThreadMetadata = {
      totalTokens,
      promptTokens,
      completionTokens,
      totalResponseTime: newTotalResponseTime,
      messageCount: newMessageCount,
      averageResponseTime: newTotalResponseTime / newMessageCount,
    };

    updateThread(threadId, { metadata: newMetadata });
  };

  const exportToJSON = async (): Promise<void> => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threads }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // ファイルをダウンロード
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'chat-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('エクスポートに失敗しました');
    }
  };

  const importFromJSON = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const result = await response.json();
      if (result.success && result.threads) {
        // インポートしたスレッドをマージ（IDの重複を避ける）
        const importedThreads = result.threads.map((thread: any) => ({
          ...thread,
          createdAt: new Date(thread.createdAt),
          updatedAt: new Date(thread.updatedAt),
          id: threads.find(t => t.id === thread.id) ? generateId() : thread.id, // ID重複時は新しいIDを生成
          metadata: thread.metadata || {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalResponseTime: 0,
            messageCount: 0,
            averageResponseTime: 0,
          },
        }));

        setThreads(prev => [...importedThreads, ...prev]);
        
        // インポート後も初期画面を維持（自動選択しない）

        alert(`${importedThreads.length}個のチャットスレッドをインポートしました`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Import error:', error);
      alert(`インポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      return false;
    }
  };

  return (
    <ThreadContext.Provider value={{
      threads,
      currentThread,
      createThread,
      createThreadWithInitialMessage,
      switchThread,
      closeCurrentThread,
      deleteThread,
      updateThread,
      updateThreadMessages,
      updateThreadMetadata,
      updateThreadTitle,
      updateThreadParameters,
      generateThreadTitle,
      getContextInfo,
      defaultModel,
      setDefaultModel,
      exportToJSON,
      importFromJSON,
    }}>
      {children}
    </ThreadContext.Provider>
  );
}

export function useThread() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error('useThread must be used within a ThreadProvider');
  }
  return context;
}