export const EVENTS = {
  // Client → Server
  CHAT_CREATE: "chat:create",
  CHAT_SEND_MESSAGE: "chat:send_message",
  CHAT_DESTROY: "chat:destroy",

  // Server → Client
  CHAT_AI_MESSAGE_START: "chat:ai_message_start",
  CHAT_AI_TOKEN: "chat:ai_token",
  CHAT_AI_MESSAGE_END: "chat:ai_message_end",
  CHAT_AI_MESSAGE_INTERRUPTED: "chat:ai_message_interrupted",
  CHAT_GREETING: "chat:greeting",
  CHAT_IDLE_PROMPT: "chat:idle_prompt",
  CHAT_ERROR: "chat:error",
} as const;

export interface ChatCreatePayload {
  chatId: string;
}

export interface ChatSendMessagePayload {
  chatId: string;
  messageId: string;
  content: string;
}

export interface ChatDestroyPayload {
  chatId: string;
}

export interface AiMessageStartPayload {
  chatId: string;
  messageId: string;
}

export interface AiTokenPayload {
  chatId: string;
  messageId: string;
  token: string;
}

export interface AiMessageEndPayload {
  chatId: string;
  messageId: string;
}

export interface AiMessageInterruptedPayload {
  chatId: string;
  messageId: string;
  partialText: string;
  cutoffIndex: number;
}

export interface ChatGreetingPayload {
  chatId: string;
  messageId: string;
  content: string;
}

export interface ChatIdlePromptPayload {
  chatId: string;
  messageId: string;
  content: string;
}

export interface ChatErrorPayload {
  chatId: string;
  error: string;
}
