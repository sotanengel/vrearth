import { useChatStore } from "../stores/chatStore";
import { useEmoteStore } from "../stores/emoteStore";
import { useRoomStore } from "../stores/roomStore";
import type { ClientMessage, ServerMessage } from "../types";
import {
  connectPeer,
  disconnectPeer,
  handleAnswer,
  handleIce,
  handleOffer,
  setMyId,
  updateGain,
} from "./rtcManager";

let socket: WebSocket | null = null;

export function connect(token: string, name = "Anonymous"): void {
  const wsUrl = `ws://${window.location.host}/ws?token=${encodeURIComponent(token)}&name=${encodeURIComponent(name)}`;
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

export function handleServerMessage(msg: ServerMessage): void {
  const room = useRoomStore.getState();
  const chat = useChatStore.getState();
  const emote = useEmoteStore.getState();

  switch (msg.type) {
    case "welcome":
      room.setWelcome(msg.your_id, msg.players);
      setMyId(msg.your_id);
      break;

    case "player_joined":
      room.upsertPlayer(msg.player);
      // Initiate WebRTC voice connection with the new peer
      void connectPeer(msg.player.id);
      break;

    case "player_moved": {
      room.movePlayer(msg.player_id, msg.position);
      // Adjust audio volume based on distance to the moved player
      const myPos = room.players.get(room.myId ?? "")?.position;
      const theirPos = msg.position;
      if (myPos && room.myId && msg.player_id !== room.myId) {
        updateGain(msg.player_id, myPos.x, myPos.y, theirPos.x, theirPos.y);
      }
      break;
    }

    case "player_left":
      room.removePlayer(msg.player_id);
      disconnectPeer(msg.player_id);
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

    // ── WebRTC signaling ──────────────────────────────────────────────────
    case "rtc_offer":
      void handleOffer(msg.from_id, msg.sdp);
      break;

    case "rtc_answer":
      void handleAnswer(msg.from_id, msg.sdp);
      break;

    case "rtc_ice":
      void handleIce(msg.from_id, msg.candidate);
      break;

    case "emote":
      emote.showEmote(msg.from_id, msg.emoji);
      break;

    case "local_chat":
      chat.addMessage({ fromId: msg.from_id, text: msg.text, isLocal: true });
      break;
  }
}
