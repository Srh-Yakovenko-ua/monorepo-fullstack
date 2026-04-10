export function PageLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="relative flex min-h-screen flex-col items-start justify-center px-8 py-10 md:px-16 lg:px-24 2xl:px-32"
    >
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
        Loading
      </p>
      <div className="mt-6 flex items-center gap-5 md:gap-7">
        <div className="size-3 shrink-0 animate-pulse rounded-full bg-muted-foreground/40 md:size-4 lg:size-5" />
        <div className="h-[clamp(3rem,8vw,12rem)] w-[16ch] animate-pulse rounded-md bg-muted-foreground/10" />
      </div>
      <div className="mt-10 h-5 w-2/3 max-w-2xl animate-pulse rounded-md bg-muted-foreground/10 md:h-6" />
    </div>
  );
}
