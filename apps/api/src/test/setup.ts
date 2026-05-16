import { afterEach } from "vitest";

import { resetAuthThrottler } from "../core/auth-throttler-storage.js";

afterEach(() => {
  resetAuthThrottler();
});
