// The worker service: syncs Google every 5 minutes by calling the web app.
// Keeping the database work in the app means one place for Prisma and one for the rules.
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import cron from "node-cron";

const APP_URL = process.env.APP_URL;
const SECRET = process.env.WORKER_SECRET;
const SCHEDULE = process.env.SYNC_CRON || "*/5 * * * *";
const BACKUP_SCHEDULE = process.env.BACKUP_CRON || "30 3 * * *";
/** Where the nightly backup is written. A Railway volume, when one is mounted. */
const BACKUP_DIR = process.env.BACKUP_DIR || "";
const BACKUP_KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS || 14);

if (!APP_URL || !SECRET) {
  console.error("worker: APP_URL and WORKER_SECRET are required");
  process.exit(1);
}

let running = false;

async function call(path) {
  const startedAt = Date.now();
  const response = await fetch(`${APP_URL}${path}`, {
    method: "POST",
    headers: { "x-worker-secret": SECRET, "content-type": "application/json" },
    body: "{}",
  });
  const body = await response.text();
  console.log(`worker: ${path} ${response.status} in ${Date.now() - startedAt}ms ${body}`);
}

async function sync() {
  if (running) {
    console.log("worker: previous tick still running, skipping this one");
    return;
  }
  running = true;
  try {
    await call("/api/sync");
    // Notifications read the day the sync just refreshed.
    await call("/api/notifications/run");
  } catch (error) {
    console.error(`worker: tick failed: ${error instanceof Error ? error.message : error}`);
  } finally {
    running = false;
  }
}

/**
 * The nightly backup: the whole database as JSON, written to the volume, with
 * anything older than the keep window removed. Without a volume it is skipped,
 * so a missing mount is never a silent failure.
 */
async function backup() {
  if (!BACKUP_DIR) {
    console.log("worker: no BACKUP_DIR, so no backup is written");
    return;
  }

  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    const response = await fetch(`${APP_URL}/api/export`, { headers: { "x-worker-secret": SECRET } });
    if (!response.ok) {
      console.error(`worker: backup failed: export ${response.status}`);
      return;
    }

    const body = await response.text();
    const name = `my-day-${new Date().toISOString().slice(0, 10)}.json`;
    await writeFile(join(BACKUP_DIR, name), body, "utf8");
    console.log(`worker: backup wrote ${name}, ${body.length} bytes`);

    const cutoff = Date.now() - BACKUP_KEEP_DAYS * 86400000;
    for (const file of await readdir(BACKUP_DIR)) {
      if (!file.startsWith("my-day-") || !file.endsWith(".json")) continue;
      const path = join(BACKUP_DIR, file);
      const info = await stat(path);
      if (info.mtimeMs < cutoff) {
        await unlink(path);
        console.log(`worker: backup removed ${file}, past ${BACKUP_KEEP_DAYS} days`);
      }
    }
  } catch (error) {
    console.error(`worker: backup failed: ${error instanceof Error ? error.message : error}`);
  }
}

console.log(
  `worker: syncing ${APP_URL} on "${SCHEDULE}", backup on "${BACKUP_SCHEDULE}" to ${
    BACKUP_DIR || "nowhere"
  } (TZ ${process.env.TZ || "system"})`,
);
cron.schedule(SCHEDULE, sync);
cron.schedule(BACKUP_SCHEDULE, backup);
sync();
