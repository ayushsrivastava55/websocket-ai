import OpenAI from "openai";
import { SYSTEM_PROMPT, GREETING_PROMPT, buildIdlePrompt } from "./prompts";
import { Message } from "../src/types/message";

const TOKEN_DELAY_MS = parseInt(process.env.TOKEN_DELAY_MS || "80", 10);

let openai: OpenAI;
function getClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

export async function streamAiResponse(
  history: Message[],
  abortSignal: AbortSignal,
  callbacks: StreamCallbacks
): Promise<void> {
  const client = getClient();

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "developer", content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  try {
    const stream = await client.chat.completions.create(
      {
        model: "gpt-5-nano",
        messages,
        stream: true,
      },
      { signal: abortSignal }
    );

    let fullText = "";

    for await (const chunk of stream) {
      if (abortSignal.aborted) return;

      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        fullText += token;
        callbacks.onToken(token);
        await delay(TOKEN_DELAY_MS);
      }
    }

    if (!abortSignal.aborted) {
      callbacks.onDone(fullText);
    }
  } catch (err: unknown) {
    if (abortSignal.aborted) return;
    const message = err instanceof Error ? err.message : "Unknown error";
    callbacks.onError(message);
  }
}

export async function generateGreeting(): Promise<string> {
  const client = getClient();

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "developer", content: SYSTEM_PROMPT },
        { role: "user", content: GREETING_PROMPT },
      ],
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content || "Hey there! How can I help you today?";
  } catch {
    return "Hey there! How can I help you today?";
  }
}

export async function generateIdlePrompt(history: Message[]): Promise<string> {
  const client = getClient();

  const context = history
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "developer", content: SYSTEM_PROMPT },
        { role: "user", content: buildIdlePrompt(context) },
      ],
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content || "Hey, you still there?";
  } catch {
    return "Hey, you still there?";
  }
}
