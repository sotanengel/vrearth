import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { LayoutPanel } from "./components/LayoutPanel";
import { PlayerPanel } from "./components/PlayerPanel";
import { YoutubePanel } from "./components/YoutubePanel";
import { RoomScene } from "./scenes/RoomScene";
import { useRoomStore } from "./stores/roomStore";
import { connect } from "./webrtc/wsClient";
import { initAudio, setMute, toggleMute } from "./webrtc/rtcManager";

export function App() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createError, setCreateError] = useState("");
  const [muted, setMuted] = useState(false);
  const [pttMode, setPttMode] = useState(false);
  const [showRange, setShowRange] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedKind, setSelectedKind] = useState<string>("sofa");
  const [showYoutube, setShowYoutube] = useState(false);
  const pttActiveRef = useRef(false);

  useEffect(() => {
    if (token && joined) {
      void initAudio();
      connect(token, name);
    }
  }, [token, joined]);

  // Push-to-talk: Space held = unmuted, released = muted
  useEffect(() => {
    if (!pttMode) return;
    // Enter PTT mode muted
    setMute(true);
    setMuted(true);
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code !== "Space" ||
        e.repeat ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;
      e.preventDefault();
      if (!pttActiveRef.current) {
        pttActiveRef.current = true;
        setMute(false);
        setMuted(false);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      pttActiveRef.current = false;
      setMute(true);
      setMuted(true);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      pttActiveRef.current = false;
    };
  }, [pttMode]);

  const handleMuteToggle = () => {
    if (pttMode) return; // PTT mode controls mute via Space key
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  };

  const handleCreateRoom = async () => {
    setCreatingRoom(true);
    setCreateError("");
    try {
      const resp = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Room" }),
      });
      if (!resp.ok) throw new Error(`${resp.status}`);
      const data = (await resp.json()) as { host_token: string };
      window.location.href = `/?token=${data.host_token}`;
    } catch (e) {
      setCreateError("部屋の作成に失敗しました。サーバーが起動しているか確認してください。");
    } finally {
      setCreatingRoom(false);
    }
  };

  if (!token) {
    return (
      <div style={styles.center}>
        <h1 style={styles.title}>vrearth</h1>
        <p style={styles.subtitle}>招待リンクで参加するか、部屋を新しく作ってください。</p>
        <button
          onClick={() => void handleCreateRoom()}
          disabled={creatingRoom}
          style={{ ...styles.button, marginTop: 16 }}
        >
          {creatingRoom ? "作成中…" : "🏠 部屋を作る"}
        </button>
        {createError && <p style={{ color: "#ef4444", marginTop: 8 }}>{createError}</p>}
      </div>
    );
  }

  if (!joined) {
    return (
      <div style={styles.center}>
        <h1 style={styles.title}>vrearth</h1>
        <div style={styles.joinForm}>
          <input
            data-testid="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && setJoined(true)}
            placeholder="表示名を入力..."
            maxLength={32}
            style={styles.input}
            autoFocus
          />
          <button
            onClick={() => name.trim() && setJoined(true)}
            style={styles.button}
          >
            入室
          </button>
        </div>
      </div>
    );
  }

  const { players, myId } = useRoomStore();
  const isHost = players.get(myId ?? "")?.is_host ?? false;

  return (
    <div style={styles.room}>
      <RoomScene showRange={showRange} editMode={editMode} selectedKind={selectedKind} />
      <YoutubePanel isHost={isHost} visible={showYoutube} />
      <div style={styles.sidebar}>
        <PlayerPanel token={token} />
        {isHost && (
          <LayoutPanel
            editMode={editMode}
            onToggleEdit={() => setEditMode((v) => !v)}
            selectedKind={selectedKind}
            onSelectKind={setSelectedKind}
          />
        )}
        <ChatPanel />
        <button
          onClick={handleMuteToggle}
          style={{ ...styles.muteButton, background: pttMode ? "#6b7280" : muted ? "#ef4444" : "#22c55e" }}
          title={pttMode ? "PTTモード中 (Spaceで発話)" : muted ? "マイクをオンにする" : "マイクをミュート"}
        >
          {pttMode
            ? `🎙️ PTT${muted ? "" : " (ON)"}`
            : muted ? "🔇 ミュート中" : "🎤 ミュート"}
        </button>
        <button
          onClick={() => setPttMode((v) => !v)}
          style={{ ...styles.muteButton, background: pttMode ? "#7c3aed" : "#374151" }}
          title={pttMode ? "PTTモードを無効化" : "PTTモードを有効化 (Spaceで発話)"}
        >
          {pttMode ? "🔵 PTT ON" : "⚪ PTT OFF"}
        </button>
        <button
          onClick={() => setShowRange((v) => !v)}
          style={{ ...styles.muteButton, background: showRange ? "#0e7490" : "#374151" }}
          title={showRange ? "聴こえる範囲を非表示" : "聴こえる範囲を表示"}
        >
          {showRange ? "🔵 範囲表示中" : "⚪ 範囲を表示"}
        </button>
        <button
          onClick={() => setShowYoutube((v) => !v)}
          style={{ ...styles.muteButton, background: showYoutube ? "#dc2626" : "#374151" }}
          title="YouTube同時視聴"
        >
          {showYoutube ? "📺 YouTube非表示" : "📺 YouTube"}
        </button>
      </div>
    </div>
  );

}

const styles = {
  center: {
    display: "flex" as const,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: "100vh",
    background: "#0f172a",
    color: "#f1f5f9",
    fontFamily: "system-ui, sans-serif",
  },
  title: { fontSize: 48, marginBottom: 8, color: "#60a5fa" },
  subtitle: { color: "#94a3b8", textAlign: "center" as const, maxWidth: 400 },
  joinForm: { display: "flex", gap: 8, marginTop: 24 },
  input: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #475569",
    background: "#1e293b",
    color: "#f1f5f9",
    fontSize: 16,
    outline: "none",
  },
  button: {
    padding: "8px 20px",
    borderRadius: 6,
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontSize: 16,
    cursor: "pointer",
  },
  room: {
    position: "relative" as const,
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    background: "#0f172a",
  },
  sidebar: {
    position: "fixed" as const,
    top: 0,
    right: 0,
    display: "flex" as const,
    flexDirection: "column" as const,
    width: 260,
    height: "100vh",
    background: "rgba(15, 23, 42, 0.85)",
    borderLeft: "1px solid #334155",
    zIndex: 10,
  },
  muteButton: {
    padding: "10px 16px",
    border: "none",
    color: "white",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
    flexShrink: 0,
  },
} as const;
