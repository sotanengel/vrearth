import { useEffect, useRef, useState } from "react";
import { useYoutubeStore } from "../stores/youtubeStore";
import { sendMessage } from "../webrtc/wsClient";

interface Props {
  isHost: boolean;
  visible: boolean;
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

function extractVideoId(input: string): string | null {
  // Accept full URL or bare video ID
  const urlMatch = input.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(input.trim())) return input.trim();
  return null;
}

export function YoutubePanel({ isHost, visible }: Props) {
  const { videoId, playing, seekTo, clearSeek } = useYoutubeStore();
  const [urlInput, setUrlInput] = useState("");
  const [apiReady, setApiReady] = useState(false);
  const playerRef = useRef<YT.Player | null>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (window.YT?.Player) {
      setApiReady(true);
      return;
    }
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
    if (!document.getElementById("yt-api-script")) {
      const script = document.createElement("script");
      script.id = "yt-api-script";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  }, []);

  // Create player when API is ready and videoId is known
  useEffect(() => {
    if (!apiReady || !videoId || !playerDivRef.current) return;

    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
      return;
    }

    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId,
      playerVars: { autoplay: 0, controls: isHost ? 1 : 0 },
      events: {
        onStateChange: (e) => {
          if (!isHost) return;
          const pos = playerRef.current?.getCurrentTime() ?? 0;
          if (e.data === window.YT.PlayerState.PLAYING) {
            sendMessage({ type: "youtube_play", position_secs: pos });
          } else if (e.data === window.YT.PlayerState.PAUSED) {
            sendMessage({ type: "youtube_pause", position_secs: pos });
          }
        },
      },
    });
  }, [apiReady, videoId, isHost]);

  // Sync play/pause/seek from store (non-host)
  useEffect(() => {
    if (!playerRef.current || isHost) return;
    if (seekTo !== null) {
      playerRef.current.seekTo(seekTo, true);
      clearSeek();
    }
    if (playing) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [playing, seekTo, isHost, clearSeek]);

  if (!visible) return null;

  const handleLoad = () => {
    const vid = extractVideoId(urlInput);
    if (!vid) return;
    sendMessage({ type: "youtube_load", video_id: vid });
    setUrlInput("");
  };

  return (
    <div style={styles.wrapper}>
      {isHost && (
        <div style={styles.controls}>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            placeholder="YouTube URL または動画ID"
            style={styles.input}
          />
          <button onClick={handleLoad} style={styles.loadBtn}>▶ 読み込み</button>
        </div>
      )}
      {videoId ? (
        <div ref={playerDivRef} style={styles.player} />
      ) : (
        <div style={styles.placeholder}>
          {isHost ? "YouTubeのURLを入力してください" : "ホストが動画を読み込む待機中…"}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: "fixed" as const,
    bottom: 16,
    left: 16,
    width: 480,
    background: "rgba(15,23,42,0.9)",
    border: "1px solid #334155",
    borderRadius: 8,
    overflow: "hidden" as const,
    zIndex: 20,
  },
  controls: {
    display: "flex",
    gap: 6,
    padding: "6px 8px",
    borderBottom: "1px solid #334155",
  },
  input: {
    flex: 1,
    background: "#1e293b",
    border: "1px solid #475569",
    borderRadius: 4,
    color: "#f1f5f9",
    padding: "4px 8px",
    fontSize: 12,
    outline: "none",
  },
  loadBtn: {
    padding: "4px 10px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    flexShrink: 0,
  },
  player: {
    width: "100%",
    aspectRatio: "16/9",
  },
  placeholder: {
    padding: 16,
    color: "#64748b",
    fontSize: 12,
    textAlign: "center" as const,
  },
} as const;
