import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const openai = createOpenAI({
  baseURL: process.env.OLLAMA_URL ? `${process.env.OLLAMA_URL}/v1` : "http://localhost:11434/v1",
  apiKey: "ollama",
});

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { 
    messages, 
    id, 
    model = "gemma2",
    temperature = 0.7,
    maxTokens = 2000,
    contextWindowSize
  } = await req.json();

  console.log("chat id", id);
  console.log("using model", model);
  console.log("temperature", temperature);
  console.log("maxTokens", maxTokens);
  console.log("contextWindowSize", contextWindowSize);

  // Ollamaのパラメータ設定
  const streamOptions: any = {
    model: openai(model),
    messages,
    temperature: temperature,
    maxTokens: maxTokens,
    async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
      console.log('=== API onFinish ===');
      console.log('Text length:', text?.length);
      console.log('Usage data:', JSON.stringify(usage));
      console.log('Finish reason:', finishReason);
      console.log('Temperature used:', temperature);
      // implement your own logic here, e.g. for storing messages
      // or recording token usage
    },
  };

  // コンテキストウィンドウサイズが指定されている場合は追加
  if (contextWindowSize && contextWindowSize > 0) {
    // AI SDKではmaxTokensでコンテキスト制限を制御
    streamOptions.maxTokens = Math.min(contextWindowSize, maxTokens);
    console.log("Context window size applied:", contextWindowSize);
  }

  // Call the language model
  const result = streamText(streamOptions);

  // Respond with the stream
  return result.toDataStreamResponse();
}
