import { useRef, useState } from "react";
import { useChatStore } from "../stores/chatStore";
import { useRoomStore } from "../stores/roomStore";
import { sendMessage } from "../webrtc/wsClient";

const MAX_TEXT_LEN = 200;
const QUICK_EMOTES = ["👋", "😂", "👍", "❤️", "😮", "🎉"];

export function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const players = useRoomStore((s) => s.players);
  const [text, setText] = useState("");
  const [localMode, setLocalMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      sendMessage(localMode ? { type: "local_chat", text: trimmed } : { type: "chat", text: trimmed });
      setText("");
    }
  };

  const sendEmote = (emoji: string) => {
    sendMessage({ type: "emote", emoji });
  };

  return (
    <aside
      data-testid="chat-panel"
      style={{
        width: 280,
        display: "flex",
        flexDirection: "column",
        background: "#111827",
        color: "#f3f4f6",
        fontFamily: "monospace",
        fontSize: 13,
      }}
    >
      <ul
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
          margin: 0,
          listStyle: "none",
          maxHeight: 660,
        }}
      >
        {messages.map((m, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {m.isLocal && (
              <span style={{ fontSize: 10, color: "#fbbf24", marginRight: 4 }}>[近]</span>
            )}
            <b style={{ color: m.isLocal ? "#fbbf24" : "#60a5fa" }}>
              {players.get(m.fromId)?.name ?? m.fromId.slice(0, 8)}:
            </b>{" "}
            {m.text}
          </li>
        ))}
        <div ref={bottomRef} />
      </ul>
      <div style={{ padding: "8px", borderTop: "1px solid #374151" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
          <button
            onClick={() => setLocalMode(false)}
            style={{
              padding: "2px 8px", border: "none", borderRadius: 3, cursor: "pointer",
              fontSize: 10, background: !localMode ? "#1d4ed8" : "#374151", color: "#f3f4f6",
            }}
            title="全体チャット"
          >
            全体
          </button>
          <button
            onClick={() => setLocalMode(true)}
            style={{
              padding: "2px 8px", border: "none", borderRadius: 3, cursor: "pointer",
              fontSize: 10, background: localMode ? "#92400e" : "#374151", color: "#f3f4f6",
            }}
            title="近くの人にだけ届くチャット"
          >
            近距離
          </button>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
          {QUICK_EMOTES.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendEmote(emoji)}
              style={{
                background: "none",
                border: "1px solid #374151",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 16,
                padding: "2px 4px",
                lineHeight: 1,
              }}
              title={`${emoji} を送る`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <input
          data-testid="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={MAX_TEXT_LEN}
          placeholder="Say something…"
          style={{
            width: "100%",
            background: "#1f2937",
            color: "#f3f4f6",
            border: "1px solid #4b5563",
            borderRadius: 4,
            padding: "4px 8px",
            boxSizing: "border-box",
          }}
        />
      </div>
    </aside>
  );
}
