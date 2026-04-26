import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as wsClient from "../../webrtc/wsClient";
import { useChatStore } from "../../stores/chatStore";
import { ChatPanel } from "../ChatPanel";

describe("ChatPanel", () => {
  beforeEach(() => {
    useChatStore.getState().clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders chat input", () => {
    render(<ChatPanel />);
    expect(screen.getByTestId("chat-input")).toBeInTheDocument();
  });

  it("typing and pressing Enter calls sendMessage", async () => {
    const spy = vi.spyOn(wsClient, "sendMessage").mockImplementation(() => {});
    render(<ChatPanel />);
    const input = screen.getByTestId("chat-input");
    await userEvent.type(input, "hello{Enter}");
    expect(spy).toHaveBeenCalledWith({ type: "chat", text: "hello" });
  });

  it("empty or whitespace-only message is not sent", async () => {
    const spy = vi.spyOn(wsClient, "sendMessage").mockImplementation(() => {});
    render(<ChatPanel />);
    const input = screen.getByTestId("chat-input");
    await userEvent.type(input, "   {Enter}");
    expect(spy).not.toHaveBeenCalled();
  });

  it("input clears after sending", async () => {
    vi.spyOn(wsClient, "sendMessage").mockImplementation(() => {});
    render(<ChatPanel />);
    const input = screen.getByTestId("chat-input") as HTMLInputElement;
    await userEvent.type(input, "hello{Enter}");
    expect(input.value).toBe("");
  });
});
