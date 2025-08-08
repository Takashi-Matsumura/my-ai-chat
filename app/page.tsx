'use client';

import { Message as BaseMessage } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { isThinkingModel } from './utils/modelUtils';
import { useThread } from './contexts/ThreadContext';
import { useTheme } from './contexts/ThemeContext';
import { useOllama } from './contexts/OllamaContext';
import Sidebar from './components/Sidebar';
import ModelInfoDialog from './components/ModelInfoDialog';
import { HiChatBubbleLeftRight, HiPaperAirplane, HiTrash, HiArrowPath, HiStop, HiBars3, HiXMark, HiExclamationTriangle, HiCog6Tooth, HiChevronUp, HiChevronDown, HiSun, HiMoon, HiArrowDownTray, HiCheckCircle, HiAdjustmentsHorizontal, HiInformationCircle, HiLightBulb, HiPaperClip, HiPhoto, HiDocument } from 'react-icons/hi2';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

// Extended message type for thinking support and file attachments
interface FileAttachment {
  name: string;
  size: number;
  type: string;
  data: string; // Base64 encoded data
}

interface Message extends BaseMessage {
  thinking?: string;
  attachments?: FileAttachment[];
}

export default function Chat() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialInput, setInitialInput] = useState('');
  const [initialInputStatus, setInitialInputStatus] = useState<'ready' | 'creating'>('ready');
  const [selectedInitialModel, setSelectedInitialModel] = useState<string>('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showParameterSettings, setShowParameterSettings] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  
  // ファイルアップロード関連のstate
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // モデル存在確認の状態
  const [currentModelExists, setCurrentModelExists] = useState<boolean | null>(null);
  const [checkingModel, setCheckingModel] = useState(false);
  
  const { 
    currentThread, 
    updateThread, 
    updateThreadMessages,
    updateThreadMetadata,
    updateThreadParameters,
    defaultModel,
    setDefaultModel,
    createThread,
    createThreadWithInitialMessage,
    closeCurrentThread,
    getContextInfo
  } = useThread();

  const { theme, toggleTheme } = useTheme();
  const { ollamaUrl } = useOllama();

  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const responseStartTimeRef = React.useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  

  // モデル種別に関係なく thinking をサポート
  

  // 統一送信関数により不要

  // 簡素化されたフック使用（状態管理のみ）

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'ready' | 'streaming' | 'submitted'>('ready');
  const [error, setError] = useState<Error | undefined>(undefined);

  // 入力変更ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // リロード関数
  const reload = () => {
    // 最後のメッセージを再送信
    if (messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        sendMessage(lastUserMessage.content, lastUserMessage.attachments || []);
      }
    }
  };

  // 停止関数（今後実装予定）
  const stop = () => {
    setStatus('ready');
  };

  // ストリーミング中用：最下部へスクロール
  const scrollToBottom = useCallback(() => {
    if (!chatAreaRef.current) return;
    
    const element = chatAreaRef.current;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  // メッセージ送信時用：中止ボタンまで即座にスクロール
  const scrollToStopButton = useCallback(() => {
    if (!chatAreaRef.current) return;
    
    const element = chatAreaRef.current;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'auto' // 即座にスクロール
    });
  }, []);

  // 完了時用：質問メッセージが右上に来るようにスクロール
  const scrollToQuestionMessage = useCallback(() => {
    if (!chatAreaRef.current || messages.length === 0) return;
    
    // 最後のユーザーメッセージを探す
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex >= 0) {
      const messageElements = chatAreaRef.current.querySelectorAll('.message-item');
      const targetElement = messageElements[lastUserMessageIndex];
      
      if (targetElement) {
        // 質問メッセージが右上（画面上部）に来る位置にスクロール
        const elementTop = (targetElement as HTMLElement).offsetTop;
        const scrollTop = Math.max(0, elementTop - 80); // 80px余白
        
        chatAreaRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);

  // 通常メッセージ送信ハンドラー（統一版）
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;
    
    // フォーカス復帰フラグを設定
    setShouldFocusInput(true);
    
    // 中止ボタンまで即座にスクロール
    setTimeout(() => {
      scrollToStopButton();
    }, 50);

    // 統一送信関数を使用
    await sendMessage(input, selectedFiles, false);
    
    // 送信後にファイルリストをクリア
    setSelectedFiles([]);
  };


  // スレッドが変更されたときにメッセージを同期
  const previousThreadId = React.useRef<string | null>(null);
  
  useEffect(() => {
    // スレッド読み込み開始フラグを設定
    isLoadingThread.current = true;
    
    // 新しいスレッドのメッセージを読み込み
    if (currentThread) {
      // スレッドIDが実際に変更された場合のみ処理
      if (previousThreadId.current !== currentThread.id) {
        // 常にスレッドのメッセージを読み込み（初期API処理との競合を解消）
        (setMessages as any)(currentThread.messages || []);
        previousMessagesRef.current = currentThread.messages || [];
      }
    } else {
      (setMessages as any)([]);
      previousMessagesRef.current = [];
    }
    
    // 現在のスレッドIDを記録
    previousThreadId.current = currentThread?.id || null;
  }, [currentThread?.id, currentThread?.messages, setMessages]);

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

  // メタデータ更新は sendMessage 内で直接処理

  // input値の変化を監視してフォーカスを戻す
  useEffect(() => {
    if (shouldFocusInput && input === '') {
      // input値がクリアされたタイミングでフォーカスを戻す
      const focusInput = () => {
        if (inputRef.current) {
          // disabledを一時的に解除してフォーカス
          const wasDisabled = inputRef.current.disabled;
          if (wasDisabled) {
            inputRef.current.disabled = false;
          }
          
          inputRef.current.focus();
        }
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(focusInput);
      });
      
      setShouldFocusInput(false);
    }
  }, [input, shouldFocusInput]);

  // ストリーミング中：メッセージ更新時に最下部へスクロール
  useEffect(() => {
    if (status === 'streaming' && messages.length > 0) {
      // 少し遅らせて確実にDOMが更新された後にスクロール
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, status, scrollToBottom]);

  // ストリーミング完了時：質問メッセージが右上に来るようにスクロール
  useEffect(() => {
    if (status === 'ready' && messages.length > 0) {
      // ストリーミングが完了したら質問メッセージの位置へスクロール
      const timeoutId = setTimeout(() => {
        scrollToQuestionMessage();
      }, 500); // 少し遅らせて最終的なコンテンツが確定してから
      
      return () => clearTimeout(timeoutId);
    }
  }, [status, scrollToQuestionMessage, messages.length]);

  // モデル情報の取得
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (ollamaUrl !== 'http://localhost:11434') {
          queryParams.append('ollamaUrl', ollamaUrl);
        }
        const url = `/api/models${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          // デフォルトモデルが利用可能かチェックし、なければ最初のモデルを使用
          const availableModelNames = data.models.map((m: any) => m.name);
          if (availableModelNames.includes(defaultModel)) {
            setSelectedInitialModel(defaultModel);
          } else {
            const firstModel = data.models[0].name;
            setDefaultModel(firstModel);
            setSelectedInitialModel(firstModel);
          }
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
        // エラー詳細をユーザーに表示するためのstateを追加することもできます
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [ollamaUrl]);

  // 現在のスレッドのモデルが存在するかチェック
  const checkCurrentModelExists = useCallback(async (modelName: string) => {
    if (!modelName) {
      setCurrentModelExists(false);
      return false;
    }

    setCheckingModel(true);
    try {
      const queryParams = new URLSearchParams();
      if (ollamaUrl !== 'http://localhost:11434') {
        queryParams.append('ollamaUrl', ollamaUrl);
      }
      const url = `/api/models${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const installedModels = data.models || [];
        
        // モデル名の部分一致や完全一致をチェック
        const exists = installedModels.some((m: OllamaModel) => 
          m.name === modelName || 
          m.name.startsWith(modelName + ':') ||
          modelName.startsWith(m.name.split(':')[0])
        );
        
        setCurrentModelExists(exists);
        return exists;
      } else {
        setCurrentModelExists(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking model existence:', error);
      setCurrentModelExists(false);
      return false;
    } finally {
      setCheckingModel(false);
    }
  }, [ollamaUrl]);

  // スレッド変更時にモデルの存在を確認
  useEffect(() => {
    if (currentThread?.model) {
      checkCurrentModelExists(currentThread.model);
    } else {
      setCurrentModelExists(null);
    }
  }, [currentThread?.model, checkCurrentModelExists]);

  const handleClearChat = () => {
    if (currentThread && messages.length > 0 && confirm('このスレッドのチャット履歴をクリアしますか？')) {
(setMessages as any)([]);
    }
  };

  // 初期メッセージ送信ハンドラー（統一版）
  const handleInitialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!initialInput.trim() || initialInputStatus !== 'ready') return;
    
    setInitialInputStatus('creating');
    await sendMessage(initialInput, [], true);
  };


  // 🚀 統一メッセージ送信関数
  const sendMessage = async (content: string, attachments: FileAttachment[] = [], isInitial: boolean = false) => {
    try {
      // 1️⃣ バリデーション
      if (!content.trim()) return;
      if (!canSendMessage && !isInitial) return;
      
      // ステータス設定
      setStatus('submitted');
      setError(undefined);
      
      // 2️⃣ スレッド管理
      let thread = currentThread;
      if (!thread) {
        // モデルチェック
        let availableModels = models;
        if (!availableModels.length) {
          const queryParams = new URLSearchParams();
          if (ollamaUrl !== 'http://localhost:11434') {
            queryParams.append('ollamaUrl', ollamaUrl);
          }
          const url = `/api/models${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (!response.ok || !data.hasModels) {
            alert('OllamaにLLMモデルがインストールされていません。README.mdの手順に従ってモデルをインストールしてください。');
            return;
          }
          availableModels = data.models;
        }
        
        // 新しいスレッド作成
        const modelToUse = selectedInitialModel || availableModels[0]?.name || defaultModel;
        const userMessage = {
          id: Date.now().toString(),
          role: 'user' as const,
          content: content.trim(),
          attachments,
        };
        
        const newThreadId = createThreadWithInitialMessage(userMessage, modelToUse);
        // 新しく作成されたスレッドオブジェクトを作成（createThreadWithInitialMessageが完全なスレッドを返すと仮定）
        thread = {
          id: newThreadId,
          model: modelToUse,
          messages: [],
          title: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalResponseTime: 0,
            messageCount: 0,
            averageResponseTime: 0
          },
          parameters: {
            temperature: 0.7,
            maxTokens: 2000,
            contextWindowSize: undefined
          }
        };
      }
      
      // 3️⃣ メッセージ準備
      const userMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: content.trim(),
        attachments,
      };
      
      // UIに即座に表示
      const currentMessages = isInitial ? [] : messages;
      (setMessages as any)([...currentMessages, userMessage]);
      
      // 4️⃣ API呼び出し準備
      const startTime = Date.now();
      setResponseStartTime(startTime);
      responseStartTimeRef.current = startTime;
      
      // 5️⃣ ストリーミング処理
      setStatus('streaming');
      
      // モデルタイプ判定
      const modelName = thread.model || defaultModel;
      const isThinking = isThinkingModel(modelName);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...currentMessages, userMessage],
          model: modelName,
          temperature: thread.parameters?.temperature || 0.7,
          maxTokens: thread.parameters?.maxTokens || 2000,
          contextWindowSize: thread.parameters?.contextWindowSize,
          ollamaUrl: ollamaUrl,
          attachments,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let assistantMessage = '';
      let thinking = '';

      // アシスタントメッセージのプレースホルダー
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessageObj = {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: '',
        thinking: isThinking ? undefined as string | undefined : undefined,
      };
      
      // 初期メッセージリストを設定（一度だけ）
      const initialMessages = [...currentMessages, userMessage, assistantMessageObj];
      (setMessages as any)(initialMessages);

      // ストリーミングレスポンス処理（モデルタイプで分岐）
      const reader = response.body?.getReader();
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() === '' || !line.startsWith('data: ')) continue;
              
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                
                if (isThinking) {
                  // Thinkingモデルの処理
                  if (parsed.type === 'thinking') {
                    thinking = parsed.content;
                    assistantMessageObj.thinking = thinking;
                  } else if (parsed.type === 'content') {
                    assistantMessage += parsed.content;
                    assistantMessageObj.content = assistantMessage;
                  }
                } else {
                  // 通常モデルの処理
                  if (parsed.content) {
                    assistantMessage += parsed.content;
                    assistantMessageObj.content = assistantMessage;
                  }
                }
                
                // リアルタイムUI更新
                (setMessages as any)([...currentMessages, userMessage, { ...assistantMessageObj }]);
              } catch (e) {
                // JSON パースエラーは無視
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      // 6️⃣ 完了処理
      assistantMessageObj.content = assistantMessage;
      if (isThinking) {
        assistantMessageObj.thinking = thinking || undefined;
      }

      const finalMessages = [...currentMessages, userMessage, assistantMessageObj];
      updateThreadMessages(thread.id, finalMessages);
      (setMessages as any)(finalMessages);

      // メタデータ更新
      if (responseStartTimeRef.current) {
        const responseTime = Date.now() - responseStartTimeRef.current;
        updateThreadMetadata(thread.id, {}, responseTime, assistantMessageObj);
        responseStartTimeRef.current = null;
        setResponseStartTime(null);
      }
      
      // 入力クリア
      if (isInitial) {
        setInitialInput('');
        setInitialInputStatus('ready');
      } else {
        setInput('');
      }
      
      // ステータス復帰
      setStatus('ready');
      
    } catch (error) {
      // 7️⃣ エラーハンドリング
      console.error('Send message error:', error);
      setError(error as Error);
      setStatus('ready');
      
      if (responseStartTimeRef.current) {
        responseStartTimeRef.current = null;
        setResponseStartTime(null);
      }
      if (isInitial) {
        setInitialInputStatus('ready');
      }
    }
  };

  // コンテキスト情報を計算
  const contextInfo = currentThread ? getContextInfo(messages, currentThread.model) : null;

  // チャット送信が可能かどうかの判定
  const canSendMessage = currentModelExists === true && status === 'ready' && !checkingModel;




  // ファイル処理のヘルパー関数
  const handleFileSelect = useCallback((files: FileList) => {
    Array.from(files).forEach(async (file) => {
      // ファイルサイズ制限 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`ファイル "${file.name}" は10MBを超えています。`);
        return;
      }

      // 許可されるファイル形式
      const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert(`ファイル形式 "${file.type}" はサポートされていません。\n対応形式: TXT, MD, PDF, PNG, JPEG, GIF, WebP`);
        return;
      }

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const attachment: FileAttachment = {
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64,
        };

        setSelectedFiles(prev => [...prev, attachment]);
      } catch (error) {
        alert(`ファイル "${file.name}" の読み込みに失敗しました。`);
      }
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);


  if (!currentThread) {
    return (
      <div className={`
        flex h-screen
        ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}
      `}>
        {/* サイドバー */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* メインコンテンツ */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'md:ml-80' : 'md:ml-0'
        }`}>
          {/* ヘッダー */}
          <div className={`
            border-b px-4 py-3 flex items-center justify-between
            ${theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
            }
          `}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`
                  p-2 rounded-md transition-colors
                  ${theme === 'dark' 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                  }
                `}
              >
                <HiBars3 className="w-5 h-5" />
              </button>
              <h1 className={`
                text-lg font-semibold
                ${theme === 'dark' ? 'text-white' : 'text-gray-800'}
              `}>
                チャットアプリ
              </h1>
              
              {/* モデル選択コンボボックス */}
              <div className="flex items-center gap-2 ml-4">
                <select
                  value={selectedInitialModel || defaultModel}
                  onChange={(e) => setSelectedInitialModel(e.target.value)}
                  className={`
                    px-3 py-1 rounded-md border text-sm font-medium
                    ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }
                  `}
                  disabled={checkingModel}
                >
                  {models.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 設定ボタン */}
              <a
                href="/settings"
                className={`
                  p-2 rounded-md transition-colors
                  ${theme === 'dark' 
                    ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  }
                `}
                title="LLMモデル管理・サーバー設定"
              >
                <HiCog6Tooth className="w-5 h-5" />
              </a>
              
              <button
                onClick={toggleTheme}
                className={`
                  p-2 rounded-md transition-colors
                  ${theme === 'dark' 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-100'
                  }
                `}
                title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
              >
                {theme === 'light' ? (
                  <HiMoon className="w-5 h-5 text-gray-600" />
                ) : (
                  <HiSun className="w-5 h-5 text-yellow-500" />
                )}
              </button>
            </div>
          </div>

          {/* 初期チャット画面 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-2xl mx-auto px-4 w-full">
              <div className="mb-6 flex justify-center">
                <HiChatBubbleLeftRight className="text-6xl text-blue-500" />
              </div>
              <h2 className={`
                text-2xl font-semibold mb-4
                ${theme === 'dark' ? 'text-white' : 'text-gray-800'}
              `}>
                AIチャットへようこそ
              </h2>
              <p className={`
                leading-relaxed mb-8
                ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
              `}>
                何でもお気軽にお聞きください。AIがお手伝いします。
              </p>
              
              
              {/* 初期チャット入力フォーム */}
              <form onSubmit={handleInitialSubmit} className="max-w-4xl mx-auto">
                <div className="flex gap-3">
                  <textarea
                    className={`
                      flex-1 p-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg resize-none
                      ${theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                    `}
                    rows={initialInput.split('\n').length || 1}
                    value={initialInput}
                    placeholder="メッセージを入力してください（Shift+Enterで送信）..."
                    onChange={(e) => setInitialInput(e.target.value)}
                    disabled={initialInputStatus !== 'ready' || loadingModels}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        if (initialInputStatus === 'ready' && initialInput.trim() && !loadingModels) {
                          handleInitialSubmit(e as any);
                        }
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={initialInputStatus !== 'ready' || !initialInput.trim() || loadingModels}
                    className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 text-lg self-end"
                  >
                    {initialInputStatus === 'creating' ? (
                      <>
                        <div className="relative">
                          <AiOutlineLoading3Quarters className="animate-spin w-5 h-5" />
                          <div className="absolute inset-0 animate-ping">
                            <div className="w-5 h-5 bg-white rounded-full opacity-20"></div>
                          </div>
                        </div>
                        <span className="flex items-center gap-2">
                          チャット作成中
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-white rounded-full thinking-dots"></div>
                            <div className="w-1 h-1 bg-white rounded-full thinking-dots"></div>
                            <div className="w-1 h-1 bg-white rounded-full thinking-dots"></div>
                          </div>
                        </span>
                      </>
                    ) : (
                      <>
                        <HiPaperAirplane className="w-5 h-5" />
                        送信
                      </>
                    )}
                  </button>
                </div>
              </form>
              
              {/* シンプルなモデル表示とモデル管理へのリンク */}
              {/* モデルが見つからない場合の警告 */}
              {!loadingModels && models.length === 0 && (
                <div className="mt-6 max-w-4xl mx-auto">
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                      theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-700'
                    }`}>
                      <HiExclamationTriangle className="w-4 h-4" />
                      <span>LLMモデルが見つかりません</span>
                      <a
                        href="/settings"
                        className="ml-2 underline hover:no-underline"
                      >
                        モデルをダウンロード
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      flex h-screen
      ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}
    `}>
      {/* サイドバー */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* メインコンテンツ */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'md:ml-80' : 'md:ml-0'
      }`}>
        {/* ヘッダー */}
        <div className={`
          border-b px-4 py-3 flex items-center justify-between
          ${theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
          }
        `}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`
                p-2 rounded-md transition-colors flex-shrink-0
                ${theme === 'dark' 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
                }
              `}
            >
              <HiBars3 className="w-5 h-5" />
            </button>
            <h1 className={`
              text-lg font-semibold truncate min-w-0
              ${theme === 'dark' ? 'text-white' : 'text-gray-800'}
            `}
            title={currentThread.title}
            >
              {currentThread.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentThread.metadata && currentThread.metadata.totalTokens > 0 && (
              <div className={`
                hidden lg:flex items-center gap-4 text-xs
                ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
              `}>
                <span>{currentThread.metadata.totalTokens.toLocaleString()} トークン</span>
                <span className="text-blue-500 font-medium">
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
                  contextInfo.warningLevel === 'danger' 
                    ? (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                    : contextInfo.warningLevel === 'warning' 
                      ? (theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600')
                      : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')
                }`}>
                  <span>{contextInfo.currentContextTokens.toLocaleString()} token</span>
                  <span>/</span>
                  <span>{contextInfo.contextLimit.toLocaleString()}</span>
                  <span>({Math.round(contextInfo.usagePercentage)}%)</span>
                </div>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className={`
                p-2 rounded-md transition-colors
                ${theme === 'dark' 
                  ? 'hover:bg-gray-700' 
                  : 'hover:bg-gray-100'
                }
              `}
              title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
            >
              {theme === 'light' ? (
                <HiMoon className="w-5 h-5 text-gray-600" />
              ) : (
                <HiSun className="w-5 h-5 text-yellow-500" />
              )}
            </button>
            <button
              onClick={() => setShowParameterSettings(!showParameterSettings)}
              className={`
                p-2 rounded-md transition-colors
                ${theme === 'dark' 
                  ? 'hover:bg-gray-700' 
                  : 'hover:bg-gray-100'
                }
              `}
              title="パラメータ設定"
            >
              <HiAdjustmentsHorizontal className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowModelInfo(true)}
              className={`
                p-2 rounded-md transition-colors
                ${theme === 'dark' 
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-gray-100' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                }
              `}
              title="モデル情報を表示"
            >
              <HiInformationCircle className="w-5 h-5" />
            </button>
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
              className={`
                p-2 rounded-md transition-colors
                ${theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }
              `}
              title="チャットを閉じる"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* パラメータ設定パネル */}
        {showParameterSettings && currentThread && (
          <div className={`
            border-b px-4 py-4
            ${theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-gray-50 border-gray-200'
            }
          `}>
            <div className="max-w-4xl mx-auto">
              <h3 className={`
                text-sm font-medium mb-4
                ${theme === 'dark' ? 'text-white' : 'text-gray-800'}
              `}>
                LLMパラメータ設定 - 研究用
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temperature設定 */}
                <div>
                  <label className={`
                    block text-sm font-medium mb-2
                    ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                  `}>
                    Temperature: {currentThread.parameters?.temperature || 0.7}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={currentThread.parameters?.temperature || 0.7}
                    onChange={(e) => updateThreadParameters(currentThread.id, {
                      temperature: parseFloat(e.target.value)
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>一貫性重視 (0.1)</span>
                    <span>創造性重視 (1.0)</span>
                  </div>
                </div>

                {/* Context Window設定 */}
                <div>
                  <label className={`
                    block text-sm font-medium mb-2
                    ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                  `}>
                    コンテキストウィンドウ: {currentThread.parameters?.contextWindowSize ? 
                      `${currentThread.parameters.contextWindowSize} トークン` : 
                      'デフォルト (2000 トークン)'
                    }
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="8000"
                    step="500"
                    value={currentThread.parameters?.contextWindowSize || 2000}
                    onChange={(e) => updateThreadParameters(currentThread.id, {
                      contextWindowSize: parseInt(e.target.value)
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>短期記憶 (500)</span>
                    <span>長期記憶 (8000)</span>
                  </div>
                </div>
              </div>

              <div className={`
                mt-4 p-3 rounded-lg text-sm
                ${theme === 'dark' 
                  ? 'bg-blue-900 text-blue-200' 
                  : 'bg-blue-50 text-blue-800'
                }
              `}>
                <strong>研究ヒント:</strong> Temperatureを変えて同じ質問をすると、回答の創造性の違いを確認できます。
                コンテキストウィンドウを小さくすると、長い会話での記憶力の変化を観察できます。
              </div>
            </div>
          </div>
        )}

        {/* チャットエリア */}
        <div ref={chatAreaRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {/* モデル不存在時の警告バナー */}
          {currentModelExists === false && (
            <div className={`
              mx-auto max-w-2xl p-4 rounded-lg border-l-4
              ${theme === 'dark'
                ? 'bg-red-900 border-red-600 text-red-200'
                : 'bg-red-50 border-red-400 text-red-800'
              }
            `}>
              <div className="flex items-start gap-3">
                <HiExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2">
                    LLMモデルが利用できません
                  </h3>
                  <p className="text-sm mb-3">
                    このチャットで使用されるモデル「{currentThread?.model}」がサーバーにインストールされていません。
                    チャットを続行するには、モデルをダウンロードしてください。
                  </p>
                  <a
                    href="/settings"
                    className={`
                      inline-block px-3 py-1.5 text-xs rounded-md font-medium transition-colors
                      ${theme === 'dark'
                        ? 'bg-red-800 text-red-100 hover:bg-red-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                      }
                    `}
                  >
                    モデル管理画面で解決
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* モデル確認中の表示 */}
          {checkingModel && (
            <div className={`
              mx-auto max-w-2xl p-4 rounded-lg
              ${theme === 'dark'
                ? 'bg-blue-900 text-blue-200'
                : 'bg-blue-50 text-blue-800'
              }
            `}>
              <div className="flex items-center gap-3">
                <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                <span className="text-sm">モデルの利用可能性を確認中...</span>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className={`
              text-center mt-12
              ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
            `}>
              <div className="text-lg mb-2">AIとの対話を開始</div>
              <div className="text-sm">メッセージを入力してください</div>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`message-item flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  max-w-2xl p-4 rounded-lg
                  ${m.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : (theme === 'dark'
                        ? 'bg-gray-800 border border-gray-700 shadow-sm'
                        : 'bg-white border border-gray-200 shadow-sm'
                      )
                  }
                `}>
                  <div className="prose prose-sm max-w-none">
                    {m.role === 'user' ? (
                      <div>
                        {/* 添付ファイル表示 (ユーザーメッセージ) */}
                        {(m as Message).attachments && (m as Message).attachments!.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <HiPaperClip className="w-4 h-4 text-blue-200" />
                              <span className="text-sm font-medium text-blue-200">
                                添付ファイル
                              </span>
                            </div>
                            <div className="space-y-2">
                              {(m as Message).attachments!.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-blue-600 bg-opacity-50 rounded border border-blue-400">
                                  {file.type.startsWith('image/') ? (
                                    <>
                                      <HiPhoto className="w-4 h-4 text-blue-200 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium text-blue-100 truncate">
                                          {file.name}
                                        </div>
                                        <div className="text-xs text-blue-200">
                                          画像ファイル • {(file.size / 1024).toFixed(1)} KB
                                        </div>
                                        {/* 画像プレビュー */}
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                          src={file.data} 
                                          alt={file.name}
                                          className="mt-2 max-w-full max-h-48 rounded border border-blue-400"
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <HiDocument className="w-4 h-4 text-blue-200 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium text-blue-100 truncate">
                                          {file.name}
                                        </div>
                                        <div className="text-xs text-blue-200">
                                          {file.type} • {(file.size / 1024).toFixed(1)} KB
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap text-white">{m.content}</div>
                      </div>
                    ) : (
                      <div className={theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}>
                        {/* Thinking section for thinking models only */}
                        {(m as Message).thinking && isThinkingModel(currentThread?.model || '') && (
                          <details className={`mb-4 p-3 rounded-lg border-l-4 ${
                            theme === 'dark' 
                              ? 'bg-blue-900 border-blue-600 text-blue-100' 
                              : 'bg-blue-50 border-blue-400 text-blue-800'
                          }`}>
                            <summary className="cursor-pointer font-medium text-sm flex items-center gap-2">
                              <HiLightBulb className="w-4 h-4" />
                              <span>Thinking Process</span>
                              <span className="text-xs opacity-70">(クリックして展開)</span>
                            </summary>
                            <div className="mt-3 text-sm font-mono whitespace-pre-wrap opacity-80">
                              {(m as Message).thinking}
                            </div>
                          </details>
                        )}
                        
                        {/* Main content */}
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({children}) => <h1 className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{children}</h1>,
                            h2: ({children}) => <h2 className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{children}</h2>,
                            h3: ({children}) => <h3 className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{children}</h3>,
                            h4: ({children}) => <h4 className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{children}</h4>,
                            h5: ({children}) => <h5 className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{children}</h5>,
                            h6: ({children}) => <h6 className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{children}</h6>,
                            strong: ({children}) => <strong className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{children}</strong>,
                            th: ({children}) => <th className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{children}</th>,
                            td: ({children}) => <td className={theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}>{children}</td>,
                          }}
                        >
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
              <div className={`
                max-w-2xl p-4 shadow-sm rounded-lg border
                ${theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
                }
              `}>
                <div className={`
                  flex items-center justify-between
                  ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                `}>
                  <div className="flex items-center gap-6">
                    {status === 'submitted' && (
                      <>
                        {/* パルスアニメーション付きのアイコン */}
                        <div className="relative">
                          <AiOutlineLoading3Quarters className="animate-spin w-5 h-5 text-blue-500" />
                          <div className="absolute inset-0 animate-ping">
                            <div className="w-5 h-5 bg-blue-400 rounded-full opacity-25"></div>
                          </div>
                        </div>
                        
                        {/* タイピング風アニメーション */}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">AIが考え中</span>
                            <div className="flex space-x-1">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full thinking-dots"></div>
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full thinking-dots"></div>
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full thinking-dots"></div>
                            </div>
                          </div>
                          <div className="text-xs opacity-75 mt-1 relative overflow-hidden">
                            <div className="gradient-loading absolute inset-0"></div>
                            最適な回答を準備しています
                          </div>
                        </div>
                      </>
                    )}
                    
                    {status === 'streaming' && (
                      <>
                        {/* ストリーミング中のアニメーション */}
                        <div className="flex items-center gap-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full typing-indicator"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full typing-indicator"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full typing-indicator"></div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-purple-500 font-medium">回答中...</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* 停止ボタン */}
                  <button
                    type="button"
                    className={`
                      p-2 border rounded-full transition-all duration-200 flex items-center justify-center
                      ${theme === 'dark'
                        ? 'text-red-400 border-red-500 hover:bg-red-900/20'
                        : 'text-red-600 border-red-300 hover:bg-red-50'
                      }
                    `}
                    onClick={stop}
                    title="生成を停止"
                  >
                    <HiStop className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className={`
                max-w-md p-4 border rounded-lg text-center
                ${theme === 'dark'
                  ? 'bg-red-900 border-red-700'
                  : 'bg-red-50 border-red-200'
                }
              `}>
                <div className={`
                  mb-2
                  ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}
                `}>エラーが発生しました</div>
                <button
                  type="button"
                  className={`
                    px-3 py-1 text-sm border rounded transition-colors flex items-center gap-1
                    ${theme === 'dark'
                      ? 'text-red-300 border-red-600 hover:bg-red-800'
                      : 'text-red-600 border-red-300 hover:bg-red-100'
                    }
                  `}
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
        <div className={`
          border-t p-4
          ${theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
          }
        `}>
          {contextInfo && contextInfo.warningLevel !== 'safe' && (
            <div className={`max-w-4xl mx-auto mb-3 p-3 rounded-lg border ${
              contextInfo.warningLevel === 'danger' 
                ? (theme === 'dark'
                    ? 'bg-red-900 border-red-700 text-red-200'
                    : 'bg-red-50 border-red-200 text-red-800'
                  )
                : (theme === 'dark'
                    ? 'bg-yellow-900 border-yellow-700 text-yellow-200'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  )
            }`}>
              <div className="flex items-center gap-2">
                <HiExclamationTriangle className={`w-4 h-4 ${
                  contextInfo.warningLevel === 'danger' 
                    ? (theme === 'dark' ? 'text-red-400' : 'text-red-500')
                    : (theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500')
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
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto" data-chat-form>
            {/* 添付ファイル表示 */}
            {selectedFiles.length > 0 && (
              <div className={`mb-3 p-3 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <HiPaperClip className="w-4 h-4 text-gray-500" />
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    添付ファイル ({selectedFiles.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className={`flex items-center justify-between p-2 rounded border ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {file.type.startsWith('image/') ? (
                          <HiPhoto className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <HiDocument className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className={`text-sm font-medium truncate ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                          }`}>
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className={`p-1 rounded hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors ${
                          theme === 'dark' ? 'hover:bg-red-900' : ''
                        }`}
                        title="ファイルを削除"
                      >
                        <HiXMark className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* メイン入力エリア */}
            <div 
              className={`relative ${
                isDragActive 
                  ? `border-2 border-dashed border-blue-500 bg-blue-50 ${theme === 'dark' ? 'bg-blue-900' : ''}` 
                  : ''
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isDragActive && (
                <div className={`absolute inset-0 flex items-center justify-center z-10 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-blue-900 bg-opacity-90' 
                    : 'bg-blue-50 bg-opacity-90'
                }`}>
                  <div className="text-center">
                    <HiPaperClip className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
                    }`}>
                      ファイルをドロップしてください
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 justify-center">
                {/* ファイル添付ボタン（左側） */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canSendMessage}
                  className={`
                    w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0
                    ${theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                    } 
                    disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md
                  `}
                  title="ファイルを添付"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>

                {/* テキストエリア（中央） */}
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    className={`
                      w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none
                      ${theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                      ${!canSendMessage ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    rows={Math.max(1, input.split('\n').length)}
                    value={input}
                    placeholder={
                      currentModelExists === false 
                        ? "モデルが利用できません..." 
                        : checkingModel 
                          ? "モデルを確認中..." 
                          : "メッセージを入力してください（Shift+Enterで送信）..."
                    }
                    onChange={(e) => handleInputChange(e as any)}
                    disabled={!canSendMessage}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        if (canSendMessage && input.trim() && contextInfo?.warningLevel !== 'danger') {
                          handleSubmit(e as any);
                        }
                      }
                    }}
                  />
                </div>

                {/* 送信ボタン（右側） */}
                <button
                  type="submit"
                  disabled={!canSendMessage || !input.trim() || (contextInfo?.warningLevel === 'danger') || status !== 'ready'}
                  className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 flex-shrink-0"
                  title={contextInfo?.warningLevel === 'danger' ? 'コンテキスト制限に達しているため送信できません' : undefined}
                >
                  {(status === 'submitted' || status === 'streaming') ? (
                    <>
                      <div className="relative">
                        <AiOutlineLoading3Quarters className="animate-spin w-4 h-4" />
                        <div className="absolute inset-0 animate-ping">
                          <div className="w-4 h-4 bg-white rounded-full opacity-20"></div>
                        </div>
                      </div>
                      <span className="flex items-center gap-2">
                        {status === 'submitted' ? '処理中' : '送信中'}
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-white rounded-full thinking-dots"></div>
                          <div className="w-1 h-1 bg-white rounded-full thinking-dots"></div>
                          <div className="w-1 h-1 bg-white rounded-full thinking-dots"></div>
                        </div>
                      </span>
                    </>
                  ) : (
                    <>
                      <HiPaperAirplane className="w-4 h-4" />
                      送信
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* モデル情報ダイアログ */}
      {currentThread?.model && (
        <ModelInfoDialog
          isOpen={showModelInfo}
          onClose={() => setShowModelInfo(false)}
          modelName={currentThread.model}
        />
      )}
    </div>
  );
}
