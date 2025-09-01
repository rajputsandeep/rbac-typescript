import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "token_blacklist" })
export class TokenBlacklist {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text")
  token: string;

  @Column("timestamptz")
  expiresAt: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
