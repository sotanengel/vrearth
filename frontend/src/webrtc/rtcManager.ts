import type { PlayerId } from "../types";
import { sendMessage } from "./wsClient";

// STUN servers for ICE negotiation
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Distance thresholds for audio attenuation (in room units)
export const AUDIO_MIN_DIST = 50;
export const AUDIO_MAX_DIST = 400;

interface PeerEntry {
  pc: RTCPeerConnection;
  gainNode: GainNode;
  audioEl: HTMLAudioElement;
  makingOffer: boolean;
}

let localStream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let peers: Map<PlayerId, PeerEntry> = new Map();
let myId: PlayerId | null = null;
let muted = false;

export function getLocalStream(): MediaStream | null {
  return localStream;
}

export function isMuted(): boolean {
  return muted;
}

/** Request microphone access. Call once after the user clicks "Enter room". */
export async function initAudio(): Promise<void> {
  if (localStream) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    audioCtx = new AudioContext();
    applyMute();
  } catch (err) {
    // Mic denied — continue without voice
    console.warn("[rtcManager] mic access denied:", err);
  }
}

export function setMyId(id: PlayerId): void {
  myId = id;
}

/** Toggle local microphone mute. */
export function toggleMute(): boolean {
  muted = !muted;
  applyMute();
  return muted;
}

function applyMute(): void {
  if (!localStream) return;
  for (const track of localStream.getAudioTracks()) {
    track.enabled = !muted;
  }
}

/** Called when a new remote player joins — we initiate the offer if our ID sorts first. */
export async function connectPeer(remoteId: PlayerId): Promise<void> {
  if (!myId || !localStream || peers.has(remoteId)) return;
  const entry = createPeerEntry(remoteId);

  // Polite peer ordering: lower UUID starts the offer
  if (myId < remoteId) {
    try {
      entry.makingOffer = true;
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      sendMessage({
        type: "rtc_offer",
        to_id: remoteId,
        sdp: entry.pc.localDescription!.sdp,
      });
    } finally {
      entry.makingOffer = false;
    }
  }
}

/** Called when a remote player leaves. */
export function disconnectPeer(remoteId: PlayerId): void {
  const entry = peers.get(remoteId);
  if (!entry) return;
  entry.pc.close();
  entry.audioEl.srcObject = null;
  entry.audioEl.remove();
  peers.delete(remoteId);
}

/** Handle incoming SDP offer from signaling server. */
export async function handleOffer(fromId: PlayerId, sdp: string): Promise<void> {
  if (!myId || !localStream) return;
  let entry = peers.get(fromId);
  if (!entry) entry = createPeerEntry(fromId);

  const offerCollision =
    entry.makingOffer ||
    entry.pc.signalingState !== "stable";

  // Polite peer (higher UUID) ignores colliding offers
  const isPolite = myId > fromId;
  if (offerCollision && !isPolite) return;

  if (offerCollision) {
    await Promise.all([
      entry.pc.setLocalDescription({ type: "rollback" }),
      entry.pc.setRemoteDescription({ type: "offer", sdp }),
    ]);
  } else {
    await entry.pc.setRemoteDescription({ type: "offer", sdp });
  }

  const answer = await entry.pc.createAnswer();
  await entry.pc.setLocalDescription(answer);
  sendMessage({
    type: "rtc_answer",
    to_id: fromId,
    sdp: entry.pc.localDescription!.sdp,
  });
}

/** Handle incoming SDP answer from signaling server. */
export async function handleAnswer(fromId: PlayerId, sdp: string): Promise<void> {
  const entry = peers.get(fromId);
  if (!entry) return;
  if (entry.pc.signalingState === "have-local-offer") {
    await entry.pc.setRemoteDescription({ type: "answer", sdp });
  }
}

/** Handle incoming ICE candidate from signaling server. */
export async function handleIce(fromId: PlayerId, candidate: string): Promise<void> {
  const entry = peers.get(fromId);
  if (!entry) return;
  try {
    await entry.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
  } catch {
    // Ignore invalid ICE candidates (can happen during rollback)
  }
}

/**
 * Update audio gain for a remote peer based on Euclidean distance.
 * Call this on every PlayerMoved event.
 */
export function updateGain(
  remoteId: PlayerId,
  myX: number,
  myY: number,
  remoteX: number,
  remoteY: number,
): void {
  const entry = peers.get(remoteId);
  if (!entry) return;
  const gain = computeGainJs(myX, myY, remoteX, remoteY, AUDIO_MIN_DIST, AUDIO_MAX_DIST);
  entry.gainNode.gain.setTargetAtTime(gain, entry.gainNode.context.currentTime, 0.05);
}

/** Pure JS fallback for compute_gain (matches Rust WASM logic). */
export function computeGainJs(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  minDist: number,
  maxDist: number,
): number {
  const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
  if (dist <= minDist) return 1.0;
  if (dist >= maxDist) return 0.0;
  return 1.0 - (dist - minDist) / (maxDist - minDist);
}

/** Clean up all peer connections (called on disconnect). */
export function closeAll(): void {
  for (const [id] of peers) {
    disconnectPeer(id);
  }
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  audioCtx?.close();
  audioCtx = null;
  myId = null;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function createPeerEntry(remoteId: PlayerId): PeerEntry {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  // Add local tracks
  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  // Audio pipeline: RemoteStream → AudioContext → GainNode → destination
  const gainNode = audioCtx!.createGain();
  gainNode.gain.value = 1.0;
  gainNode.connect(audioCtx!.destination);

  const audioEl = new Audio();
  audioEl.autoplay = true;

  pc.ontrack = (ev) => {
    const remoteStream = ev.streams[0];
    if (!remoteStream) return;
    audioEl.srcObject = remoteStream;
    const source = audioCtx!.createMediaStreamSource(remoteStream);
    source.connect(gainNode);
    // Mute the HTML element since we're routing through AudioContext
    audioEl.volume = 0;
  };

  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      sendMessage({
        type: "rtc_ice",
        to_id: remoteId,
        candidate: JSON.stringify(ev.candidate),
      });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      disconnectPeer(remoteId);
    }
  };

  const entry: PeerEntry = { pc, gainNode, audioEl, makingOffer: false };
  peers.set(remoteId, entry);
  return entry;
}
