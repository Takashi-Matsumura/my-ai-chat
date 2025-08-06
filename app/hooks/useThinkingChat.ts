'use client';

import React, { useState, useCallback, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
}

interface UseThinkingChatOptions {
  api: string;
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
}

export function useThinkingChat({ api, onFinish, onError }: UseThinkingChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'ready' | 'submitted' | 'streaming'>('ready');
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (
    e: React.FormEvent<HTMLFormElement>,
    options?: {
      body?: any;
    }
  ) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setStatus('submitted');

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      thinking: '',
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Create abort controller
      abortControllerRef.current = new AbortController();

      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          ...options?.body,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      setStatus('streaming');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data: ')) continue;
            if (line.includes('[DONE]')) break;

            try {
              const data = JSON.parse(line.replace('data: ', ''));
              
              if (data.type === 'thinking') {
                // Update thinking data (replace entirely, not append)
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, thinking: data.content }
                    : msg
                ));
              } else if (data.type === 'content') {
                // Update content data
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: (msg.content || '') + data.content }
                    : msg
                ));
              }
            } catch (e) {
              // JSON parsing failed, ignore
              continue;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      setStatus('ready');
      
      // Get final message
      setMessages(prev => {
        const finalMessages = [...prev];
        const finalAssistantMessage = finalMessages.find(msg => msg.id === assistantMessage.id);
        if (finalAssistantMessage && onFinish) {
          onFinish(finalAssistantMessage);
        }
        return finalMessages;
      });

    } catch (err) {
      const error = err as Error;
      setError(error);
      setStatus('ready');
      
      // Remove failed assistant message
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessage.id));
      
      if (onError) {
        onError(error);
      }
    }
  }, [input, status, messages, api, onFinish, onError]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('ready');
    }
  }, []);

  const reload = useCallback(() => {
    // Reload last message (simplified implementation)
    window.location.reload();
  }, []);

  return {
    messages,
    input,
    status,
    error,
    handleInputChange,
    handleSubmit,
    stop,
    reload,
    setMessages: setMessages as React.Dispatch<React.SetStateAction<Message[]>>,
  };
}