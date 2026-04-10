import { useQuery } from "@tanstack/react-query";

import { healthApi } from "@/features/health/api";

export function useHealth() {
  return useQuery({
    queryFn: healthApi.get,
    queryKey: ["health"],
    refetchInterval: 10_000,
  });
}
