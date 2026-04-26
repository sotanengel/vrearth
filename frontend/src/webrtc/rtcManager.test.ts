import { describe, it, expect, beforeEach } from "vitest";
import { computeGainJs, AUDIO_MIN_DIST, AUDIO_MAX_DIST } from "./rtcManager";

// Note: RTCPeerConnection / getUserMedia are not available in jsdom.
// We test the pure-JS gain logic here; the full WebRTC flow is covered by
// manual smoke testing in the browser.

describe("computeGainJs", () => {
  it("returns 1.0 at zero distance", () => {
    expect(computeGainJs(0, 0, 0, 0, AUDIO_MIN_DIST, AUDIO_MAX_DIST)).toBeCloseTo(1.0);
  });

  it("returns 1.0 within min distance", () => {
    expect(computeGainJs(0, 0, 30, 0, AUDIO_MIN_DIST, AUDIO_MAX_DIST)).toBeCloseTo(1.0);
  });

  it("returns 0.0 at max distance", () => {
    expect(computeGainJs(0, 0, AUDIO_MAX_DIST, 0, AUDIO_MIN_DIST, AUDIO_MAX_DIST)).toBeCloseTo(0.0);
  });

  it("returns 0.0 beyond max distance", () => {
    expect(computeGainJs(0, 0, AUDIO_MAX_DIST + 100, 0, AUDIO_MIN_DIST, AUDIO_MAX_DIST)).toBeCloseTo(0.0);
  });

  it("returns ~0.5 at midpoint", () => {
    const mid = (AUDIO_MIN_DIST + AUDIO_MAX_DIST) / 2;
    expect(computeGainJs(0, 0, mid, 0, AUDIO_MIN_DIST, AUDIO_MAX_DIST)).toBeCloseTo(0.5, 4);
  });

  it("uses euclidean distance (3-4-5 triangle stays within min_dist)", () => {
    // dist = 5, min_dist = AUDIO_MIN_DIST (50) → gain = 1.0
    expect(computeGainJs(0, 0, 3, 4, AUDIO_MIN_DIST, AUDIO_MAX_DIST)).toBeCloseTo(1.0);
  });

  it("matches Rust linear falloff formula at arbitrary distance", () => {
    const minDist = 100;
    const maxDist = 500;
    const dist = 300;
    // gain = 1 - (300 - 100) / (500 - 100) = 1 - 200/400 = 0.5
    expect(computeGainJs(0, 0, dist, 0, minDist, maxDist)).toBeCloseTo(0.5, 5);
  });
});
