import { AppDataSource } from "../dataSource/data-source";
import { AppUser } from "../entities/AppUser";
import { TenantAccount } from "../entities/TenantAccount";
import { createError } from "../middleware/errorHandler";
import bcrypt from "bcrypt";

/** AuthSubject returned after verifying credentials */
export interface AuthSubject {
  id: string;
  email: string;
  type: string; // "superadmin" | "tenant" | "admin" | "agent" | ...
  tenantId?: string | null;
  userName?: string | null;
  roleId?: string; // ✅ UUID for role
}

/**
 * DB-first authentication:
 *  - app_user → covers superadmin / tenant / admin / agent / auditor / reviewer
 *  - tenant_account → fallback for tenant login
 *
 * Returns: { id, email, type, tenantId?, userName?, roleId? }
 */
export async function findAuthSubject(
  email: string,
  password: string
): Promise<AuthSubject | null> {
  if (!email || !password) return null;
  const e = (email || "").toLowerCase().trim();

  if (!AppDataSource?.isInitialized) {
    throw createError(500, "DB not initialized");
  }

  const userRepo = AppDataSource.getRepository(AppUser);
  const tenantRepo = AppDataSource.getRepository(TenantAccount);

  // --- 1) Try AppUser ---
  const dbUser = await userRepo
    .createQueryBuilder("u")
    .leftJoinAndSelect("u.roleRef", "r")
    .leftJoinAndSelect("u.tenant", "t")
    .where("LOWER(u.email) = LOWER(:email)", { email: e })
    .getOne();

  if (dbUser && dbUser.enabled) {
    // ⚠️ SECURITY: compare with bcrypt hash
    const isValid = await bcrypt.compare(password, dbUser.password);
    if (!isValid) return null;

    // ✅ use roleRef.name and roleRef.id instead of old string column
    const type = dbUser.roleRef?.name?.toLowerCase() || "user";

    return {
      id: dbUser.id,
      email: dbUser.email,
      type, // e.g. "superadmin" | "tenant" | "admin" ...
      tenantId: dbUser.tenant ? dbUser.tenant.id : null,
      userName: dbUser.userName || null,
      roleId: dbUser.roleRef?.id, // UUID
    };
  }

  // --- 2) TenantAccount fallback ---
  const dbTenant = await tenantRepo
    .createQueryBuilder("t")
    .where("LOWER(t.email) = LOWER(:email)", { email: e })
    .getOne();

  if (dbTenant) {
    const isValid = await bcrypt.compare(password, dbTenant.password || "");
    if (!isValid) return null;

    return {
      id: dbTenant.id,
      email: dbTenant.email || "",
      type: "tenant",
      tenantId: dbTenant.id,
      userName: dbTenant.accountName,
    };
  }

  return null;
}
