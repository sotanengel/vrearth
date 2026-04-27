import { create } from "zustand";
import type { PlayerId } from "../types";

const EMOTE_TTL_MS = 2500;

export interface ActiveEmote {
  emoji: string;
  expiresAt: number;
}

interface EmoteState {
  emotes: Map<PlayerId, ActiveEmote>;
  showEmote: (playerId: PlayerId, emoji: string) => void;
  clearExpired: () => void;
}

export const useEmoteStore = create<EmoteState>((set) => ({
  emotes: new Map(),

  showEmote: (playerId, emoji) =>
    set((s) => ({
      emotes: new Map(s.emotes).set(playerId, {
        emoji,
        expiresAt: Date.now() + EMOTE_TTL_MS,
      }),
    })),

  clearExpired: () =>
    set((s) => {
      const now = Date.now();
      const next = new Map(
        [...s.emotes].filter(([, v]) => v.expiresAt > now),
      );
      return next.size !== s.emotes.size ? { emotes: next } : s;
    }),
}));
