import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { AppUser } from "./AppUser";

@Entity({ name: "password_reset" })
export class PasswordReset {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => AppUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: AppUser;

  @Column("text")
  token: string;

  @Column("timestamptz")
  expiresAt: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Column("boolean", { default: false })
  used: boolean;
}
