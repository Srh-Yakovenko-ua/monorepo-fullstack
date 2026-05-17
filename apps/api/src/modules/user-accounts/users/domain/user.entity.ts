import { USER_ROLES, type UserRole } from "@app/shared";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

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

@Entity({ name: "users" })
export class UserEntity {
  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "text", unique: true })
  email!: string;

  @Column({ nullable: true, type: "text" })
  @Index("users_email_confirmation_code_idx", { where: '"email_confirmation_code" IS NOT NULL' })
  emailConfirmationCode!: null | string;

  @Column({ nullable: true, type: "timestamptz" })
  emailConfirmationExpiresAt!: Date | null;

  @Column({ default: true, type: "boolean" })
  emailIsConfirmed!: boolean;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ type: "text", unique: true })
  login!: string;

  @Column({ type: "text" })
  passwordHash!: string;

  @Column({ nullable: true, type: "text" })
  @Index("users_password_recovery_code_idx", { where: '"password_recovery_code" IS NOT NULL' })
  passwordRecoveryCode!: null | string;

  @Column({ nullable: true, type: "timestamptz" })
  passwordRecoveryExpiresAt!: Date | null;

  @Column({ default: "user", enum: USER_ROLES, type: "enum" })
  role!: UserRole;
}
