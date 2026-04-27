import { create } from "zustand";

interface YoutubeState {
  videoId: string | null;
  playing: boolean;
  seekTo: number | null;
  setVideoId: (id: string | null) => void;
  setPlaying: (playing: boolean, seekTo?: number) => void;
  clearSeek: () => void;
}

export const useYoutubeStore = create<YoutubeState>((set) => ({
  videoId: null,
  playing: false,
  seekTo: null,

  setVideoId: (id) => set({ videoId: id, playing: false, seekTo: null }),

  setPlaying: (playing, seekTo) =>
    set({ playing, seekTo: seekTo ?? null }),

  clearSeek: () => set({ seekTo: null }),
}));
