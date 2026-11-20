import type { Metadata } from "next";

// Public on purpose: Google's consent screen needs a reachable privacy policy URL.
export const metadata: Metadata = {
  title: "Privacy · My Day",
  description: "What My Day reads, what it stores and for how long.",
};

export default function Privacy() {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-8 px-5 py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-[34px] font-light leading-tight tracking-[-0.02em]">Privacy</h1>
        <p className="text-sm text-muted">My Day · last updated 20 November 2026</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-light">What My Day is</h2>
        <p className="text-base leading-relaxed text-muted">
          My Day is a personal app with one user: its owner. It builds one daily plan from his
          Google Calendar, his Gmail and what he types or says. Nobody else can sign in: the app
          accepts a single Google account and refuses every other one.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-light">What it reads</h2>
        <ul className="flex flex-col gap-2 text-base leading-relaxed text-muted">
          <li>
            <span className="text-navy">Google Calendar</span> — events, to show the day and place
            work around what is already fixed.
          </li>
          <li>
            <span className="text-navy">Gmail, read-only</span> — recent messages, to find things
            the owner has to do or attend. Newsletters and promotions are filtered out before
            anything is read further.
          </li>
          <li>
            <span className="text-navy">What the owner types or says</span> — tasks, appointments
            and short voice notes.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-light">What it writes</h2>
        <p className="text-base leading-relaxed text-muted">
          Only new calendar events the owner creates in My Day. It never edits or deletes events
          that already exist, and it never sends, replies to or changes email.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-light">Where the data lives</h2>
        <p className="text-base leading-relaxed text-muted">
          In one private database owned and run by the app&rsquo;s owner, reachable only over HTTPS.
          The Google refresh token is encrypted (AES-256-GCM) and never shown in the browser. Email
          text is not stored: My Day keeps the extracted fields and a quote of at most 200
          characters, so the owner can see where an item came from. Voice recordings are deleted
          straight after they are turned into text.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-light">How long it is kept</h2>
        <p className="text-base leading-relaxed text-muted">
          Quotes and item history are kept for 30 days and then deleted. A deleted item moves to
          an archive for those 30 days, so it can be put back, and is then removed for good. The
          owner can export or delete all of the data at any time.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-light">What never happens</h2>
        <ul className="flex flex-col gap-2 text-base leading-relaxed text-muted">
          <li>No sharing or selling of the data, to anyone, for any purpose.</li>
          <li>No analytics, no tracking, no advertising.</li>
          <li>No training of AI models on the data.</li>
          <li>No other users, no team access, no third-party dashboards.</li>
        </ul>
        <p className="text-base leading-relaxed text-muted">
          Text from email is sent to one AI provider for a single purpose: turning a message into a
          suggested task or appointment that the owner then accepts or dismisses. Nothing else is
          sent anywhere.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-light">Google API Limited Use</h2>
        <p className="text-base leading-relaxed text-muted">
          My Day&rsquo;s use of information received from Google APIs follows the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-accent underline-offset-4 hover:underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Calendar and Gmail data is used only to provide
          the features described on this page, is never transferred to anyone except as required by
          law, and is never used for advertising or to train generalised AI models. Access can be
          withdrawn at any time in the{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="text-accent underline-offset-4 hover:underline"
          >
            Google account permissions
          </a>{" "}
          page.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-light">Questions</h2>
        <p className="text-base leading-relaxed text-muted">
          Write to the contact address shown on the Google consent screen for this app.
        </p>
      </section>

      <a href="/signin" className="text-sm text-accent underline-offset-4 hover:underline">
        Back to sign in
      </a>
    </main>
  );
}
