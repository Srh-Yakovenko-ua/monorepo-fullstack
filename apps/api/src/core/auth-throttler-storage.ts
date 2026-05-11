import { ThrottlerStorageService } from "@nestjs/throttler";

export const authThrottlerStorage = new ThrottlerStorageService();

export function resetAuthThrottler(): void {
  authThrottlerStorage.storage.clear();
}
