import { useChatStore } from "../stores/chatStore";
import { useRoomStore } from "../stores/roomStore";
import type { ServerMessage } from "../types";

/** Exported for unit testing only — not part of the public API */
export function handleServerMessageForTest(msg: ServerMessage): void {
  const room = useRoomStore.getState();
  const chat = useChatStore.getState();

  switch (msg.type) {
    case "welcome":
      room.setWelcome(msg.your_id, msg.players);
      break;
    case "player_joined":
      room.upsertPlayer(msg.player);
      break;
    case "player_moved":
      room.movePlayer(msg.player_id, msg.position);
      break;
    case "player_left":
      room.removePlayer(msg.player_id);
      break;
    case "chat":
      chat.addMessage({ fromId: msg.from_id, text: msg.text });
      break;
    case "kicked":
      // no-op in tests
      break;
    case "error":
      console.error(`Server error ${msg.code}: ${msg.message}`);
      break;
  }
}
