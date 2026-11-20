import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "my-day";
export default defineRailway(() => {
  const myDay = service("my-day", {
    // No commitSha: deploy whatever is on main.
    source: github("juanjotejeda/my-day", { branch: "main", checkSuites: false, upstreamUrl: "https://github.com/juanjotejeda/my-day" }),
    build: { buildCommand: "pnpm install --frozen-lockfile && pnpm build", buildEnvironment: "V3", builder: "NIXPACKS" },
    start: "pnpm start",
    healthcheck: "/signin",
    replicas: { "iad": 1 },
  });

  // Syncs Google every 5 minutes. No HTTP, so no domain and no healthcheck.
  const worker = service("worker", {
    source: github("juanjotejeda/my-day", { branch: "main", checkSuites: false, upstreamUrl: "https://github.com/juanjotejeda/my-day" }),
    build: { buildCommand: "pnpm install --frozen-lockfile", buildEnvironment: "V3", builder: "NIXPACKS" },
    start: "pnpm worker",
    replicas: { "iad": 1 },
  });

  return project("incredible-exploration", {
    variables: { managed: false },
    resources: [myDay, worker],
  });
});
