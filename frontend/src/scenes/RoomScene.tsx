import { useEffect, useRef } from "react";
import { Application, Graphics, Text } from "pixi.js";
import { useEmoteStore } from "../stores/emoteStore";
import { useRoomStore } from "../stores/roomStore";
import { sendMessage } from "../webrtc/wsClient";
import { computeMoveDelta } from "./movement";
import { AUDIO_MAX_DIST } from "../webrtc/rtcManager";

const AVATAR_RADIUS = 20;
const SIDEBAR_WIDTH = 260;
const MOVE_THROTTLE_MS = 50; // ~20 moves/s max
const MOVE_SPEED = 4; // pixels per tick for keyboard movement
// Room world size (must match server RoomBounds)
const ROOM_WIDTH = 1280;
const ROOM_HEIGHT = 720;

const heldKeys = new Set<string>();

interface RoomSceneProps {
  showRange?: boolean;
}

export function RoomScene({ showRange = false }: RoomSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const lastMoveRef = useRef<number>(0);
  const showRangeRef = useRef(showRange);
  useEffect(() => { showRangeRef.current = showRange; }, [showRange]);

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
      const emoteLabels = new Map<string, Text>();

      // ── Hearing range indicator (semi-transparent circle around own avatar) ─
      const rangeCircle = new Graphics();
      app.stage.addChildAt(rangeCircle, 0); // render below avatars

      // ── Drag-to-move / click-to-move ──────────────────────────────────────
      let dragging = false;
      let dragMoved = false;
      let lastDragX = 0;
      let lastDragY = 0;

      const onMouseDown = (e: MouseEvent) => {
        dragging = true;
        dragMoved = false;
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
          dragMoved = true;
          const now = Date.now();
          if (now - lastMoveRef.current >= MOVE_THROTTLE_MS) {
            lastMoveRef.current = now;
            sendMessage({ type: "move", dx, dy });
          }
        }
      };
      const onMouseUp = (e: MouseEvent) => {
        if (dragging && !dragMoved) {
          // Pure click — teleport avatar to clicked position
          const rect = app.canvas.getBoundingClientRect();
          const targetX = e.clientX - rect.left;
          const targetY = e.clientY - rect.top;
          const { players, myId } = useRoomStore.getState();
          const myPos = myId ? players.get(myId)?.position : undefined;
          if (myPos) {
            sendMessage({ type: "move", dx: targetX - myPos.x, dy: targetY - myPos.y });
          }
        }
        dragging = false;
        app.canvas.style.cursor = "grab";
      };

      // ── Keyboard movement ─────────────────────────────────────────────────
      const MOVE_KEYS = new Set(["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (MOVE_KEYS.has(e.key)) {
          e.preventDefault();
          heldKeys.add(e.key);
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        heldKeys.delete(e.key);
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      app.canvas.style.cursor = "grab";
      app.canvas.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);

      // ── Render ticker ─────────────────────────────────────────────────────
      app.ticker.add(() => {
        const { dx, dy } = computeMoveDelta(heldKeys, MOVE_SPEED);
        if (dx !== 0 || dy !== 0) {
          const now = Date.now();
          if (now - lastMoveRef.current >= MOVE_THROTTLE_MS) {
            lastMoveRef.current = now;
            sendMessage({ type: "move", dx, dy });
          }
        }

        const { players, myId } = useRoomStore.getState();
        const { emotes, clearExpired } = useEmoteStore.getState();
        clearExpired();

        // Add/update/remove emote bubbles above avatars
        emotes.forEach((active, id) => {
          const player = players.get(id);
          if (!player) return;
          if (!emoteLabels.has(id)) {
            const t = new Text({
              text: active.emoji,
              style: { fontSize: 28 },
            });
            t.anchor.set(0.5, 1);
            app.stage.addChild(t);
            emoteLabels.set(id, t);
          }
          const t = emoteLabels.get(id)!;
          t.text = active.emoji;
          t.x = player.position.x;
          t.y = player.position.y - AVATAR_RADIUS - 10;
        });
        emoteLabels.forEach((t, id) => {
          if (!emotes.has(id)) {
            app.stage.removeChild(t);
            t.destroy();
            emoteLabels.delete(id);
          }
        });

        // Update hearing range circle
        const myPlayer = myId ? players.get(myId) : undefined;
        rangeCircle.clear();
        if (myPlayer && showRangeRef.current) {
          rangeCircle
            .circle(myPlayer.position.x, myPlayer.position.y, AUDIO_MAX_DIST)
            .fill({ color: 0x4fc3f7, alpha: 0.08 });
          rangeCircle
            .circle(myPlayer.position.x, myPlayer.position.y, AUDIO_MAX_DIST)
            .stroke({ color: 0x4fc3f7, width: 1, alpha: 0.35 });
        }

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
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        heldKeys.clear();
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
