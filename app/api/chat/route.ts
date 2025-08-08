import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Helper function to process file attachments for Ollama
function processAttachmentsForOllama(attachments: any[]): string {
  if (!attachments || attachments.length === 0) return '';
  
  let attachmentText = '\n\n--- 添付ファイル ---\n';
  
  attachments.forEach((file, index) => {
    attachmentText += `\n${index + 1}. ファイル名: ${file.name}\n`;
    attachmentText += `   ファイルサイズ: ${(file.size / 1024).toFixed(1)} KB\n`;
    attachmentText += `   ファイル形式: ${file.type}\n`;
    
    if (file.type.startsWith('image/')) {
      // 画像ファイルの場合、Base64データを含める
      attachmentText += `   画像データ: ${file.data}\n`;
      attachmentText += `   ※この画像の内容を分析して回答に含めてください。\n`;
    } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
      // テキストファイルの場合、内容を抽出して含める
      try {
        const base64Content = file.data.split(',')[1];
        const textContent = Buffer.from(base64Content, 'base64').toString('utf-8');
        attachmentText += `   内容:\n${textContent}\n`;
      } catch (error) {
        attachmentText += `   ※テキスト内容の抽出に失敗しました\n`;
      }
    } else {
      attachmentText += `   ※このファイル形式は内容表示に対応していません\n`;
    }
    attachmentText += '\n';
  });
  
  return attachmentText;
}

// Custom streaming response with thinking support
async function streamOllamaWithThinking(options: any) {
  const { baseUrl, model, messages, temperature, maxTokens, attachments } = options;
  
  // 添付ファイルがある場合はメッセージに追加
  const processedMessages = [...messages];
  if (attachments && attachments.length > 0 && processedMessages.length > 0) {
    const lastMessage = processedMessages[processedMessages.length - 1];
    if (lastMessage.role === 'user') {
      lastMessage.content += processAttachmentsForOllama(attachments);
    }
  }
  
  // まずは非ストリーミングでthinkingデータを取得
  try {
    const nonStreamResponse = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: processedMessages,
        stream: false,
        options: {
          temperature: temperature,
          num_predict: maxTokens,
        }
      }),
    });
    
    const nonStreamData = await nonStreamResponse.json();
    const fullThinkingData = nonStreamData.message?.thinking || '';
    
    // 今度はストリーミングでcontentを取得
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // まずthinkingデータを送信
          if (fullThinkingData) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'thinking',
                content: fullThinkingData
              })}\n\n`)
            );
          }
          
          const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              messages: processedMessages,
              stream: true,
              options: {
                temperature: temperature,
                num_predict: maxTokens,
              }
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.trim() === '') continue;
                
                try {
                  const parsed = JSON.parse(line);
                  
                  if (parsed.message) {
                    // 通常のコンテンツのみをストリーミング（thinkingは既に送信済み）
                    if (parsed.message.content) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({
                          type: 'content',
                          content: parsed.message.content
                        })}\n\n`)
                      );
                    }
                  }
                  
                  if (parsed.done) {
                    break;
                  }
                } catch (e) {
                  // JSON parsing failed, ignore line
                  continue;
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in streamOllamaWithThinking:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { 
    messages, 
    id, 
    model = "gemma2",
    temperature = 0.7,
    maxTokens = 2000,
    contextWindowSize,
    ollamaUrl, // フロントエンドから送信されるOllama URL
    attachments // 添付ファイルデータ
  } = await req.json();

  // Ollama URLを決定（優先順位: リクエスト > 環境変数 > デフォルト）
  const baseUrl = ollamaUrl || process.env.OLLAMA_URL || "http://localhost:11434";
  
  // OpenAI clientを動的に作成
  const openai = createOpenAI({
    baseURL: `${baseUrl}/v1`,
    apiKey: "ollama",
  });


  // gpt-oss models でThinkingサポートが必要な場合はカスタムストリーミング
  if (model.includes('gpt-oss')) {
    return streamOllamaWithThinking({
      baseUrl,
      model,
      messages,
      temperature,
      maxTokens: contextWindowSize && contextWindowSize > 0 ? Math.min(contextWindowSize, maxTokens) : maxTokens,
      attachments,
    });
  }

  // 添付ファイルがある場合はメッセージに追加
  const processedMessages = [...messages];
  if (attachments && attachments.length > 0 && processedMessages.length > 0) {
    const lastMessage = processedMessages[processedMessages.length - 1];
    if (lastMessage.role === 'user') {
      lastMessage.content += processAttachmentsForOllama(attachments);
    }
  }

  // Ollamaのパラメータ設定
  const streamOptions: any = {
    model: openai(model),
    messages: processedMessages,
    temperature: temperature,
    maxTokens: maxTokens,
    async onFinish({ text, toolCalls, toolResults, usage, finishReason }: any) {
      // implement your own logic here, e.g. for storing messages
      // or recording token usage
    },
  };

  // コンテキストウィンドウサイズが指定されている場合は追加
  if (contextWindowSize && contextWindowSize > 0) {
    // AI SDKではmaxTokensでコンテキスト制限を制御
    streamOptions.maxTokens = Math.min(contextWindowSize, maxTokens);
  }

  // Call the language model
  const result = streamText(streamOptions);

  // Respond with the stream
  return result.toDataStreamResponse();
}
