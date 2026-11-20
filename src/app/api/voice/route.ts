import { auth } from "@/auth";
import { parseWithMistral } from "@/lib/ai/parse";
import { MistralNotConfigured, transcribe } from "@/lib/ai/mistral";
import { TIMEZONE, dayKey } from "@/lib/day";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 8 * 1024 * 1024; // about 30 seconds of phone audio

/**
 * Takes a short recording, transcribes it with Voxtral, reads it into a draft
 * and hands both back for the review form. Nothing is added without a yes, and
 * the audio is never stored.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-worker-secret");
  const fromWorker = Boolean(
    process.env.WORKER_SECRET && secret && secret === process.env.WORKER_SECRET,
  );
  const session = fromWorker ? null : await auth();
  const email = fromWorker
    ? process.env.ALLOWED_EMAIL?.toLowerCase()
    : session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob)) return Response.json({ error: "send an audio file" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "that recording is too long" }, { status: 413 });

  const user = await prisma.user.findUnique({ where: { email } });
  const people = user
    ? ((await prisma.settings.findUnique({ where: { userId: user.id } }))?.priorities as
        | { vipPeople?: string[] }
        | null
        | undefined)?.vipPeople
    : undefined;

  try {
    const name = (file as File).name || "note.mp4";
    const transcript = await transcribe(file, name, people);
    if (!transcript) return Response.json({ error: "nothing was heard" }, { status: 422 });

    const draft = await parseWithMistral(transcript, {
      today: dayKey(new Date()),
      timezone: TIMEZONE,
      people,
    });

    return Response.json({ transcript, draft });
  } catch (error) {
    if (error instanceof MistralNotConfigured) {
      return Response.json({ error: "voice needs MISTRAL_API_KEY" }, { status: 503 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message.slice(0, 160) : "transcription failed" },
      { status: 502 },
    );
  }
}
