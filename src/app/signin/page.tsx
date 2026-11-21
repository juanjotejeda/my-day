import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

export default async function SignIn({ searchParams }: PageProps<"/signin">) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-[34px] font-light leading-tight tracking-[-0.02em]">My Day</h1>
        <p className="text-base leading-relaxed text-muted">
          One calm plan for the day, around your energy. Sign in with the Google account that
          holds your calendar and mail.
        </p>
      </div>

      {error ? (
        <p className="rounded-card border border-line bg-surface p-4 text-sm leading-relaxed text-muted">
          {error === "AccessDenied"
            ? "That account cannot sign in. My Day is set up for one Google account."
            : "Sign-in did not finish. Please try again."}
        </p>
      ) : null}

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="min-h-[52px] w-full rounded-full bg-primary px-6 text-[15px] text-on-primary"
        >
          Continue with Google
        </button>
      </form>

      <p className="text-xs leading-relaxed text-muted">
        My Day reads your calendar and mail to build the plan, and adds only the events you
        create here. It never sends mail and never changes events you already have.{" "}
        <a href="/privacy" className="text-accent underline-offset-4 hover:underline">
          Privacy
        </a>
      </p>
    </main>
  );
}
