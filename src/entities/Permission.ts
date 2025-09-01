import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Role } from "./Role";

@Entity({ name: "permission" })
@Unique(["role", "access"])
export class Permission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  access: string;

  @Column({ type: "boolean", default: false })
  enabled: boolean;

  @ManyToOne(() => Role, (role) => role.permissions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id" })
  role: Role;

}
