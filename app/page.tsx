'use client';

import { useChat, Message as BaseMessage } from '@ai-sdk/react';
import { useThinkingChat } from './hooks/useThinkingChat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useThread } from './contexts/ThreadContext';
import { useTheme } from './contexts/ThemeContext';
import { useOllama } from './contexts/OllamaContext';
import Sidebar from './components/Sidebar';
import ModelInfoDialog from './components/ModelInfoDialog';
import { HiChatBubbleLeftRight, HiPaperAirplane, HiTrash, HiArrowPath, HiStop, HiBars3, HiXMark, HiExclamationTriangle, HiCog6Tooth, HiChevronUp, HiChevronDown, HiSun, HiMoon, HiArrowDownTray, HiCheckCircle, HiAdjustmentsHorizontal, HiInformationCircle } from 'react-icons/hi2';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

// Extended message type for thinking support
interface Message extends BaseMessage {
  thinking?: string;
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
    closeCurrentThread,
    getContextInfo
  } = useThread();

  const { theme, toggleTheme } = useTheme();
  const { ollamaUrl } = useOllama();

  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const responseStartTimeRef = React.useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);

  // gpt-oss モデルかどうかを判定
  const isGptOssModel = currentThread?.model?.includes('gpt-oss') || false;
  

  const standardChatHook = useChat({
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

  const thinkingChatHook = useThinkingChat({
    api: '/api/chat',
    onFinish(message) {
      // メタデータを更新（thinking chat用）
      if (currentThread && responseStartTimeRef.current) {
        const responseTime = Date.now() - responseStartTimeRef.current;
        updateThreadMetadata(currentThread.id, {}, responseTime, message);
        responseStartTimeRef.current = null;
        setResponseStartTime(null);
      }
    },
    onError(error) {
      console.error('Thinking chat error:', error);
      if (responseStartTimeRef.current) {
        responseStartTimeRef.current = null;
        setResponseStartTime(null);
      }
    },
  });

  // 現在のモデルに応じて適切なフックを選択
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
  } = isGptOssModel ? thinkingChatHook : standardChatHook;

  // ストリーミング中用：最下部へスクロール
  const scrollToBottom = useCallback(() => {
    if (!chatAreaRef.current) return;
    
    const element = chatAreaRef.current;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth'
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

  // カスタムハンドラーでモデルを動的に設定
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;
    
    // 応答時間測定開始
    const startTime = Date.now();
    setResponseStartTime(startTime);
    responseStartTimeRef.current = startTime;
    
    // フォーカス復帰フラグを設定
    setShouldFocusInput(true);

    originalHandleSubmit(e, {
      body: {
        model: currentThread?.model || defaultModel,
        temperature: currentThread?.parameters?.temperature || 0.7,
        maxTokens: currentThread?.parameters?.maxTokens || 2000,
        contextWindowSize: currentThread?.parameters?.contextWindowSize,
        ollamaUrl: ollamaUrl, // 動的なOllama URL
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
      (setMessages as any)(currentThread.messages || []);
      previousMessagesRef.current = currentThread.messages || [];
    } else {
      (setMessages as any)([]);
      previousMessagesRef.current = [];
    }
    
    // 現在のスレッドIDを記録
    previousThreadId.current = currentThread?.id || null;
  }, [currentThread?.id, setMessages]);

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

  // 初期チャット送信ハンドラー
  const handleInitialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!initialInput.trim() || initialInputStatus !== 'ready') return;
    
    setInitialInputStatus('creating');
    
    try {
      // モデルチェックを実行（既に読み込まれていればスキップ）
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
          setInitialInputStatus('ready');
          return;
        }
        availableModels = data.models;
      }
      
      // 新しいスレッドを作成
      const modelToUse = selectedInitialModel || availableModels[0]?.name || defaultModel;
      const newThreadId = createThread(undefined, modelToUse);
      
      // 入力値をクリア
      const inputValue = initialInput;
      setInitialInput('');
      setInitialInputStatus('ready');
      
      // 新しく作成されたスレッドに初期メッセージを追加
      setTimeout(() => {
        // useChatの入力フィールドに値を設定
        handleInputChange({ target: { value: inputValue } } as any);
        // フォームを送信
        setTimeout(() => {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          const form = document.querySelector('form[data-chat-form]');
          if (form) {
            form.dispatchEvent(submitEvent);
          }
        }, 50);
      }, 100);
      
    } catch (error) {
      console.error('Failed to create initial chat:', error);
      alert('チャットの作成に失敗しました。再度お試しください。');
      setInitialInputStatus('ready');
    }
  };

  // コンテキスト情報を計算
  const contextInfo = currentThread ? getContextInfo(messages, currentThread.model) : null;

  // チャット送信が可能かどうかの判定
  const canSendMessage = currentModelExists === true && status === 'ready' && !checkingModel;


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
            </div>
            <div className="flex items-center gap-2">
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
                  <input
                    className={`
                      flex-1 p-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg
                      ${theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                    `}
                    value={initialInput}
                    placeholder="メッセージを入力してください..."
                    onChange={(e) => setInitialInput(e.target.value)}
                    disabled={initialInputStatus !== 'ready' || loadingModels}
                  />
                  <button
                    type="submit"
                    disabled={initialInputStatus !== 'ready' || !initialInput.trim() || loadingModels}
                    className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 text-lg"
                  >
                    {initialInputStatus === 'creating' ? (
                      <>
                        <AiOutlineLoading3Quarters className="animate-spin w-5 h-5" />
                        作成中...
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
              <div className="mt-6 max-w-4xl mx-auto">
                <div className="text-center">
                  <a
                    href="/settings"
                    className={`
                      inline-flex items-center gap-3 py-3 px-4 rounded-lg transition-colors cursor-pointer
                      ${theme === 'dark' 
                        ? 'bg-gray-800 border border-gray-700 hover:bg-gray-750 hover:border-gray-600' 
                        : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }
                    `}
                    title="クリックしてモデルを管理"
                  >
                    <HiCog6Tooth className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-600'}`} />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      使用モデル: {selectedInitialModel || (models.length > 0 ? models[0].name : 'デフォルト')}
                    </span>
                  </a>
                  
                  {/* モデルが見つからない場合の警告 */}
                  {!loadingModels && models.length === 0 && (
                    <div className="mt-3">
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
                  )}
                </div>
              </div>
              
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
                      <div className="whitespace-pre-wrap text-white">{m.content}</div>
                    ) : (
                      <div className={theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}>
                        {/* Thinking section for gpt-oss models */}
                        {(m as Message).thinking && isGptOssModel && (
                          <details className={`mb-4 p-3 rounded-lg border-l-4 ${
                            theme === 'dark' 
                              ? 'bg-blue-900 border-blue-600 text-blue-100' 
                              : 'bg-blue-50 border-blue-400 text-blue-800'
                          }`}>
                            <summary className="cursor-pointer font-medium text-sm flex items-center gap-2">
                              <span>🤔 Thinking Process</span>
                              <span className="text-xs opacity-70">(クリックして展開)</span>
                            </summary>
                            <div className="mt-3 text-sm font-mono whitespace-pre-wrap opacity-80">
                              {(m as Message).thinking}
                            </div>
                          </details>
                        )}
                        
                        {/* Main content */}
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
              <div className={`
                max-w-2xl p-4 shadow-sm rounded-lg border
                ${theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
                }
              `}>
                <div className={`
                  flex items-center gap-2
                  ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                `}>
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
            <div className="flex gap-3">
              <input
                ref={inputRef}
                className={`
                  flex-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }
                  ${!canSendMessage ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                value={input}
                placeholder={
                  currentModelExists === false 
                    ? "モデルが利用できません..." 
                    : checkingModel 
                      ? "モデルを確認中..." 
                      : "メッセージを入力してください..."
                }
                onChange={handleInputChange}
                disabled={!canSendMessage}
              />
              <button
                type="submit"
                disabled={!canSendMessage || !input.trim() || (contextInfo?.warningLevel === 'danger')}
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
