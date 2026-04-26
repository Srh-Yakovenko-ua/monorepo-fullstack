import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { securityApi, securityKeys } from "@/features/security/api";

export function useDevices() {
  return useQuery({
    queryFn: securityApi.listDevices,
    queryKey: securityKeys.devices(),
  });
}

export function useTerminateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => securityApi.terminateDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.devices() });
    },
  });
}

export function useTerminateOtherDevices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: securityApi.terminateOtherDevices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.devices() });
    },
  });
}
