import { sendMessage } from "../webrtc/wsClient";

interface Props {
  editMode: boolean;
  onToggleEdit: () => void;
  selectedKind: string;
  onSelectKind: (kind: string) => void;
}

// Preset room templates: list of { kind, x, y } offsets relative to room center
const TEMPLATES: Record<string, Array<{ kind: string; x: number; y: number }>> = {
  "🛋 リビング": [
    { kind: "rug",       x: 640, y: 360 },
    { kind: "sofa",      x: 640, y: 280 },
    { kind: "table",     x: 640, y: 390 },
    { kind: "tv",        x: 640, y: 170 },
    { kind: "plant",     x: 780, y: 200 },
    { kind: "plant",     x: 500, y: 200 },
    { kind: "lamp",      x: 780, y: 420 },
    { kind: "bookshelf", x: 820, y: 300 },
  ],
  "🌙 こたつ": [
    { kind: "rug",   x: 640, y: 360 },
    { kind: "table", x: 640, y: 360 },
    { kind: "lamp",  x: 750, y: 280 },
    { kind: "plant", x: 530, y: 280 },
  ],
  "🏔 屋上": [
    { kind: "sofa",  x: 500, y: 350 },
    { kind: "sofa",  x: 780, y: 350 },
    { kind: "table", x: 640, y: 420 },
    { kind: "lamp",  x: 400, y: 200 },
    { kind: "lamp",  x: 880, y: 200 },
    { kind: "plant", x: 400, y: 500 },
    { kind: "plant", x: 880, y: 500 },
  ],
};

export const FURNITURE_KINDS = [
  { kind: "sofa",       label: "🛋️ ソファ" },
  { kind: "table",      label: "🪵 テーブル" },
  { kind: "plant",      label: "🪴 観葉植物" },
  { kind: "tv",         label: "📺 テレビ" },
  { kind: "bookshelf",  label: "📚 本棚" },
  { kind: "lamp",       label: "💡 ランプ" },
  { kind: "rug",        label: "🟫 ラグ" },
];

export function LayoutPanel({ editMode, onToggleEdit, selectedKind, onSelectKind }: Props) {
  const applyTemplate = (items: Array<{ kind: string; x: number; y: number }>) => {
    for (const item of items) {
      sendMessage({ type: "place_object", kind: item.kind, x: item.x, y: item.y });
    }
  };

  return (
    <div style={styles.panel}>
      <button
        onClick={onToggleEdit}
        style={{ ...styles.toggleBtn, background: editMode ? "#7c3aed" : "#374151" }}
      >
        {editMode ? "✏️ 編集中 (クリックで配置/削除)" : "🏠 レイアウト編集"}
      </button>
      {editMode && (
        <>
          <div style={styles.sectionLabel}>テンプレート</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {Object.entries(TEMPLATES).map(([name, items]) => (
              <button
                key={name}
                onClick={() => applyTemplate(items)}
                style={styles.templateBtn}
              >
                {name}
              </button>
            ))}
          </div>
          <div style={styles.sectionLabel}>家具を選んでクリック配置</div>
          <div style={styles.kindGrid}>
            {FURNITURE_KINDS.map(({ kind, label }) => (
              <button
                key={kind}
                onClick={() => onSelectKind(kind)}
                style={{
                  ...styles.kindBtn,
                  background: selectedKind === kind ? "#1d4ed8" : "#1f2937",
                  border: selectedKind === kind ? "1px solid #60a5fa" : "1px solid #374151",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  panel: {
    padding: "8px",
    borderBottom: "1px solid #374151",
    flexShrink: 0,
  },
  toggleBtn: {
    width: "100%",
    padding: "6px 8px",
    border: "none",
    borderRadius: 4,
    color: "#f3f4f6",
    fontSize: 12,
    cursor: "pointer",
    textAlign: "left" as const,
  },
  sectionLabel: {
    fontSize: 10,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 6,
  },
  templateBtn: {
    padding: "5px 8px",
    border: "none",
    borderRadius: 4,
    background: "#1f2937",
    color: "#f3f4f6",
    fontSize: 11,
    cursor: "pointer",
    textAlign: "left" as const,
  },
  kindGrid: {
    display: "grid" as const,
    gridTemplateColumns: "1fr 1fr",
    gap: 4,
    marginTop: 4,
  },
  kindBtn: {
    padding: "4px 6px",
    borderRadius: 4,
    color: "#f3f4f6",
    fontSize: 11,
    cursor: "pointer",
    textAlign: "left" as const,
  },
} as const;
