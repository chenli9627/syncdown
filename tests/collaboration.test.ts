import test from "node:test";
import assert from "node:assert/strict";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { Server } from "@hocuspocus/server";
import * as Y from "yjs";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitForSync(provider: HocuspocusProvider) {
  return new Promise<void>((resolve) => {
    if (provider.synced) {
      resolve();
      return;
    }

    provider.on("synced", () => resolve());
  });
}

test("hocuspocus provider syncs document state and awareness", async () => {
  const server = new Server({
    address: "127.0.0.1",
    port: 0,
    quiet: true,
    stopOnSignals: false,
  });

  await server.listen();

  const url = `ws://127.0.0.1:${server.address.port}`;
  const room = `test-room-${Date.now()}`;
  const doc1 = new Y.Doc();
  const doc2 = new Y.Doc();
  const provider1 = new HocuspocusProvider({
    document: doc1,
    name: room,
    url,
  });
  const provider2 = new HocuspocusProvider({
    document: doc2,
    name: room,
    url,
  });

  await Promise.all([waitForSync(provider1), waitForSync(provider2)]);

  provider1.setAwarenessField("user", {
    color: "#111111",
    name: "One",
    userId: "user_one",
  });
  provider2.setAwarenessField("user", {
    color: "#222222",
    name: "Two",
    userId: "user_two",
  });
  provider1.setAwarenessField("cursor", { anchor: 1, head: 1 });
  provider2.setAwarenessField("cursor", { anchor: 2, head: 2 });

  doc1.getText("default").insert(0, "hello yjs");

  await wait(500);

  assert.equal(doc2.getText("default").toString(), "hello yjs");

  const awareness1 = Array.from(provider1.awareness!.getStates().values());
  const awareness2 = Array.from(provider2.awareness!.getStates().values());

  assert.equal(awareness1.length, 2);
  assert.equal(awareness2.length, 2);
  assert.deepEqual(
    awareness1
      .map((entry) => (entry as { user?: { userId?: string } }).user?.userId)
      .sort(),
    ["user_one", "user_two"],
  );
  assert.deepEqual(
    awareness2
      .map((entry) => (entry as { user?: { userId?: string } }).user?.userId)
      .sort(),
    ["user_one", "user_two"],
  );

  provider1.destroy();
  provider2.destroy();
  doc1.destroy();
  doc2.destroy();
  await server.destroy();
});
