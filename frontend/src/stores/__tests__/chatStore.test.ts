import { beforeEach, describe, expect, it } from "vitest";
import { useChatStore } from "../chatStore";

describe("chatStore", () => {
  beforeEach(() => {
    useChatStore.getState().clear();
  });

  it("starts with no messages", () => {
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it("addMessage appends to list with timestamp", () => {
    useChatStore.getState().addMessage({ fromId: "p1", text: "hello" });
    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.text).toBe("hello");
    expect(msgs[0]?.fromId).toBe("p1");
    expect(msgs[0]?.timestamp).toBeGreaterThan(0);
  });

  it("addMessage appends multiple messages in order", () => {
    useChatStore.getState().addMessage({ fromId: "p1", text: "first" });
    useChatStore.getState().addMessage({ fromId: "p2", text: "second" });
    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0]?.text).toBe("first");
    expect(msgs[1]?.text).toBe("second");
  });
});
