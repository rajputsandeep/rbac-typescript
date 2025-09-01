import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Permission } from "./Permission";
import { AppUser } from "./AppUser";

@Entity({ name: "role" })
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id: string;   // UUID instead of role string

  @Column({ type: "text", unique: true })
  name: string; // "superadmin" | "tenant" | "admin" | etc.

  @Column({ type: "text" })
  label: string; // Human friendly name e.g. "Super Admin"

  @CreateDateColumn({ type: "timestamptz" })
  creationdate: Date;

  @Column({ type: "text", nullable: true })
  createdby?: string;

  @OneToMany(() => Permission, (perm) => perm.role)
  permissions: Permission[];

  @OneToMany(() => AppUser, (user) => user.roleRef)
  users: AppUser[];
}
