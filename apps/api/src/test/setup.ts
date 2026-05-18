import { afterEach, vi } from "vitest";

import { resetAuthThrottler } from "../core/auth-throttler-storage.js";

vi.mock("../core/mailer.js", () => ({
  sendEmail: vi.fn(async () => undefined),
}));

afterEach(() => {
  resetAuthThrottler();
});
