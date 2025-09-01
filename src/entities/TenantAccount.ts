import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from "typeorm";
import { AccountContact } from "./AccountContact";
import { AppUser } from "./AppUser";
@Entity({ name: "tenant_account" })
export class TenantAccount {
  @PrimaryGeneratedColumn("uuid")   
  id: string;

  @Column({ type: "text" })
  accountName: string;

  @CreateDateColumn({ type: "timestamptz" })
  creationDate: Date;

  @Column({ type: "text", nullable: true })
  regAddress?: string;

  @Column({ type: "text", nullable: true })
  officialEmail?: string;

  @Column({ type: "text", nullable: true })
  officialContactNumber?: string;

  @Column({ type: "text", nullable: true })
  email?: string;

  @Column({ type: "text", nullable: true })
  password?: string;

  @OneToMany(() => AccountContact, (contact) => contact.tenant)
  contacts: AccountContact[];

  @OneToMany(() => AppUser, (AppUser) => AppUser.tenant)
  AppUsers: AppUser[];
}
