import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { TenantAccount } from "./TenantAccount";

@Entity({ name: "account_contact" })
export class AccountContact {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text", nullable: true })
  contactType?: string;

  @Column({ type: "text", nullable: true })
  contactDetails?: string;

  @Column({ type: "text", nullable: true })
  contactName?: string;

  @Column({ type: "text", nullable: true })
  contactDesignation?: string;

  @ManyToOne(() => TenantAccount, (tenant) => tenant.contacts, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "tenant_id" })
  @Index()
  tenant: TenantAccount;
}
