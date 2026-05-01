import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TableHead } from "@/components/ui/table";
import {
  ARIA_SORT,
  getSortDirectionForColumn,
  type SortableColumn,
  type UserSortValue,
} from "@/features/users/lib/sort";
import { cn } from "@/lib/utils";

type SortableHeaderProps = {
  className?: string;
  column: SortableColumn;
  currentSort: UserSortValue;
  label: string;
  onSortClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export function SortableHeader({
  className,
  column,
  currentSort,
  label,
  onSortClick,
}: SortableHeaderProps) {
  const { t } = useTranslation();
  const direction = getSortDirectionForColumn(column, currentSort);
  const isActive = direction !== ARIA_SORT.none;

  return (
    <TableHead aria-sort={direction} className={cn("h-12 px-4 first:pl-6 last:pr-6", className)}>
      <button
        aria-label={t("users.list.sortAriaLabel", { column: label })}
        className={cn(
          "group/sort-btn -mx-2 flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors",
          isActive
            ? "text-foreground hover:bg-muted/60"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        )}
        data-sort-column={column}
        onClick={onSortClick}
        type="button"
      >
        <span>{label}</span>
        {direction === ARIA_SORT.ascending && (
          <ArrowUp className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
        )}
        {direction === ARIA_SORT.descending && (
          <ArrowDown className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
        )}
        {direction === ARIA_SORT.none && (
          <ArrowUpDown
            className="size-4 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity duration-150 group-hover/sort-btn:opacity-100"
            strokeWidth={2}
          />
        )}
      </button>
    </TableHead>
  );
}
