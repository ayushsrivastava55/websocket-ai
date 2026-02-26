"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { nanoid } from "nanoid";
import { Message } from "@/types/message";
import { EVENTS } from "@/types/events";
import type {
  AiMessageStartPayload,
  AiTokenPayload,
  AiMessageEndPayload,
  AiMessageInterruptedPayload,
  ChatGreetingPayload,
  ChatIdlePromptPayload,
  ChatErrorPayload,
} from "@/types/events";

export function useChat(socket: Socket | null, chatId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  useEffect(() => {
    if (!socket) return;

    function forThisChat<T extends { chatId: string }>(handler: (data: T) => void) {
      return (data: T) => {
        if (data.chatId === chatIdRef.current) handler(data);
      };
    }

    const onGreeting = forThisChat<ChatGreetingPayload>((data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          chatId: data.chatId,
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
        },
      ]);
    });

    const onAiStart = forThisChat<AiMessageStartPayload>((data) => {
      setIsAiStreaming(true);
      setError(null);
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          chatId: data.chatId,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          isStreaming: true,
        },
      ]);
    });

    const onAiToken = forThisChat<AiTokenPayload>((data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, content: m.content + data.token } : m
        )
      );
    });

    const onAiEnd = forThisChat<AiMessageEndPayload>((data) => {
      setIsAiStreaming(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isStreaming: false } : m
        )
      );
    });

    const onAiInterrupted = forThisChat<AiMessageInterruptedPayload>((data) => {
      setIsAiStreaming(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? {
                ...m,
                content: data.partialText,
                isStreaming: false,
                interrupted: true,
                interruptionMeta: {
                  originalMessageId: data.messageId,
                  cutoffIndex: data.cutoffIndex,
                  partialText: data.partialText,
                },
              }
            : m
        )
      );
    });

    const onIdlePrompt = forThisChat<ChatIdlePromptPayload>((data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          chatId: data.chatId,
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
        },
      ]);
    });

    const onError = forThisChat<ChatErrorPayload>((data) => {
      setIsAiStreaming(false);
      setError(data.error);
    });

    socket.on(EVENTS.CHAT_GREETING, onGreeting);
    socket.on(EVENTS.CHAT_AI_MESSAGE_START, onAiStart);
    socket.on(EVENTS.CHAT_AI_TOKEN, onAiToken);
    socket.on(EVENTS.CHAT_AI_MESSAGE_END, onAiEnd);
    socket.on(EVENTS.CHAT_AI_MESSAGE_INTERRUPTED, onAiInterrupted);
    socket.on(EVENTS.CHAT_IDLE_PROMPT, onIdlePrompt);
    socket.on(EVENTS.CHAT_ERROR, onError);

    return () => {
      socket.off(EVENTS.CHAT_GREETING, onGreeting);
      socket.off(EVENTS.CHAT_AI_MESSAGE_START, onAiStart);
      socket.off(EVENTS.CHAT_AI_TOKEN, onAiToken);
      socket.off(EVENTS.CHAT_AI_MESSAGE_END, onAiEnd);
      socket.off(EVENTS.CHAT_AI_MESSAGE_INTERRUPTED, onAiInterrupted);
      socket.off(EVENTS.CHAT_IDLE_PROMPT, onIdlePrompt);
      socket.off(EVENTS.CHAT_ERROR, onError);
    };
  }, [socket]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socket || !content.trim()) return;

      const messageId = nanoid();
      const userMsg: Message = {
        id: messageId,
        chatId,
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      socket.emit(EVENTS.CHAT_SEND_MESSAGE, {
        chatId,
        messageId,
        content: content.trim(),
      });
    },
    [socket, chatId]
  );

  return { messages, isAiStreaming, error, sendMessage };
}
