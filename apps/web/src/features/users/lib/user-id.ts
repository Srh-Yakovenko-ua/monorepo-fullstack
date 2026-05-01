const USER_ID_PREFIX_CHARS = 6;
const USER_ID_SUFFIX_CHARS = 4;
const USER_ID_TRUNCATE_THRESHOLD = USER_ID_PREFIX_CHARS + USER_ID_SUFFIX_CHARS + 2;

export function truncateUserId(id: string): string {
  if (id.length <= USER_ID_TRUNCATE_THRESHOLD) return id;
  return `${id.slice(0, USER_ID_PREFIX_CHARS)}…${id.slice(-USER_ID_SUFFIX_CHARS)}`;
}
