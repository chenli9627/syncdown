import { spawn } from "node:child_process";
import net from "node:net";

const mode = process.argv[2] === "start" ? "start" : "dev";
const collabHost = process.env.COLLAB_HOST ?? "0.0.0.0";
const collabPort = process.env.COLLAB_PORT ?? "1234";

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: Number(port) });
    let settled = false;

    const finish = (value) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(750, () => finish(false));
  });
}

const collabAlreadyRunning = await canConnect("127.0.0.1", collabPort);
const collab = collabAlreadyRunning
  ? null
  : spawn(
      process.execPath,
      ["./scripts/collab-server.mjs", "--host", collabHost, "--port", collabPort],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      },
    );

const app = spawn("pnpm", ["run", mode === "dev" ? "dev:app" : "start:app"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

function terminateChildren(signal = "SIGTERM") {
  if (collab && !collab.killed) {
    collab.kill(signal);
  }
  if (!app.killed) {
    app.kill(signal);
  }
}

collab?.on("exit", (code) => {
  if (code && !app.killed) {
    app.kill("SIGTERM");
    process.exit(code);
  }
});

app.on("exit", (code) => {
  terminateChildren("SIGTERM");
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  terminateChildren("SIGINT");
});

process.on("SIGTERM", () => {
  terminateChildren("SIGTERM");
});
