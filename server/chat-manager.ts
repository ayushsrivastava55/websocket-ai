import { Message } from "../src/types/message";

export interface ChatState {
  chatId: string;
  socketId: string;
  history: Message[];
  abortController: AbortController | null;
  currentStreamMessageId: string | null;
  currentStreamText: string;
  idleTimer: ReturnType<typeof setTimeout> | null;
  idlePromptSent: boolean;
}

const store = new Map<string, ChatState>();

function key(socketId: string, chatId: string): string {
  return `${socketId}:${chatId}`;
}

export function createChat(socketId: string, chatId: string): ChatState {
  const state: ChatState = {
    chatId,
    socketId,
    history: [],
    abortController: null,
    currentStreamMessageId: null,
    currentStreamText: "",
    idleTimer: null,
    idlePromptSent: false,
  };
  store.set(key(socketId, chatId), state);
  return state;
}

export function getChat(socketId: string, chatId: string): ChatState | undefined {
  return store.get(key(socketId, chatId));
}

export function destroyChat(socketId: string, chatId: string): void {
  const state = store.get(key(socketId, chatId));
  if (state) {
    if (state.abortController) state.abortController.abort();
    if (state.idleTimer) clearTimeout(state.idleTimer);
    store.delete(key(socketId, chatId));
  }
}

export function destroyAllChats(socketId: string): void {
  for (const [k, state] of store.entries()) {
    if (k.startsWith(`${socketId}:`)) {
      if (state.abortController) state.abortController.abort();
      if (state.idleTimer) clearTimeout(state.idleTimer);
      store.delete(k);
    }
  }
}

export function addMessage(socketId: string, chatId: string, message: Message): void {
  const state = store.get(key(socketId, chatId));
  if (state) {
    state.history.push(message);
  }
}

export function abortCurrentStream(socketId: string, chatId: string): { partialText: string; messageId: string | null } {
  const state = store.get(key(socketId, chatId));
  if (!state) return { partialText: "", messageId: null };

  const partialText = state.currentStreamText;
  const messageId = state.currentStreamMessageId;

  if (state.abortController) {
    state.abortController.abort();
    state.abortController = null;
  }

  state.currentStreamMessageId = null;
  state.currentStreamText = "";

  return { partialText, messageId };
}

export function resetIdleTimer(
  socketId: string,
  chatId: string,
  timeoutMs: number,
  onIdle: () => void
): void {
  const state = store.get(key(socketId, chatId));
  if (!state) return;

  if (state.idleTimer) clearTimeout(state.idleTimer);
  state.idlePromptSent = false;

  state.idleTimer = setTimeout(() => {
    if (!state.idlePromptSent) {
      state.idlePromptSent = true;
      onIdle();
    }
  }, timeoutMs);
}

export function clearIdleTimer(socketId: string, chatId: string): void {
  const state = store.get(key(socketId, chatId));
  if (state?.idleTimer) {
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
  }
}
