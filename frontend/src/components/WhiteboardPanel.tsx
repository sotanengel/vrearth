import { useEffect, useRef, useState } from "react";
import { useWhiteboardStore } from "../stores/whiteboardStore";
import { sendMessage } from "../webrtc/wsClient";
import type { WhiteboardStroke } from "../types";

interface Props {
  isHost: boolean;
  visible: boolean;
}

const COLORS = ["#ffffff", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#000000"];
const SIZES = [2, 5, 10, 18];
const W = 640;
const H = 400;

function redraw(canvas: HTMLCanvasElement, strokes: WhiteboardStroke[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const first = stroke.points[0];
    if (!first) continue;
    ctx.moveTo(first[0], first[1]);
    for (let i = 1; i < stroke.points.length; i++) {
      const pt = stroke.points[i];
      if (!pt) continue;
      ctx.lineTo(pt[0], pt[1]);
    }
    ctx.stroke();
  }
}

export function WhiteboardPanel({ isHost, visible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useWhiteboardStore((s) => s.strokes);
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(5);
  const drawing = useRef(false);
  const currentPoints = useRef<[number, number][]>([]);

  // Redraw whenever strokes change
  useEffect(() => {
    if (!canvasRef.current) return;
    redraw(canvasRef.current, strokes);
  }, [strokes]);

  if (!visible) return null;

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const pt = getPos(e);
    currentPoints.current = [pt];
    // Draw starting dot immediately
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const pt = getPos(e);
    currentPoints.current.push(pt);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pts = currentPoints.current;
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const prev = pts[pts.length - 2];
    const curr = pts[pts.length - 1];
    if (!prev || !curr) return;
    ctx.beginPath();
    ctx.moveTo(prev[0], prev[1]);
    ctx.lineTo(curr[0], curr[1]);
    ctx.stroke();
  };

  const onMouseUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const points = currentPoints.current;
    currentPoints.current = [];
    if (points.length < 1) return;
    const stroke: WhiteboardStroke = { color, size, points };
    useWhiteboardStore.getState().addStroke(stroke);
    sendMessage({ type: "whiteboard_draw", color, size, points });
  };

  const handleClear = () => {
    sendMessage({ type: "whiteboard_clear" });
    useWhiteboardStore.getState().clear();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.toolbar}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>ホワイトボード</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: c,
                  border: c === color ? "2px solid #60a5fa" : "2px solid transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                style={{
                  width: s + 8,
                  height: s + 8,
                  borderRadius: "50%",
                  background: "#64748b",
                  border: s === size ? "2px solid #60a5fa" : "2px solid transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
          {isHost && (
            <button onClick={handleClear} style={styles.clearBtn}>
              クリア
            </button>
          )}
        </div>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={styles.canvas}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    background: "rgba(0,0,0,0.5)",
    pointerEvents: "auto" as const,
  },
  panel: {
    background: "#1e293b",
    borderRadius: 12,
    border: "1px solid #334155",
    padding: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  canvas: {
    background: "#0f172a",
    borderRadius: 8,
    cursor: "crosshair",
    display: "block",
  },
  clearBtn: {
    padding: "4px 10px",
    border: "none",
    borderRadius: 6,
    background: "#ef4444",
    color: "white",
    fontSize: 12,
    cursor: "pointer",
  },
} as const;
