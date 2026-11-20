// The worker service: syncs Google every 5 minutes by calling the web app.
// Keeping the database work in the app means one place for Prisma and one for the rules.
import cron from "node-cron";

const APP_URL = process.env.APP_URL;
const SECRET = process.env.WORKER_SECRET;
const SCHEDULE = process.env.SYNC_CRON || "*/5 * * * *";

if (!APP_URL || !SECRET) {
  console.error("worker: APP_URL and WORKER_SECRET are required");
  process.exit(1);
}

let running = false;

async function sync() {
  if (running) {
    console.log("worker: previous sync still running, skipping this tick");
    return;
  }
  running = true;
  const startedAt = Date.now();
  try {
    const response = await fetch(`${APP_URL}/api/sync`, {
      method: "POST",
      headers: { "x-worker-secret": SECRET },
    });
    const body = await response.text();
    console.log(`worker: sync ${response.status} in ${Date.now() - startedAt}ms ${body}`);
  } catch (error) {
    console.error(`worker: sync failed: ${error instanceof Error ? error.message : error}`);
  } finally {
    running = false;
  }
}

console.log(`worker: syncing ${APP_URL} on "${SCHEDULE}" (TZ ${process.env.TZ || "system"})`);
cron.schedule(SCHEDULE, sync);
sync();
