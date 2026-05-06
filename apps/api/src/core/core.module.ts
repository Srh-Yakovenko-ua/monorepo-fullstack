import { Global, Module } from "@nestjs/common";

import { SecurityModule } from "../modules/user-accounts/security/security.module.js";
import { UsersModule } from "../modules/user-accounts/users/users.module.js";
import { AuthHelper } from "./auth-helper.js";
import { AdminGuard } from "./guards/admin.guard.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "./guards/optional-jwt-auth.guard.js";
import { RefreshSessionGuard } from "./guards/refresh-session.guard.js";

const guardProviders = [AdminGuard, JwtAuthGuard, OptionalJwtAuthGuard, RefreshSessionGuard];

@Global()
@Module({
  exports: [AuthHelper, ...guardProviders],
  imports: [UsersModule, SecurityModule],
  providers: [AuthHelper, ...guardProviders],
})
export class CoreModule {}
