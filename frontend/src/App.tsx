import { useEffect, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { RoomScene } from "./scenes/RoomScene";
import { useRoomStore } from "./stores/roomStore";
import { connect } from "./webrtc/wsClient";

export function App() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const myId = useRoomStore((s) => s.myId);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (token && joined) {
      connect(token);
    }
  }, [token, joined]);

  if (!token) {
    return (
      <div style={styles.center}>
        <h1 style={styles.title}>vrearth</h1>
        <p style={styles.subtitle}>
          招待リンクが必要です。ホストに招待リンクを発行してもらってください。
        </p>
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

  return (
    <div style={styles.room}>
      <RoomScene />
      <ChatPanel />
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
  room: { display: "flex" as const, background: "#0f172a" },
} as const;
