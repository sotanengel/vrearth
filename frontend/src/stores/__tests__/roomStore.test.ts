import { beforeEach, describe, expect, it } from "vitest";
import { useRoomStore } from "../roomStore";
import type { Player } from "../../types";

function makePlayer(id: string, name: string, isHost = false): Player {
  return {
    id,
    room_id: "room-1",
    name,
    position: { x: 0, y: 0 },
    is_host: isHost,
  };
}

describe("roomStore", () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
  });

  it("starts with no players and no id", () => {
    const s = useRoomStore.getState();
    expect(s.myId).toBeNull();
    expect(s.players.size).toBe(0);
  });

  it("setWelcome populates players map and myId", () => {
    const players = [makePlayer("p1", "Alice", true), makePlayer("p2", "Bob")];
    useRoomStore.getState().setWelcome("p1", players);
    const s = useRoomStore.getState();
    expect(s.myId).toBe("p1");
    expect(s.players.size).toBe(2);
    expect(s.players.get("p1")?.name).toBe("Alice");
  });

  it("upsertPlayer adds a new player", () => {
    useRoomStore.getState().upsertPlayer(makePlayer("p1", "Alice"));
    expect(useRoomStore.getState().players.size).toBe(1);
  });

  it("upsertPlayer updates existing player", () => {
    const initial = makePlayer("p1", "Alice");
    useRoomStore.getState().upsertPlayer(initial);
    const updated = { ...initial, name: "Alice Updated" };
    useRoomStore.getState().upsertPlayer(updated);
    expect(useRoomStore.getState().players.get("p1")?.name).toBe(
      "Alice Updated",
    );
  });

  it("movePlayer updates position, keeps other fields", () => {
    useRoomStore.getState().upsertPlayer(makePlayer("p1", "Alice"));
    useRoomStore.getState().movePlayer("p1", { x: 100, y: 200 });
    const p = useRoomStore.getState().players.get("p1");
    expect(p?.position.x).toBe(100);
    expect(p?.position.y).toBe(200);
    expect(p?.name).toBe("Alice");
  });

  it("movePlayer is a no-op for unknown player", () => {
    useRoomStore.getState().movePlayer("unknown", { x: 100, y: 200 });
    expect(useRoomStore.getState().players.size).toBe(0);
  });

  it("removePlayer deletes from map", () => {
    useRoomStore.getState().upsertPlayer(makePlayer("p1", "Alice"));
    useRoomStore.getState().upsertPlayer(makePlayer("p2", "Bob"));
    useRoomStore.getState().removePlayer("p1");
    expect(useRoomStore.getState().players.size).toBe(1);
    expect(useRoomStore.getState().players.has("p1")).toBe(false);
    expect(useRoomStore.getState().players.has("p2")).toBe(true);
  });

  it("removePlayer is a no-op for unknown player", () => {
    useRoomStore.getState().upsertPlayer(makePlayer("p1", "Alice"));
    useRoomStore.getState().removePlayer("unknown");
    expect(useRoomStore.getState().players.size).toBe(1);
  });
});
