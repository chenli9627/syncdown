import { parseArgs } from "node:util";
import { Server } from "@hocuspocus/server";

const { values } = parseArgs({
  options: {
    host: { type: "string" },
    port: { type: "string" },
  },
});

const host = values.host ?? process.env.COLLAB_HOST ?? "0.0.0.0";
const port = Number(values.port ?? process.env.COLLAB_PORT ?? "1234");

const collabServer = new Server({
  address: host,
  port,
  quiet: true,
  stopOnSignals: false,
});

await collabServer.listen();
console.log(`[syncdown] collab server listening on ws://${host}:${port}`);

async function shutdown() {
  await collabServer.destroy();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
