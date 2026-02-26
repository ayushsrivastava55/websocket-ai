"use client";

import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { useChat } from "@/hooks/use-chat";
import { EVENTS } from "@/types/events";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

interface ChatPanelProps {
  socket: Socket | null;
  chatId: string;
  isActive: boolean;
}

export function ChatPanel({ socket, chatId, isActive }: ChatPanelProps) {
  const { messages, isAiStreaming, error, sendMessage } = useChat(socket, chatId);

  // Request greeting when chat is created
  useEffect(() => {
    if (socket?.connected) {
      socket.emit(EVENTS.CHAT_CREATE, { chatId });
    }

    return () => {
      if (socket?.connected) {
        socket.emit(EVENTS.CHAT_DESTROY, { chatId });
      }
    };
  }, [socket, chatId]);

  return (
    <div
      className={`flex flex-col h-full ${isActive ? "block" : "hidden"}`}
    >
      {error && (
        <div className="mx-4 mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <MessageList messages={messages} isAiStreaming={isAiStreaming} />
      <ChatInput onSend={sendMessage} isAiStreaming={isAiStreaming} />
    </div>
  );
}
