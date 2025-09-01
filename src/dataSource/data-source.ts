import "reflect-metadata";
import { DataSource } from "typeorm";
import { TenantAccount } from "../entities/TenantAccount";
import { AccountContact } from "../entities/AccountContact";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";
import { AppUser } from "../entities/AppUser";
import { TwoFactor } from "../entities/TwoFactor";
import { TenantLicense } from "../entities/TenantLicense";
import { PasswordReset } from "../entities/PasswordReset";
import { TokenBlacklist } from "../entities/TokenBlacklisted";
import { config } from "../config";
const isProd = process.env.NODE_ENV === 'production';
const wantSSL = (process.env.DB_SSL || '').toLowerCase() === 'true' || isProd;

export const AppDataSource = new DataSource({
  type: "postgres",
   url:config.url,
  // host: process.env.DB_HOST || "localhost",
  // port: Number(process.env.DB_PORT) || 5432,
  // username: process.env.DB_USER || "postgres",
  // password: process.env.DB_PASS || "22041992",
  // database: process.env.DB_NAME || "typesynthora",

  entities: [TenantAccount, AccountContact, Role, Permission, AppUser,TwoFactor, TenantLicense, PasswordReset,TokenBlacklist ],
  migrations: [__dirname + "/migrations/*.{ts,js}"],

  // ⚡ Development mode
  synchronize: process.env.NODE_ENV !== "production",

  // helpful for debugging
  logging: process.env.NODE_ENV !== "production",
 ssl: wantSSL ? { rejectUnauthorized: true } : false,
  extra: {
    max: Number(process.env.DB_MAX || 10),
    connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT || 5000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT || 10000),
    ...(wantSSL ? { ssl: { rejectUnauthorized: true } } : {}),
  },

});
