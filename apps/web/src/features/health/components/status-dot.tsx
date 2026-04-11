export type StatusDotState = "degraded" | "down" | "loading" | "ok";

const COLOR: Record<StatusDotState, string> = {
  degraded: "var(--warning)",
  down: "var(--error)",
  loading: "var(--muted-foreground)",
  ok: "var(--success)",
};

export function StatusDot({ status }: { status: StatusDotState }) {
  const color = COLOR[status];
  return (
    <span aria-hidden="true" className="relative flex size-3 shrink-0 md:size-4 lg:size-5">
      <span
        className="absolute inline-flex size-full rounded-full opacity-50 motion-safe:animate-ping"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex size-full rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 24px ${color}, 0 0 8px ${color}`,
        }}
      />
    </span>
  );
}
