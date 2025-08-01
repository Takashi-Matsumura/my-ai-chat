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
  const { messages, id, model = "gemma2" } = await req.json();

  console.log("chat id", id); // can be used for persisting the chat
  console.log("using model", model);

  // Call the language model
  const result = streamText({
    model: openai(model),
    messages,
    async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
      console.log('=== API onFinish ===');
      console.log('Text length:', text?.length);
      console.log('Usage data:', JSON.stringify(usage));
      console.log('Finish reason:', finishReason);
      // implement your own logic here, e.g. for storing messages
      // or recording token usage
    },
  });

  // Respond with the stream
  return result.toDataStreamResponse();
}
