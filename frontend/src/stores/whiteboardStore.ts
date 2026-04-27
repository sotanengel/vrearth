import { create } from "zustand";
import type { WhiteboardStroke } from "../types";

interface WhiteboardState {
  strokes: WhiteboardStroke[];
  addStroke: (stroke: WhiteboardStroke) => void;
  setStrokes: (strokes: WhiteboardStroke[]) => void;
  clear: () => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set) => ({
  strokes: [],
  addStroke: (stroke) => set((s) => ({ strokes: [...s.strokes, stroke] })),
  setStrokes: (strokes) => set({ strokes }),
  clear: () => set({ strokes: [] }),
}));
