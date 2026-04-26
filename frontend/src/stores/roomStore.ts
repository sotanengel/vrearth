import { create } from "zustand";
import type { Player, PlayerId, Position } from "../types";

interface RoomState {
  myId: PlayerId | null;
  roomId: string | null;
  players: Map<PlayerId, Player>;
  setWelcome: (myId: PlayerId, players: Player[]) => void;
  upsertPlayer: (player: Player) => void;
  movePlayer: (id: PlayerId, pos: Position) => void;
  removePlayer: (id: PlayerId) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  myId: null,
  roomId: null,
  players: new Map(),

  setWelcome: (myId, players) =>
    set({
      myId,
      roomId: players.find((p) => p.id === myId)?.room_id ?? null,
      players: new Map(players.map((p) => [p.id, p])),
    }),

  upsertPlayer: (player) =>
    set((s) => ({
      players: new Map(s.players).set(player.id, player),
    })),

  movePlayer: (id, pos) =>
    set((s) => {
      const existing = s.players.get(id);
      if (!existing) return s;
      return {
        players: new Map(s.players).set(id, { ...existing, position: pos }),
      };
    }),

  removePlayer: (id) =>
    set((s) => {
      const next = new Map(s.players);
      next.delete(id);
      return { players: next };
    }),

  reset: () => set({ myId: null, roomId: null, players: new Map() }),
}));
