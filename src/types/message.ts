export interface InterruptionMeta {
  originalMessageId: string;
  cutoffIndex: number;
  partialText: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  interrupted?: boolean;
  interruptionMeta?: InterruptionMeta;
}
