import { useRef, useState } from "react";
import { useChatStore } from "../stores/chatStore";
import { useRoomStore } from "../stores/roomStore";
import { sendMessage } from "../webrtc/wsClient";

const MAX_TEXT_LEN = 200;

export function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const players = useRoomStore((s) => s.players);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      sendMessage({ type: "chat", text: trimmed });
      setText("");
    }
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
            <b style={{ color: "#60a5fa" }}>
              {players.get(m.fromId)?.name ?? m.fromId.slice(0, 8)}:
            </b>{" "}
            {m.text}
          </li>
        ))}
        <div ref={bottomRef} />
      </ul>
      <div style={{ padding: "8px", borderTop: "1px solid #374151" }}>
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
