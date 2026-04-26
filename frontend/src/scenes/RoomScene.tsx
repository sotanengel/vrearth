import { useEffect, useRef } from "react";
import { Application, Graphics, Text } from "pixi.js";
import { useRoomStore } from "../stores/roomStore";
import { sendMessage } from "../webrtc/wsClient";
import { computeMoveDelta } from "./movement";

const SPEED = 4;
const AVATAR_RADIUS = 20;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const MOVE_THROTTLE_MS = 50; // ~20 moves/s max

const heldKeys = new Set<string>();

export function RoomScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const lastMoveRef = useRef<number>(0);

  useEffect(() => {
    const app = new Application();

    const init = async () => {
      await app.init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x1a1a2e,
        antialias: true,
      });

      if (!containerRef.current) return;
      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      const avatarGraphics = new Map<string, { circle: Graphics; label: Text }>();

      const onKeyDown = (e: KeyboardEvent) => heldKeys.add(e.key);
      const onKeyUp = (e: KeyboardEvent) => heldKeys.delete(e.key);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      app.ticker.add(() => {
        const { dx, dy } = computeMoveDelta(heldKeys, SPEED);
        if (dx !== 0 || dy !== 0) {
          const now = Date.now();
          if (now - lastMoveRef.current >= MOVE_THROTTLE_MS) {
            lastMoveRef.current = now;
            sendMessage({ type: "move", dx, dy });
          }
        }

        const { players, myId } = useRoomStore.getState();

        // Add/update avatar graphics
        players.forEach((player, id) => {
          if (!avatarGraphics.has(id)) {
            const circle = new Graphics()
              .circle(0, 0, AVATAR_RADIUS)
              .fill(id === myId ? 0x4fc3f7 : 0xef9a9a);
            const label = new Text({
              text: player.name,
              style: { fontSize: 12, fill: 0xffffff },
            });
            label.anchor.set(0.5, 1.8);
            const container = new Graphics();
            app.stage.addChild(circle);
            app.stage.addChild(label);
            avatarGraphics.set(id, { circle, label });
            // Keep container reference so TypeScript doesn't complain
            void container;
          }
          const { circle, label } = avatarGraphics.get(id)!;
          circle.x = player.position.x;
          circle.y = player.position.y;
          label.x = player.position.x;
          label.y = player.position.y;
        });

        // Remove stale avatars
        avatarGraphics.forEach(({ circle, label }, id) => {
          if (!players.has(id)) {
            app.stage.removeChild(circle);
            app.stage.removeChild(label);
            circle.destroy();
            label.destroy();
            avatarGraphics.delete(id);
          }
        });
      });

      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
    };

    let cleanup: (() => void) | undefined;
    init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cleanup?.();
      app.destroy(true);
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
