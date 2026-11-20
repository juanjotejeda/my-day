import { redirect } from "next/navigation";

import { ReviewScreen } from "@/components/review-screen";
import { auth } from "@/auth";
import { SAMPLE_CANDIDATES } from "@/lib/plan/sample-screens";

// Real candidates arrive with the Gmail extraction in milestone 5.
export default async function Review() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  return <ReviewScreen candidates={SAMPLE_CANDIDATES} />;
}
