import { useChatStore } from "../stores/chatStore";
import { useRoomStore } from "../stores/roomStore";
import type { ClientMessage, ServerMessage } from "../types";

let socket: WebSocket | null = null;

export function connect(token: string): void {
  const wsUrl = `ws://${window.location.host}/ws?token=${encodeURIComponent(token)}`;
  socket = new WebSocket(wsUrl);

  socket.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data as string) as ServerMessage;
      handleServerMessage(msg);
    } catch (e) {
      console.error("Failed to parse server message", e);
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
  });

  socket.addEventListener("error", (e) => {
    console.error("WebSocket error", e);
  });
}

export function disconnect(): void {
  socket?.close();
  socket = null;
}

export function sendMessage(msg: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

function handleServerMessage(msg: ServerMessage): void {
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
      disconnect();
      break;
    case "error":
      console.error(`Server error ${msg.code}: ${msg.message}`);
      break;
  }
}
