import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { SecurityModule } from "./security/security.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  exports: [AuthModule, SecurityModule, UsersModule],
  imports: [AuthModule, SecurityModule, UsersModule],
})
export class UserAccountsModule {}
