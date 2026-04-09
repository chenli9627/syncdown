import http from "node:http";
import { parseArgs } from "node:util";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "@y/websocket-server/utils";

const { values } = parseArgs({
  options: {
    host: { type: "string" },
    port: { type: "string" },
  },
});

const host = values.host ?? process.env.COLLAB_HOST ?? "0.0.0.0";
const port = Number(values.port ?? process.env.COLLAB_PORT ?? "1234");

const server = http.createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("syncdown-collab-ok");
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", setupWSConnection);

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(port, host, () => {
  console.log(`[syncdown] collab server listening on ws://${host}:${port}`);
});

function shutdown() {
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
