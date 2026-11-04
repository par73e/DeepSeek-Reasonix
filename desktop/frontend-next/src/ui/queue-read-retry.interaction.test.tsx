// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "./testkit";
import type { AgentPort, Queue as QueueSnapshot } from "../port/port";
import { Queue } from "./Queue";
import { useQueueActions } from "./queueactions";

const dispatch = vi.fn();
const fail = vi.fn();
const snapshot = (text: string): QueueSnapshot => ({
  revision: 1, paused: false,
  items: [{ id: text, preview: text, intent: "steer", state: "steer_accepted", createdAt: "2026-11-04T00:00:00Z" }],
  capacity: { items: 1, maxItems: 64, bytes: 10, maxBytes: 64 << 20 },
});

function View({ port, moved = 0 }: { port: AgentPort; moved?: number }) {
  const actions = useQueueActions({ port, dispatch, fail, moved });
  return <Queue queue={actions.queue} running onRead={actions.onQueueRead} onEdit={actions.onQueueEdit}
    onMove={actions.onQueueMove} onCancel={actions.onQueueCancel} onSendNow={actions.onQueueSendNow}
    onRetry={actions.onQueueRetry} onRefresh={actions.onQueueRefresh} onPause={actions.onQueuePause} />;
}

const advance = (ms = 1000) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("shows accepted guidance after a transient read failure without sending another message", async () => {
  const queue = vi.fn().mockRejectedValueOnce(new TypeError("network down")).mockResolvedValue(snapshot("First guidance"));
  const port = { queue } as unknown as AgentPort;
  render(<View port={port} />);
  await advance();
  expect(queue).toHaveBeenCalledTimes(2);
  expect(screen.getByText("First guidance")).toBeTruthy();
  expect(fail).not.toHaveBeenCalled();
});

it("keeps the last queue visible while retrying an event-triggered refresh", async () => {
  const queue = vi.fn().mockResolvedValueOnce(snapshot("First guidance"))
    .mockRejectedValueOnce(new TypeError("network down")).mockResolvedValue(snapshot("Second guidance"));
  const port = { queue } as unknown as AgentPort;
  const view = render(<View port={port} />);
  await advance(0);
  expect(screen.getByText("First guidance")).toBeTruthy();
  view.rerender(<View port={port} moved={1} />);
  await advance(0);
  expect(screen.getByText("First guidance")).toBeTruthy();
  await advance();
  expect(screen.queryByText("First guidance")).toBeNull();
  expect(screen.getByText("Second guidance")).toBeTruthy();
});

it("cancels the old queue's retry when the pane changes connection or unmounts", async () => {
  const oldQueue = vi.fn().mockRejectedValue(new TypeError("network down"));
  const newQueue = vi.fn().mockResolvedValue(snapshot("Other session"));
  const view = render(<View port={{ queue: oldQueue } as unknown as AgentPort} />);
  await advance(0);
  view.rerender(<View port={{ queue: newQueue } as unknown as AgentPort} />);
  await advance(16000);
  expect(oldQueue).toHaveBeenCalledTimes(1);
  expect(newQueue).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Other session")).toBeTruthy();
  view.unmount();
  await advance(16000);
  expect(newQueue).toHaveBeenCalledTimes(1);
});

it("backs off repeated failures and cancels a pending retry on unmount", async () => {
  const queue = vi.fn().mockRejectedValue(new TypeError("network down"));
  const view = render(<View port={{ queue } as unknown as AgentPort} />);
  await advance(0);
  expect(queue).toHaveBeenCalledTimes(1);
  await advance(999);
  expect(queue).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(queue).toHaveBeenCalledTimes(2);
  await advance(1999);
  expect(queue).toHaveBeenCalledTimes(2);
  await advance(1);
  expect(queue).toHaveBeenCalledTimes(3);
  view.unmount();
  await advance(60000);
  expect(queue).toHaveBeenCalledTimes(3);
});
