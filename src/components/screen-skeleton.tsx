/** What a screen looks like while its data arrives: the shape, without the content. */
export function ScreenSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-4 px-4 pt-6 pb-12">
      <div className="flex items-center justify-between gap-2 pl-1">
        <span className="h-4 w-44 rounded-full bg-divider" />
        <span className="h-11 w-11 rounded-full border border-sky" />
      </div>
      <span className="h-[52px] rounded-full bg-surface" />
      <span className="h-20 rounded-card border border-line" />
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="h-[60px] rounded-card border border-line" />
      ))}
      <span className="sr-only" role="status">
        Loading
      </span>
    </main>
  );
}
