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

export interface RoomObject {
  id: string;
  room_id: string;
  kind: string;
  x: number;
  y: number;
  rotation: number;
  z_order: number;
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
  | { type: "emote"; emoji: string }
  | { type: "local_chat"; text: string }
  | { type: "place_object"; kind: string; x: number; y: number }
  | { type: "move_object"; object_id: string; x: number; y: number }
  | { type: "delete_object"; object_id: string }
  | { type: "youtube_load"; video_id: string }
  | { type: "youtube_play"; position_secs: number }
  | { type: "youtube_pause"; position_secs: number };

// ── Server → Client ──────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: "welcome"; your_id: PlayerId; players: Player[]; objects: RoomObject[]; youtube_video_id: string | null }
  | { type: "player_moved"; player_id: PlayerId; position: Position }
  | { type: "player_joined"; player: Player }
  | { type: "player_left"; player_id: PlayerId }
  | { type: "chat"; from_id: PlayerId; text: string }
  | { type: "kicked" }
  | { type: "error"; code: number; message: string }
  | { type: "rtc_offer"; from_id: PlayerId; sdp: string }
  | { type: "rtc_answer"; from_id: PlayerId; sdp: string }
  | { type: "rtc_ice"; from_id: PlayerId; candidate: string }
  | { type: "emote"; from_id: PlayerId; emoji: string }
  | { type: "local_chat"; from_id: PlayerId; text: string }
  | { type: "object_placed"; object: RoomObject }
  | { type: "object_moved"; object_id: string; x: number; y: number }
  | { type: "object_deleted"; object_id: string }
  | { type: "youtube_load"; video_id: string }
  | { type: "youtube_play"; position_secs: number }
  | { type: "youtube_pause"; position_secs: number };
