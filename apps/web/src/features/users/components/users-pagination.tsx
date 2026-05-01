import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { buildPageNumbers } from "@/features/users/lib/pagination";
import { cn } from "@/lib/utils";

type UsersPaginationProps = {
  currentPage: number;
  onPageChange: (page: number) => void;
  pagesCount: number;
  totalCount: number;
};

export function UsersPagination({ currentPage, onPageChange, pagesCount }: UsersPaginationProps) {
  const pageNumbers = buildPageNumbers({ currentPage, pagesCount });

  function handlePreviousClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (currentPage > 1) onPageChange(currentPage - 1);
  }

  function handleNextClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (currentPage < pagesCount) onPageChange(currentPage + 1);
  }

  function handlePageLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const targetPage = Number(e.currentTarget.dataset.page);
    if (targetPage && targetPage !== currentPage) onPageChange(targetPage);
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={currentPage === 1}
            className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
            href="#"
            onClick={handlePreviousClick}
          />
        </PaginationItem>

        {pageNumbers.map((pageEntry, pageEntryIndex) => (
          <PaginationItem key={`page-entry-${pageEntryIndex}`}>
            {pageEntry === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                data-page={pageEntry}
                href="#"
                isActive={pageEntry === currentPage}
                onClick={handlePageLinkClick}
              >
                {pageEntry}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            aria-disabled={currentPage === pagesCount}
            className={cn(currentPage === pagesCount && "pointer-events-none opacity-50")}
            href="#"
            onClick={handleNextClick}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
