import { Global, Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

import { SecurityModule } from "../modules/user-accounts/security/security.module.js";
import { UsersModule } from "../modules/user-accounts/users/users.module.js";
import { AuthHelper } from "./auth-helper.js";
import { authThrottlerStorage } from "./auth-throttler-storage.js";
import { AdminGuard } from "./guards/admin.guard.js";
import { AuthThrottlerGuard } from "./guards/auth-throttler.guard.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "./guards/optional-jwt-auth.guard.js";
import { RefreshSessionGuard } from "./guards/refresh-session.guard.js";
import { SuperAdminGuard } from "./guards/super-admin.guard.js";

const AUTH_THROTTLE_LIMIT = 5;
const AUTH_THROTTLE_TTL_MS = 10_000;

const guardProviders = [
  AdminGuard,
  AuthThrottlerGuard,
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RefreshSessionGuard,
  SuperAdminGuard,
];

@Global()
@Module({
  exports: [AuthHelper, ...guardProviders],
  imports: [
    UsersModule,
    SecurityModule,
    ThrottlerModule.forRoot({
      storage: authThrottlerStorage,
      throttlers: [{ limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS }],
    }),
  ],
  providers: [AuthHelper, ...guardProviders],
})
export class CoreModule {}
