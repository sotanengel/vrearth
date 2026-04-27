interface Props {
  editMode: boolean;
  onToggleEdit: () => void;
  selectedKind: string;
  onSelectKind: (kind: string) => void;
}

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
  return (
    <div style={styles.panel}>
      <button
        onClick={onToggleEdit}
        style={{ ...styles.toggleBtn, background: editMode ? "#7c3aed" : "#374151" }}
      >
        {editMode ? "✏️ 編集中 (クリックで配置)" : "🏠 レイアウト編集"}
      </button>
      {editMode && (
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
  kindGrid: {
    display: "grid" as const,
    gridTemplateColumns: "1fr 1fr",
    gap: 4,
    marginTop: 6,
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
