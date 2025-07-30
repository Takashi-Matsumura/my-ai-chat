'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Message } from '@ai-sdk/react';
import { encode } from 'gpt-tokenizer';

export interface ChatThreadMetadata {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalResponseTime: number; // milliseconds
  messageCount: number;
  averageResponseTime: number; // milliseconds
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
  metadata: ChatThreadMetadata;
}

interface ThreadContextType {
  threads: ChatThread[];
  currentThread: ChatThread | null;
  createThread: (title?: string, model?: string) => string;
  switchThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  updateThread: (threadId: string, updates: Partial<ChatThread>) => void;
  updateThreadMessages: (threadId: string, messages: Message[]) => void;
  updateThreadMetadata: (threadId: string, usage: any, responseTime: number, lastMessage?: Message) => void;
  updateThreadTitle: (threadId: string, title: string) => void;
  generateThreadTitle: (messages: Message[]) => string;
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
  const [defaultModel, setDefaultModel] = useState<string>('llama3.1');

  // ローカルストレージからスレッドを読み込み
  useEffect(() => {
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
        }));
        setThreads(threadsWithDates);
        
        // 最新のスレッドを現在のスレッドとして設定
        if (threadsWithDates.length > 0) {
          const latestThread = threadsWithDates.sort((a: ChatThread, b: ChatThread) => 
            b.createdAt.getTime() - a.createdAt.getTime()
          )[0];
          setCurrentThread(latestThread);
        }
      } catch (error) {
        console.error('Failed to load threads from localStorage:', error);
      }
    }
    // 初回起動時は空の状態でスタート
  }, []);

  // スレッドの変更をローカルストレージに保存
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
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

  const deleteThread = (threadId: string) => {
    setThreads(prev => {
      const filtered = prev.filter(t => t.id !== threadId);
      
      // 削除したスレッドが現在のスレッドの場合
      if (currentThread?.id === threadId) {
        if (filtered.length > 0) {
          // 他のスレッドがある場合は最新のものを選択
          const latestThread = filtered.sort((a, b) => 
            b.createdAt.getTime() - a.createdAt.getTime()
          )[0];
          setCurrentThread(latestThread);
        } else {
          // スレッドがない場合はcurrentThreadをnullに設定
          setCurrentThread(null);
        }
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

  // GPTトークナイザーを使用した正確なトークン数推定
  const estimateTokens = (text: string): number => {
    if (!text) return 0;
    
    try {
      // GPT-3.5/GPT-4と同じエンコーディングを使用
      const tokens = encode(text);
      console.log('Estimated tokens using GPT tokenizer:', tokens.length, 'for text:', text.substring(0, 50) + '...');
      return tokens.length;
    } catch (error) {
      console.error('Error in token estimation:', error);
      // フォールバック: 簡易推定
      const words = text.split(/\s+/).length;
      const estimatedTokens = Math.ceil(words * 1.3); // 単語数 × 1.3 の近似
      console.log('Using fallback token estimation:', estimatedTokens);
      return estimatedTokens;
    }
  };

  const updateThreadMetadata = (threadId: string, usage: any, responseTime: number, lastMessage?: Message) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) {
      console.log('Thread not found for metadata update:', threadId);
      return;
    }

    console.log('Current thread metadata:', thread.metadata);
    console.log('Updating with usage:', usage, 'responseTime:', responseTime);

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
      console.log('Using API usage data');
    } else if (lastMessage) {
      // usageデータがない場合は推定
      const estimatedTokens = estimateTokens(lastMessage.content);
      totalTokens += estimatedTokens;
      if (lastMessage.role === 'assistant') {
        completionTokens += estimatedTokens;
      } else {
        promptTokens += estimatedTokens;
      }
      console.log('Using estimated tokens:', estimatedTokens, 'for role:', lastMessage.role);
    }

    const newMetadata: ChatThreadMetadata = {
      totalTokens,
      promptTokens,
      completionTokens,
      totalResponseTime: newTotalResponseTime,
      messageCount: newMessageCount,
      averageResponseTime: newTotalResponseTime / newMessageCount,
    };

    console.log('New metadata:', newMetadata);
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
        
        // 最初のインポートしたスレッドを現在のスレッドに設定
        if (importedThreads.length > 0) {
          setCurrentThread(importedThreads[0]);
        }

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
      switchThread,
      deleteThread,
      updateThread,
      updateThreadMessages,
      updateThreadMetadata,
      updateThreadTitle,
      generateThreadTitle,
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