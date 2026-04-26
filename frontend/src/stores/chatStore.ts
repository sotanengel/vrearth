import { create } from "zustand";
import type { PlayerId } from "../types";

export interface ChatMessage {
  fromId: PlayerId;
  text: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  addMessage: (msg: Omit<ChatMessage, "timestamp">) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { ...msg, timestamp: Date.now() }],
    })),

  clear: () => set({ messages: [] }),
}));
