import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity({ name: "two_factor" })
export class TwoFactor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // app_user.id OR 'superadmin' for tenant_account flow
  @Column({ type: "text" })
  @Index()
  userId: string;

  @Column({ type: "text" })
  @Index()
  email: string;

  // prototype: plain 6-digit, in production hash this
  @Column({ type: "text" })
  code: string;

  @Column({ type: "timestamptz" })
  expiresAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  consumedAt?: Date;

  @Column({ type: "int", default: 0 })
  attempts: number;

  @Column({ type: "text", default: "login" })
  purpose: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Column({ type: "timestamptz", default: () => "now()" })
  lastSentAt: Date;

  @Column({ type: "text", nullable: true })
  tenantId?: string | null; // null for superAdmin

  @Column({ type: "text", nullable: true })
  role?: string | null; // snapshot for convenience

  @Column({ type: "text", nullable: true })
  ip?: string | null; // audit

  @Column({ type: "text", nullable: true })
  userAgent?: string | null; // audit
}
