'use client';

import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useEffect } from 'react';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export default function Chat() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemma3');
  const [loadingModels, setLoadingModels] = useState(true);

  const {
    error,
    input,
    status,
    handleInputChange,
    handleSubmit,
    messages,
    reload,
    stop,
    setMessages,
  } = useChat({
    body: {
      model: selectedModel,
    },
    onFinish(message, { usage, finishReason }) {
      console.log('Usage', usage);
      console.log('FinishReason', finishReason);
    },
  });

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models');
        const data = await response.json();
        if (data.models) {
          setModels(data.models);
          if (data.models.length > 0 && !data.models.find((m: OllamaModel) => m.name === selectedModel)) {
            setSelectedModel(data.models[0].name);
          }
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
    if (messages.length > 0 && confirm('チャット履歴をクリアしますか？')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl px-4 py-8 md:py-24 mx-auto stretch pb-24 md:pb-32">
      <div className="mb-6 p-3 md:p-4 bg-gray-100 rounded-lg border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-2">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Current Model:</span>
          </div>
          <div className="text-xs text-gray-500">
            Endpoint: localhost:11434
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {loadingModels ? (
            <div className="text-sm text-gray-500">Loading models...</div>
          ) : (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={status === 'streaming' || status === 'submitted'}
            >
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 text-center md:text-left">
              {models.length} models available
            </div>
            <button
              onClick={handleClearChat}
              disabled={messages.length === 0 || status === 'streaming' || status === 'submitted'}
              className="px-3 py-2 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              クリア
            </button>
          </div>
        </div>
      </div>
      {messages.map(m => (
        <div key={m.id} className={`mb-4 p-3 md:p-4 rounded-lg ${
          m.role === 'user' 
            ? 'bg-blue-50 border-l-4 border-blue-400' 
            : 'bg-green-50 border-l-4 border-green-400'
        }`}>
          <div className={`font-semibold mb-2 text-sm ${
            m.role === 'user' ? 'text-blue-700' : 'text-green-700'
          }`}>
            {m.role === 'user' ? 'User' : 'AI'}
          </div>
          <div className="prose prose-sm md:prose-base max-w-none text-sm md:text-base">
            {m.role === 'user' ? (
              <div className="whitespace-pre-wrap">{m.content}</div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {m.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      ))}

      {(status === 'submitted' || status === 'streaming') && (
        <div className="mt-4 text-gray-500 text-center">
          {status === 'submitted' && <div className="mb-4">Loading...</div>}
          <button
            type="button"
            className="px-4 py-2 text-blue-500 border border-blue-500 rounded-md hover:bg-blue-50 transition-colors"
            onClick={stop}
          >
            Stop
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 text-center">
          <div className="text-red-500 mb-4">An error occurred.</div>
          <button
            type="button"
            className="px-4 py-2 text-blue-500 border border-blue-500 rounded-md hover:bg-blue-50 transition-colors"
            onClick={() => reload()}
          >
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <input
            className="w-full p-3 md:p-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            value={input}
            placeholder="メッセージを入力してください..."
            onChange={handleInputChange}
            disabled={status !== 'ready'}
          />
        </div>
      </form>
    </div>
  );
}
