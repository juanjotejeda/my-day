import { redirect } from "next/navigation";

import { ReviewScreen } from "@/components/review-screen";
import { loadCandidates } from "@/lib/plan/candidates";
import { currentUser, settingsFor } from "@/lib/session";

export default async function Review() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const [candidates, settings] = await Promise.all([loadCandidates(user.id), settingsFor(user.id)]);
  return <ReviewScreen candidates={candidates} autoAdd={Boolean(settings.priorities.autoAddVip)} />;
}
