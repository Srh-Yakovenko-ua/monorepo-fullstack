const USER_ID_PREFIX_CHARS = 6;
const USER_ID_SUFFIX_CHARS = 4;
const USER_ID_TRUNCATE_THRESHOLD = USER_ID_PREFIX_CHARS + USER_ID_SUFFIX_CHARS + 2;

export function truncateUserId(id: number | string): string {
  const value = typeof id === "number" ? String(id) : id;
  if (value.length <= USER_ID_TRUNCATE_THRESHOLD) return value;
  return `${value.slice(0, USER_ID_PREFIX_CHARS)}…${value.slice(-USER_ID_SUFFIX_CHARS)}`;
}
