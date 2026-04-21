import { useQuery } from "@tanstack/react-query";

import { videosApi, videosKeys } from "@/features/videos/api";

export function useVideos() {
  return useQuery({
    queryFn: videosApi.list,
    queryKey: videosKeys.lists(),
  });
}
