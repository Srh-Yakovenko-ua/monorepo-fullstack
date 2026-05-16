import { type UserRole } from "@app/shared";

export type { UserRole };

export interface UserDoc {
  createdAt: Date;
  email: string;
  emailConfirmationCode: null | string;
  emailConfirmationExpiresAt: Date | null;
  emailIsConfirmed: boolean;
  id: number;
  login: string;
  passwordHash: string;
  passwordRecoveryCode: null | string;
  passwordRecoveryExpiresAt: Date | null;
  role: UserRole;
}
