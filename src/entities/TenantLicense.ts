import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";
import { TenantAccount } from "./TenantAccount";

@Entity({ name: "tenant_license" })
@Unique(["tenant", "role"])  // ek tenant ke liye ek role ka ek hi license
export class TenantLicense {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => TenantAccount, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: TenantAccount;

  @Column("text")
  role: string; // admin | agent | auditor | reviewer

  @Column("int", { default: 0 })
  maxUsers: number;

  @Column("int", { default: 0 })
  usedUsers: number;

  @Column("boolean", { default: true })
  active: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
