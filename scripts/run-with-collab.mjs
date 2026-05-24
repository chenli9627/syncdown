import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";

const mode = process.argv[2] === "start" ? "start" : "dev";
const collabHost = process.env.COLLAB_HOST ?? "0.0.0.0";
const collabPort = process.env.COLLAB_PORT ?? "1234";
const devMemoryGuardEnabled =
  mode === "dev" && process.env.SYNCDOWN_DEV_MEMORY_GUARD !== "0";
const devAppMaxRssMb = Number(process.env.SYNCDOWN_DEV_APP_MAX_RSS_MB ?? "3072");
const devAppMemoryCheckMs = Number(
  process.env.SYNCDOWN_DEV_MEMORY_CHECK_MS ?? "15000",
);
const collabHealthCheckMs = Number(process.env.SYNCDOWN_COLLAB_CHECK_MS ?? "2000");

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

let collab = null;
let collabEnsuring = false;
let collabWatchdog = null;
let shuttingDown = false;
let appRestarting = false;
let app = startApp();
let memoryGuard = null;

await ensureCollab();
collabWatchdog = setInterval(() => {
  void ensureCollab();
}, collabHealthCheckMs);
collabWatchdog.unref();

if (devMemoryGuardEnabled && Number.isFinite(devAppMaxRssMb) && devAppMaxRssMb > 0) {
  memoryGuard = setInterval(checkAppMemory, devAppMemoryCheckMs);
  memoryGuard.unref();
}

function startApp() {
  const child = spawn("pnpm", ["run", mode === "dev" ? "dev:app" : "start:app"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (appRestarting) {
      appRestarting = false;
      app = startApp();
      return;
    }

    shutdownChildren("SIGTERM");
    process.exit(code ?? 0);
  });

  return child;
}

async function ensureCollab() {
  if (shuttingDown || collabEnsuring) {
    return;
  }

  if (collab && !collab.killed) {
    return;
  }

  collabEnsuring = true;

  try {
    if (await canConnect("127.0.0.1", collabPort)) {
      return;
    }

    startManagedCollab();
  } finally {
    collabEnsuring = false;
  }
}

function startManagedCollab() {
  if (shuttingDown || collab) {
    return;
  }

  collab = spawn(
    process.execPath,
    ["./scripts/collab-server.mjs", "--host", collabHost, "--port", collabPort],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );

  collab.on("exit", (code, signal) => {
    collab = null;

    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.warn(`[syncdown] collab server stopped (${reason}); retrying.`);
    setTimeout(() => {
      void ensureCollab();
    }, 500).unref();
  });
}

function shutdownChildren(signal = "SIGTERM") {
  shuttingDown = true;
  clearIntervals();

  if (collab && !collab.killed) {
    collab.kill(signal);
  }
  if (!app.killed) {
    terminateProcessTree(app.pid, signal);
  }
}

process.on("SIGINT", () => {
  shutdownChildren("SIGINT");
});

process.on("SIGTERM", () => {
  shutdownChildren("SIGTERM");
});

function checkAppMemory() {
  if (!app.pid || app.killed) {
    return;
  }

  const rssMb = getProcessTreeRssMb(app.pid);

  if (rssMb == null) {
    return;
  }

  if (rssMb < devAppMaxRssMb) {
    return;
  }

  console.warn(
    `[syncdown] dev app RSS reached ${rssMb.toFixed(0)} MB; restarting app process ` +
      `(limit ${devAppMaxRssMb} MB).`,
  );
  appRestarting = true;
  terminateProcessTree(app.pid, "SIGTERM");
}

function clearMemoryGuard() {
  if (memoryGuard) {
    clearInterval(memoryGuard);
    memoryGuard = null;
  }
}

function clearCollabWatchdog() {
  if (collabWatchdog) {
    clearInterval(collabWatchdog);
    collabWatchdog = null;
  }
}

function clearIntervals() {
  clearMemoryGuard();
  clearCollabWatchdog();
}

function terminateProcessTree(rootPid, signal) {
  for (const pid of getProcessTreePids(rootPid).reverse()) {
    try {
      process.kill(pid, signal);
    } catch {
      // Process already exited.
    }
  }
}

function getProcessTreeRssMb(rootPid) {
  const pids = getProcessTreePids(rootPid);

  if (pids.length === 0) {
    return null;
  }

  const rssKb = pids.reduce((total, pid) => total + getProcessRssKb(pid), 0);

  return rssKb / 1024;
}

function getProcessTreePids(rootPid) {
  const parentByPid = getParentPidMap();
  const childrenByParent = new Map();

  for (const [pid, parentPid] of parentByPid.entries()) {
    const children = childrenByParent.get(parentPid) ?? [];
    children.push(pid);
    childrenByParent.set(parentPid, children);
  }

  const pids = [];
  const queue = [rootPid];

  while (queue.length > 0) {
    const pid = queue.shift();

    if (!pid || pids.includes(pid)) {
      continue;
    }

    pids.push(pid);
    queue.push(...(childrenByParent.get(pid) ?? []));
  }

  return pids;
}

function getParentPidMap() {
  const parentByPid = new Map();

  for (const entry of fs.readdirSync("/proc", { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) {
      continue;
    }

    const pid = Number(entry.name);
    const stat = readProcFile(pid, "stat");
    const endOfCommand = stat.lastIndexOf(")");

    if (endOfCommand === -1) {
      continue;
    }

    const fields = stat.slice(endOfCommand + 2).split(" ");
    const parentPid = Number(fields[1]);

    if (Number.isFinite(parentPid)) {
      parentByPid.set(pid, parentPid);
    }
  }

  return parentByPid;
}

function getProcessRssKb(pid) {
  const status = readProcFile(pid, "status");
  const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);

  return match ? Number(match[1]) : 0;
}

function readProcFile(pid, fileName) {
  try {
    return fs.readFileSync(`/proc/${pid}/${fileName}`, "utf8");
  } catch {
    return "";
  }
}
