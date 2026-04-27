import { create } from "zustand";
import type { RoomObject } from "../types";

interface ObjectState {
  objects: Map<string, RoomObject>;
  setObjects: (objects: RoomObject[]) => void;
  addObject: (obj: RoomObject) => void;
  moveObject: (id: string, x: number, y: number) => void;
  removeObject: (id: string) => void;
}

export const useObjectStore = create<ObjectState>((set) => ({
  objects: new Map(),

  setObjects: (objects) =>
    set({ objects: new Map(objects.map((o) => [o.id, o])) }),

  addObject: (obj) =>
    set((s) => ({ objects: new Map(s.objects).set(obj.id, obj) })),

  moveObject: (id, x, y) =>
    set((s) => {
      const existing = s.objects.get(id);
      if (!existing) return s;
      return { objects: new Map(s.objects).set(id, { ...existing, x, y }) };
    }),

  removeObject: (id) =>
    set((s) => {
      const next = new Map(s.objects);
      next.delete(id);
      return { objects: next };
    }),
}));
