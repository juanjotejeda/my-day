import Link from "next/link";

export default function Placeholder() {
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center gap-3 px-5 py-16">
      <h1 className="text-[28px] font-light">Next group</h1>
      <p className="text-base leading-relaxed text-muted">This screen arrives in the next push.</p>
      <Link href="/" className="text-sm text-accent">
        Back to Today
      </Link>
    </main>
  );
}
