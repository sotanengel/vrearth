export type PlayerId = string;
export type RoomId = string;

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: PlayerId;
  room_id: RoomId;
  name: string;
  position: Position;
  is_host: boolean;
}

// ── Client → Server ──────────────────────────────────────────────────────────

export type ClientMessage =
  | { type: "join"; token: string; name: string }
  | { type: "move"; dx: number; dy: number }
  | { type: "chat"; text: string }
  | { type: "kick"; player_id: PlayerId }
  | { type: "rtc_offer"; to_id: PlayerId; sdp: string }
  | { type: "rtc_answer"; to_id: PlayerId; sdp: string }
  | { type: "rtc_ice"; to_id: PlayerId; candidate: string }
  | { type: "emote"; emoji: string };

// ── Server → Client ──────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: "welcome"; your_id: PlayerId; players: Player[] }
  | { type: "player_moved"; player_id: PlayerId; position: Position }
  | { type: "player_joined"; player: Player }
  | { type: "player_left"; player_id: PlayerId }
  | { type: "chat"; from_id: PlayerId; text: string }
  | { type: "kicked" }
  | { type: "error"; code: number; message: string }
  | { type: "rtc_offer"; from_id: PlayerId; sdp: string }
  | { type: "rtc_answer"; from_id: PlayerId; sdp: string }
  | { type: "rtc_ice"; from_id: PlayerId; candidate: string }
  | { type: "emote"; from_id: PlayerId; emoji: string };
