import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { EVENTS } from "../src/types/events";
import {
  createChat,
  getChat,
  destroyChat,
  destroyAllChats,
  addMessage,
  abortCurrentStream,
  resetIdleTimer,
  clearIdleTimer,
} from "./chat-manager";
import { streamAiResponse, generateGreeting, generateIdlePrompt } from "./ai-stream";
import { Message } from "../src/types/message";

const IDLE_TIMEOUT_MS = parseInt(process.env.IDLE_TIMEOUT_MS || "30000", 10);

function getSessionId(socket: Socket): string {
  return (socket.handshake.auth as { sessionId?: string }).sessionId || socket.id;
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const sessionId = getSessionId(socket);
    console.log(`[socket] connected: ${socket.id} (session: ${sessionId})`);

    socket.on(EVENTS.CHAT_CREATE, async ({ chatId }: { chatId: string }) => {
      console.log(`[socket] chat:create ${chatId}`);
      createChat(sessionId, chatId);

      try {
        const greeting = await generateGreeting();
        const msgId = nanoid();

        const greetingMsg: Message = {
          id: msgId,
          chatId,
          role: "assistant",
          content: greeting,
          timestamp: Date.now(),
        };
        addMessage(sessionId, chatId, greetingMsg);

        socket.emit(EVENTS.CHAT_GREETING, {
          chatId,
          messageId: msgId,
          content: greeting,
        });

        resetIdleTimer(sessionId, chatId, IDLE_TIMEOUT_MS, () => {
          handleIdlePrompt(socket, sessionId, chatId);
        });
      } catch (err) {
        socket.emit(EVENTS.CHAT_ERROR, {
          chatId,
          error: "Failed to generate greeting",
        });
      }
    });

    socket.on(
      EVENTS.CHAT_SEND_MESSAGE,
      async ({ chatId, messageId, content }: { chatId: string; messageId: string; content: string }) => {
        const state = getChat(sessionId, chatId);
        if (!state) return;

        clearIdleTimer(sessionId, chatId);

        // Check if AI is currently streaming — interrupt it
        let interruptionMeta: { partialText: string; messageId: string | null } | null = null;
        if (state.currentStreamMessageId) {
          interruptionMeta = abortCurrentStream(sessionId, chatId);

          if (interruptionMeta.messageId && interruptionMeta.partialText) {
            const partialMsg: Message = {
              id: interruptionMeta.messageId,
              chatId,
              role: "assistant",
              content: interruptionMeta.partialText,
              timestamp: Date.now(),
              interrupted: true,
            };
            addMessage(sessionId, chatId, partialMsg);

            socket.emit(EVENTS.CHAT_AI_MESSAGE_INTERRUPTED, {
              chatId,
              messageId: interruptionMeta.messageId,
              partialText: interruptionMeta.partialText,
              cutoffIndex: interruptionMeta.partialText.length,
            });
          }
        }

        const userMsg: Message = {
          id: messageId,
          chatId,
          role: "user",
          content,
          timestamp: Date.now(),
        };
        addMessage(sessionId, chatId, userMsg);

        await startAiStream(socket, sessionId, chatId);
      }
    );

    socket.on(EVENTS.CHAT_DESTROY, ({ chatId }: { chatId: string }) => {
      console.log(`[socket] chat:destroy ${chatId}`);
      destroyChat(sessionId, chatId);
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id} (session: ${sessionId})`);
      destroyAllChats(sessionId);
    });
  });
}

async function startAiStream(socket: Socket, sessionId: string, chatId: string): Promise<void> {
  const state = getChat(sessionId, chatId);
  if (!state) return;

  const aiMessageId = nanoid();
  const abortController = new AbortController();

  state.abortController = abortController;
  state.currentStreamMessageId = aiMessageId;
  state.currentStreamText = "";

  socket.emit(EVENTS.CHAT_AI_MESSAGE_START, {
    chatId,
    messageId: aiMessageId,
  });

  await streamAiResponse(state.history, abortController.signal, {
    onToken: (token: string) => {
      const currentState = getChat(sessionId, chatId);
      if (!currentState || currentState.currentStreamMessageId !== aiMessageId) return;

      currentState.currentStreamText += token;
      socket.emit(EVENTS.CHAT_AI_TOKEN, {
        chatId,
        messageId: aiMessageId,
        token,
      });
    },
    onDone: (fullText: string) => {
      const currentState = getChat(sessionId, chatId);
      if (!currentState) return;

      const aiMsg: Message = {
        id: aiMessageId,
        chatId,
        role: "assistant",
        content: fullText,
        timestamp: Date.now(),
      };
      addMessage(sessionId, chatId, aiMsg);

      currentState.abortController = null;
      currentState.currentStreamMessageId = null;
      currentState.currentStreamText = "";

      socket.emit(EVENTS.CHAT_AI_MESSAGE_END, {
        chatId,
        messageId: aiMessageId,
      });

      resetIdleTimer(sessionId, chatId, IDLE_TIMEOUT_MS, () => {
        handleIdlePrompt(socket, sessionId, chatId);
      });
    },
    onError: (error: string) => {
      const currentState = getChat(sessionId, chatId);
      if (currentState) {
        currentState.abortController = null;
        currentState.currentStreamMessageId = null;
        currentState.currentStreamText = "";
      }

      socket.emit(EVENTS.CHAT_ERROR, { chatId, error });
    },
  });
}

async function handleIdlePrompt(socket: Socket, sessionId: string, chatId: string): Promise<void> {
  const state = getChat(sessionId, chatId);
  if (!state) return;

  try {
    const prompt = await generateIdlePrompt(state.history);
    const msgId = nanoid();

    const idleMsg: Message = {
      id: msgId,
      chatId,
      role: "assistant",
      content: prompt,
      timestamp: Date.now(),
    };
    addMessage(sessionId, chatId, idleMsg);

    socket.emit(EVENTS.CHAT_IDLE_PROMPT, {
      chatId,
      messageId: msgId,
      content: prompt,
    });
  } catch {
    // Silently fail idle prompts
  }
}
