import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Role } from "./Role";
import { TenantAccount } from "./TenantAccount";

@Entity({ name: "app_user" })
export class AppUser {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text")
  password: string;

  @Column("text", { nullable: true })
  userName: string;

  @Column("text", { nullable: true })
  contactDetails: string;

  @Column("text", { nullable: true })
  contactEmail: string;

  @CreateDateColumn({ type: "timestamptz" })
  creationdate: Date;

  // ✅ createdBy relation
  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: "createdby_id" })
  createdBy?: AppUser;

  @Column("boolean", { default: true })
  enabled: boolean;

  @Column("text", { unique: true })
  email: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: "role_id" })
  roleRef: Role;

  @ManyToOne(() => TenantAccount, { nullable: true, onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "tenant_id" })
  tenant?: TenantAccount;
}
