"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string) => void;
  isAiStreaming: boolean;
}

export function ChatInput({ onSend, isAiStreaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t p-3">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={isAiStreaming ? "Send to interrupt..." : "Type a message..."}
        className="flex-1"
        autoFocus
      />
      <Button type="submit" size="icon" disabled={!value.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
