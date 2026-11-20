import { auth } from "@/auth";
import { MistralNotConfigured, ping } from "@/lib/ai/mistral";

/** Is the AI provider reachable with the key this environment holds? */
export async function GET(request: Request) {
  const secret = request.headers.get("x-worker-secret");
  const fromWorker = Boolean(
    process.env.WORKER_SECRET && secret && secret === process.env.WORKER_SECRET,
  );

  if (!fromWorker) {
    const session = await auth();
    if (session?.user?.email?.toLowerCase() !== process.env.ALLOWED_EMAIL?.toLowerCase()) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    return Response.json(await ping());
  } catch (error) {
    if (error instanceof MistralNotConfigured) {
      return Response.json({ ok: false, error: "MISTRAL_API_KEY is not set here" }, { status: 503 });
    }
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "ping failed" },
      { status: 502 },
    );
  }
}
