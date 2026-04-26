import { useEffect, useRef } from "react";
import { Application, Graphics, Text } from "pixi.js";
import { useRoomStore } from "../stores/roomStore";
import { sendMessage } from "../webrtc/wsClient";

const AVATAR_RADIUS = 20;
const SIDEBAR_WIDTH = 260;
const MOVE_THROTTLE_MS = 50; // ~20 moves/s max
// Room world size (must match server RoomBounds)
const ROOM_WIDTH = 1280;
const ROOM_HEIGHT = 720;

const heldKeys = new Set<string>();

export function RoomScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const lastMoveRef = useRef<number>(0);

  useEffect(() => {
    const app = new Application();
    let initialized = false;
    let aborted = false;

    const init = async () => {
      const canvasWidth = window.innerWidth - SIDEBAR_WIDTH;
      const canvasHeight = window.innerHeight;
      await app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0x1a1a2e,
        antialias: true,
      });

      // Cleanup may have run before init() completed (React StrictMode)
      if (aborted) {
        app.destroy(true);
        return;
      }

      if (!containerRef.current) return;
      containerRef.current.appendChild(app.canvas);
      appRef.current = app;
      initialized = true;

      // Move avatar to room center on join
      sendMessage({ type: "move", dx: ROOM_WIDTH / 2, dy: ROOM_HEIGHT / 2 });

      const avatarGraphics = new Map<
        string,
        { circle: Graphics; ring: Graphics; label: Text }
      >();

      // ── Drag-to-move ──────────────────────────────────────────────────────
      let dragging = false;
      let lastDragX = 0;
      let lastDragY = 0;

      const onMouseDown = (e: MouseEvent) => {
        dragging = true;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        (e.currentTarget as HTMLElement).style.cursor = "grabbing";
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        if (dx !== 0 || dy !== 0) {
          const now = Date.now();
          if (now - lastMoveRef.current >= MOVE_THROTTLE_MS) {
            lastMoveRef.current = now;
            sendMessage({ type: "move", dx, dy });
          }
        }
      };
      const onMouseUp = () => {
        dragging = false;
        app.canvas.style.cursor = "grab";
      };

      app.canvas.style.cursor = "grab";
      app.canvas.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);

      // ── Render ticker ─────────────────────────────────────────────────────
      app.ticker.add(() => {
        const { players, myId } = useRoomStore.getState();

        // Add/update avatar graphics
        players.forEach((player, id) => {
          if (!avatarGraphics.has(id)) {
            const isMe = id === myId;
            // White ring for own avatar
            const ring = new Graphics()
              .circle(0, 0, AVATAR_RADIUS + 5)
              .stroke({ color: 0xffffff, width: 2 });
            ring.visible = isMe;
            const circle = new Graphics()
              .circle(0, 0, AVATAR_RADIUS)
              .fill(isMe ? 0x4fc3f7 : 0xef9a9a);
            const label = new Text({
              text: isMe ? `${player.name}\n▼ You` : player.name,
              style: {
                fontSize: 12,
                fill: 0xffffff,
                align: "center" as const,
              },
            });
            label.anchor.set(0.5, 1.6);
            app.stage.addChild(ring);
            app.stage.addChild(circle);
            app.stage.addChild(label);
            avatarGraphics.set(id, { circle, ring, label });
          }
          const { circle, ring, label } = avatarGraphics.get(id)!;
          circle.x = player.position.x;
          circle.y = player.position.y;
          ring.x = player.position.x;
          ring.y = player.position.y;
          label.x = player.position.x;
          label.y = player.position.y;
        });

        // Remove stale avatars
        avatarGraphics.forEach(({ circle, ring, label }, id) => {
          if (!players.has(id)) {
            app.stage.removeChild(ring);
            app.stage.removeChild(circle);
            app.stage.removeChild(label);
            ring.destroy();
            circle.destroy();
            label.destroy();
            avatarGraphics.delete(id);
          }
        });
      });

      return () => {
        app.canvas.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
    };

    let cleanup: (() => void) | undefined;
    init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      aborted = true;
      cleanup?.();
      if (initialized) {
        app.destroy(true);
      }
      appRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="room-canvas"
      style={{ display: "block" }}
    />
  );
}
