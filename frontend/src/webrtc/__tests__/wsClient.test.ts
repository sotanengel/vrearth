import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "../../stores/chatStore";
import { useRoomStore } from "../../stores/roomStore";
import { handleServerMessageForTest } from "../wsClient.test-utils";

describe("wsClient message handling", () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
    useChatStore.getState().clear();
  });

  it("welcome sets myId and players", () => {
    handleServerMessageForTest({
      type: "welcome",
      your_id: "p1",
      players: [
        {
          id: "p1",
          room_id: "r1",
          name: "Alice",
          position: { x: 0, y: 0 },
          is_host: true,
        },
      ],
    });
    expect(useRoomStore.getState().myId).toBe("p1");
    expect(useRoomStore.getState().players.size).toBe(1);
  });

  it("player_joined adds player", () => {
    handleServerMessageForTest({
      type: "player_joined",
      player: {
        id: "p2",
        room_id: "r1",
        name: "Bob",
        position: { x: 0, y: 0 },
        is_host: false,
      },
    });
    expect(useRoomStore.getState().players.size).toBe(1);
  });

  it("player_moved updates position", () => {
    useRoomStore
      .getState()
      .upsertPlayer({
        id: "p1",
        room_id: "r1",
        name: "Alice",
        position: { x: 0, y: 0 },
        is_host: true,
      });
    handleServerMessageForTest({
      type: "player_moved",
      player_id: "p1",
      position: { x: 50, y: 100 },
    });
    const p = useRoomStore.getState().players.get("p1");
    expect(p?.position.x).toBe(50);
    expect(p?.position.y).toBe(100);
  });

  it("player_left removes player", () => {
    useRoomStore
      .getState()
      .upsertPlayer({
        id: "p1",
        room_id: "r1",
        name: "Alice",
        position: { x: 0, y: 0 },
        is_host: true,
      });
    handleServerMessageForTest({ type: "player_left", player_id: "p1" });
    expect(useRoomStore.getState().players.has("p1")).toBe(false);
  });

  it("chat adds message to chat store", () => {
    handleServerMessageForTest({ type: "chat", from_id: "p1", text: "hello" });
    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.text).toBe("hello");
  });

  it("error logs to console", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    handleServerMessageForTest({
      type: "error",
      code: 401,
      message: "unauthorized",
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
