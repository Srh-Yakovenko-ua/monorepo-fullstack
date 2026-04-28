import { ThumbsDown, ThumbsUp } from "lucide-react";

type Props = {
  dislikesCount: number;
  likesCount: number;
};

export function PostLikesDisplay({ dislikesCount, likesCount }: Props) {
  return (
    <span className="flex items-center gap-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
      <span className="flex items-center gap-1">
        <ThumbsUp aria-hidden className="size-3 shrink-0" />
        <span className="tabular-nums">{likesCount}</span>
      </span>
      <span className="flex items-center gap-1">
        <ThumbsDown aria-hidden className="size-3 shrink-0" />
        <span className="tabular-nums">{dislikesCount}</span>
      </span>
    </span>
  );
}
