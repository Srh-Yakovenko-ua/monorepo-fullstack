type BuildPageNumbersParams = {
  currentPage: number;
  pagesCount: number;
};

export function buildPageNumbers({
  currentPage,
  pagesCount,
}: BuildPageNumbersParams): ("ellipsis" | number)[] {
  if (pagesCount <= 7) {
    return Array.from({ length: pagesCount }, (_, index) => index + 1);
  }

  const pages: ("ellipsis" | number)[] = [1];

  if (currentPage > 3) pages.push("ellipsis");

  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(pagesCount - 1, currentPage + 1);

  for (let pageIndex = rangeStart; pageIndex <= rangeEnd; pageIndex++) {
    pages.push(pageIndex);
  }

  if (currentPage < pagesCount - 2) pages.push("ellipsis");

  pages.push(pagesCount);

  return pages;
}
