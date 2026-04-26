import type { DeviceViewModel } from "@app/shared";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeviceRow } from "./devices-page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options?.title ? `${key}:${String(options.title)}` : key,
  }),
}));

function renderRow(device: DeviceViewModel) {
  return render(
    <table>
      <tbody>
        <DeviceRow device={device} isTerminatePending={false} onTerminateClick={() => {}} />
      </tbody>
    </table>,
  );
}

const baseDevice: DeviceViewModel = {
  deviceId: "device-1",
  ip: "192.168.1.10",
  isCurrent: false,
  lastActiveDate: new Date("2026-04-26T12:00:00Z").toISOString(),
  title: "Chrome on macOS",
};

describe("DeviceRow", () => {
  it("hides terminate button on the current device row", () => {
    renderRow({ ...baseDevice, isCurrent: true });

    expect(screen.queryByRole("button", { name: /terminateOne/i })).toBeNull();
  });

  it("shows terminate button on other device rows", () => {
    renderRow({ ...baseDevice, isCurrent: false });

    expect(screen.getByRole("button", { name: /terminateOne/i })).not.toBeNull();
  });
});
