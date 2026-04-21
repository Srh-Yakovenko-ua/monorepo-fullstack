import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteBlogsLookup } from "@/features/blogs/hooks/use-blogs-lookup";
import { cn } from "@/lib/utils";

type BlogComboboxProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
  id?: string;
  initialLabel?: string;
  onValueChange: (blogId: string) => void;
  value: string;
};

export function BlogCombobox({
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  disabled,
  id,
  initialLabel,
  onValueChange,
  value,
}: BlogComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [displayLabel, setDisplayLabel] = useState(initialLabel ?? "");
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isFetchNextPageError,
    isLoading,
    refetch,
  } = useInfiniteBlogsLookup({ enabled: open, searchNameTerm: debouncedSearch });

  const blogs = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !open) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isFetchNextPageError
        ) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  }

  function handleSearchChange(nextSearch: string) {
    setSearch(nextSearch);
  }

  function handleSelect(blogId: string) {
    const selected = blogs.find((blog) => blog.id === blogId);
    if (selected) {
      setDisplayLabel(selected.name);
    }
    onValueChange(blogId);
    setOpen(false);
    setSearch("");
  }

  function handleRetry() {
    void refetch();
  }

  function handleListWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  const triggerLabel = displayLabel || t("posts.form.blogIdPlaceholder");

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-describedby={ariaDescribedby}
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          className="w-full justify-between font-normal"
          disabled={disabled}
          id={id}
          role="combobox"
          variant="outline"
        >
          <span className={displayLabel ? "text-foreground" : "text-muted-foreground"}>
            {triggerLabel}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={handleSearchChange}
            placeholder={t("posts.form.blogSearchPlaceholder")}
            value={search}
          />
          <CommandList className="h-60 overflow-y-auto" onWheel={handleListWheel}>
            {isLoading && (
              <CommandGroup>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="px-2 py-1.5" key={`skeleton-${index}`}>
                    <Skeleton className="h-4 w-full rounded-sm" />
                  </div>
                ))}
              </CommandGroup>
            )}

            {isError && !isLoading && (
              <CommandEmpty>
                <span className="block text-destructive">{t("posts.form.blogLoadError")}</span>
                <Button className="mt-2" onClick={handleRetry} size="sm" variant="ghost">
                  {t("posts.form.blogRetry")}
                </Button>
              </CommandEmpty>
            )}

            {!isLoading && !isError && totalCount === 0 && !debouncedSearch && (
              <CommandEmpty>{t("posts.form.blogEmpty")}</CommandEmpty>
            )}

            {!isLoading && !isError && totalCount === 0 && debouncedSearch && (
              <CommandEmpty>{t("posts.form.blogNoResults")}</CommandEmpty>
            )}

            {!isLoading && !isError && blogs.length > 0 && (
              <CommandGroup>
                {blogs.map((blog) => (
                  <CommandItem key={blog.id} onSelect={handleSelect} value={blog.id}>
                    <Check
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        value === blog.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {blog.name}
                  </CommandItem>
                ))}
                {isFetchingNextPage && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="h-4" ref={sentinelRef} />
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
