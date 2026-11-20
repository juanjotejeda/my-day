import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { refreshSuggestions } from "@/lib/rules/store";

/** The rules and suggestions as the Learned rules screen sees them. */
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

  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return Response.json({ error: "no user" }, { status: 409 });

  const found = await refreshSuggestions(user.id);
  const rules = await prisma.rule.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return Response.json({
    newSuggestions: found,
    rules: rules.map((rule) => ({
      id: rule.id,
      text: rule.text,
      kind: rule.kind,
      params: rule.params,
      origin: rule.origin,
      active: rule.active,
      evidence: rule.evidenceCount,
    })),
  });
}
