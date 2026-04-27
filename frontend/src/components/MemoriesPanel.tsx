import { useMemoriesStore } from "../stores/memoriesStore";

interface Props {
  visible: boolean;
  onClose: () => void;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startMs: number, endMs?: number): string {
  const ms = (endMs ?? Date.now()) - startMs;
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "< 1分";
  if (mins < 60) return `${mins}分`;
  return `${Math.floor(mins / 60)}時間${mins % 60}分`;
}

export function MemoriesPanel({ visible, onClose }: Props) {
  const { screenshots, sessions, removeScreenshot } = useMemoriesStore();

  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>📷 思い出</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Screenshots section */}
          <section>
            <h3 style={styles.sectionTitle}>スクリーンショット ({screenshots.length})</h3>
            {screenshots.length === 0 ? (
              <p style={styles.empty}>スクリーンショットはまだありません。<br />「📷 スクショ」ボタンで撮影できます。</p>
            ) : (
              <div style={styles.grid}>
                {[...screenshots].reverse().map((sc) => (
                  <div key={sc.id} style={styles.card}>
                    <img src={sc.dataUrl} alt="screenshot" style={styles.thumb} />
                    <div style={styles.cardInfo}>
                      <span style={styles.cardTime}>{formatTime(sc.timestamp)}</span>
                      <span style={styles.cardPlayers}>{sc.playerNames.join(", ")}</span>
                    </div>
                    <button
                      onClick={() => removeScreenshot(sc.id)}
                      style={styles.deleteBtn}
                      title="削除"
                    >
                      🗑️
                    </button>
                    <a
                      href={sc.dataUrl}
                      download={`vrearth-${sc.id}.jpg`}
                      style={styles.downloadBtn}
                      title="ダウンロード"
                    >
                      ⬇️
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Session log section */}
          <section style={{ marginTop: 20 }}>
            <h3 style={styles.sectionTitle}>参加者ログ ({sessions.length})</h3>
            {sessions.length === 0 ? (
              <p style={styles.empty}>参加者ログはまだありません。</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>名前</th>
                    <th style={styles.th}>入室</th>
                    <th style={styles.th}>滞在</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sessions].reverse().map((s, i) => (
                    <tr key={`${s.playerId}-${s.joinedAt}-${i}`} style={i % 2 === 0 ? styles.trEven : undefined}>
                      <td style={styles.td}>{s.playerName}</td>
                      <td style={styles.td}>{formatTime(s.joinedAt)}</td>
                      <td style={styles.td}>{formatDuration(s.joinedAt, s.leftAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  panel: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 12,
    width: "min(700px, 95vw)",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #334155",
    flexShrink: 0,
  },
  title: { color: "#f1f5f9", fontSize: 16, fontWeight: "bold" as const },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: 18,
    cursor: "pointer",
    padding: 4,
  },
  body: {
    overflowY: "auto" as const,
    padding: 16,
    flex: 1,
  },
  sectionTitle: { color: "#94a3b8", fontSize: 13, marginBottom: 10, fontWeight: "normal" as const },
  empty: { color: "#475569", fontSize: 13 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 10,
  },
  card: {
    background: "#0f172a",
    borderRadius: 8,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  thumb: { width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" as const },
  cardInfo: {
    padding: "4px 6px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  cardTime: { color: "#94a3b8", fontSize: 11 },
  cardPlayers: { color: "#64748b", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  deleteBtn: {
    position: "absolute" as const,
    top: 4,
    right: 4,
    background: "rgba(0,0,0,0.6)",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    padding: "2px 4px",
  },
  downloadBtn: {
    position: "absolute" as const,
    top: 4,
    right: 32,
    background: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    fontSize: 14,
    padding: "2px 4px",
    textDecoration: "none",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13,
    color: "#cbd5e1",
  },
  th: {
    textAlign: "left" as const,
    padding: "6px 8px",
    borderBottom: "1px solid #334155",
    color: "#64748b",
    fontWeight: "normal" as const,
  },
  td: { padding: "5px 8px" },
  trEven: { background: "rgba(255,255,255,0.03)" },
} as const;
