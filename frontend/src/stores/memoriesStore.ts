import { create } from "zustand";

export interface Screenshot {
  id: string;
  timestamp: number;
  dataUrl: string;
  playerNames: string[];
}

export interface SessionEntry {
  playerId: string;
  playerName: string;
  joinedAt: number;
  leftAt?: number;
}

interface MemoriesState {
  screenshots: Screenshot[];
  sessions: SessionEntry[];
  addScreenshot: (dataUrl: string, playerNames: string[]) => void;
  removeScreenshot: (id: string) => void;
  recordJoin: (playerId: string, playerName: string) => void;
  recordLeave: (playerId: string) => void;
}

const MAX_SCREENSHOTS = 20;
const LS_KEY = "vrearth_memories";

function loadFromStorage(): Pick<MemoriesState, "screenshots" | "sessions"> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Pick<MemoriesState, "screenshots" | "sessions">;
  } catch {}
  return { screenshots: [], sessions: [] };
}

function saveToStorage(screenshots: Screenshot[], sessions: SessionEntry[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ screenshots, sessions }));
  } catch {}
}

const initial = loadFromStorage();

export const useMemoriesStore = create<MemoriesState>((set, get) => ({
  screenshots: initial.screenshots,
  sessions: initial.sessions,

  addScreenshot: (dataUrl, playerNames) =>
    set((s) => {
      const next: Screenshot = {
        id: `${Date.now()}`,
        timestamp: Date.now(),
        dataUrl,
        playerNames,
      };
      const screenshots = [...s.screenshots, next].slice(-MAX_SCREENSHOTS);
      saveToStorage(screenshots, s.sessions);
      return { screenshots };
    }),

  removeScreenshot: (id) =>
    set((s) => {
      const screenshots = s.screenshots.filter((sc) => sc.id !== id);
      saveToStorage(screenshots, s.sessions);
      return { screenshots };
    }),

  recordJoin: (playerId, playerName) =>
    set((s) => {
      const sessions = [
        ...s.sessions,
        { playerId, playerName, joinedAt: Date.now() },
      ].slice(-500);
      saveToStorage(s.screenshots, sessions);
      return { sessions };
    }),

  recordLeave: (playerId) =>
    set((s) => {
      const sessions = s.sessions.map((e) =>
        e.playerId === playerId && !e.leftAt ? { ...e, leftAt: Date.now() } : e,
      );
      saveToStorage(s.screenshots, sessions);
      return { sessions };
    }),
}));
