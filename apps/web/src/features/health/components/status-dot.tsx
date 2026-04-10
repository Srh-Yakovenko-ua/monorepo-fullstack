export type StatusDotState = "degraded" | "down" | "loading" | "ok";

const COLOR: Record<StatusDotState, string> = {
  degraded: "var(--warning)",
  down: "var(--error)",
  loading: "oklch(0.55 0.005 240)",
  ok: "var(--success)",
};

export function StatusDot({ status }: { status: StatusDotState }) {
  const color = COLOR[status];
  return (
    <span className="relative flex size-3 shrink-0 md:size-4 lg:size-5">
      <span
        className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex size-full rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 32px ${color}, 0 0 12px ${color}`,
        }}
      />
    </span>
  );
}
