import { useState } from "react";
import { useRoomStore } from "../stores/roomStore";
import { sendMessage } from "../webrtc/wsClient";

interface Props {
  token: string;
}

export function PlayerPanel({ token }: Props) {
  const { players, myId, roomId } = useRoomStore();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const isHost = players.get(myId ?? "")?.is_host ?? false;

  const generateInvite = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/rooms/${roomId}/invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await resp.json()) as { token: string };
      const url = `${window.location.origin}/?token=${data.token}`;
      setInviteUrl(url);
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kick = (targetId: string) => {
    sendMessage({ type: "kick", player_id: targetId });
  };

  return (
    <div style={styles.panel}>
      <div style={styles.title}>参加者 ({players.size})</div>
      <ul style={styles.list}>
        {[...players.values()].map((player) => {
          const isMe = player.id === myId;
          return (
            <li key={player.id} style={styles.item}>
              <span style={styles.name}>
                {player.name}
                {player.is_host && (
                  <span style={styles.hostBadge}>HOST</span>
                )}
                {isMe && <span style={styles.youBadge}>You</span>}
              </span>
              {isHost && !isMe && !player.is_host && (
                <button
                  onClick={() => kick(player.id)}
                  style={styles.kickBtn}
                  title={`${player.name} をキック`}
                >
                  👢
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {isHost && (
        <div style={styles.inviteSection}>
          <button
            onClick={() => void generateInvite()}
            disabled={loading}
            style={styles.inviteBtn}
          >
            🔗 {loading ? "生成中…" : "招待リンクを発行"}
          </button>
          {inviteUrl && (
            <div style={styles.urlRow}>
              <input
                readOnly
                value={inviteUrl}
                style={styles.urlInput}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button onClick={() => void copyInvite()} style={styles.copyBtn}>
                {copied ? "✓" : "コピー"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  panel: {
    padding: "10px 8px 6px",
    borderBottom: "1px solid #374151",
    flexShrink: 0,
  },
  title: {
    fontSize: 11,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "3px 0",
    fontSize: 13,
    color: "#f3f4f6",
  },
  name: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 4,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  hostBadge: {
    fontSize: 9,
    background: "#f59e0b",
    color: "#000",
    borderRadius: 3,
    padding: "1px 4px",
    fontWeight: "bold" as const,
  },
  youBadge: {
    fontSize: 9,
    background: "#3b82f6",
    color: "#fff",
    borderRadius: 3,
    padding: "1px 4px",
  },
  kickBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: "0 2px",
    flexShrink: 0,
  },
  inviteSection: {
    marginTop: 8,
  },
  inviteBtn: {
    width: "100%",
    padding: "5px 8px",
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
  },
  urlRow: {
    display: "flex" as const,
    gap: 4,
    marginTop: 6,
  },
  urlInput: {
    flex: 1,
    minWidth: 0,
    background: "#1f2937",
    color: "#d1d5db",
    border: "1px solid #4b5563",
    borderRadius: 4,
    padding: "3px 6px",
    fontSize: 10,
  },
  copyBtn: {
    padding: "3px 8px",
    background: "#374151",
    color: "#f3f4f6",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 11,
    flexShrink: 0,
  },
} as const;
