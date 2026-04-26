import type { DeviceViewModel } from "@app/shared";

import { request } from "@/lib/http-client";

export const securityKeys = {
  all: ["security"] as const,
  devices: () => [...securityKeys.all, "devices"] as const,
};

export const securityApi = {
  listDevices: () => request<DeviceViewModel[]>("/api/security/devices", { authMode: "bearer" }),

  terminateDevice: (deviceId: string) =>
    request<void>(`/api/security/devices/${deviceId}`, {
      authMode: "bearer",
      method: "DELETE",
    }),

  terminateOtherDevices: () =>
    request<void>("/api/security/devices", {
      authMode: "bearer",
      method: "DELETE",
    }),
};
