import express, { Request, Response, NextFunction } from "express";
import { Repository } from "typeorm";
import { AppDataSource } from "../dataSource/data-source";
import { requireAuth } from "../middleware/auth";
import { allowRoles } from "../middleware/roleGuard";
import { createError } from "../middleware/errorHandler";

import { TenantAccount } from "../entities/TenantAccount";
import { AppUser } from "../entities/AppUser";
import { Role } from "../entities/Role";
import { TenantLicense } from "../entities/TenantLicense";
import bcrypt from "bcrypt";

const router = express.Router();

/** Typed Repos */
const TenantRepo = (): Repository<TenantAccount> =>
  AppDataSource.getRepository(TenantAccount);
const UserRepo = (): Repository<AppUser> => AppDataSource.getRepository(AppUser);
const RoleRepo = (): Repository<Role> => AppDataSource.getRepository(Role);
const LicenseRepo = (): Repository<TenantLicense> =>
  AppDataSource.getRepository(TenantLicense);

/** helpers */
async function getRoleOrThrow(name: string): Promise<Role> {
  const r = await RoleRepo().findOne({ where: { name } });
  if (!r) throw createError(400, `Role missing: ${name}`);
  return r;
}

/** ---------------------------------
 *  SuperAdmin Registration
 * -------------------------------- */
router.post(
  "/superadmin",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, userName } = req.body || {};
      if (!email || !password || !userName) {
        throw createError(400, "email, password, userName are required");
      }

      const roleSuper = await getRoleOrThrow("superadmin");

      const existing = await UserRepo()
        .createQueryBuilder("u")
        .where("LOWER(u.email) = LOWER(:email)", { email })
        .andWhere("u.tenant IS NULL")
        .getOne();
      if (existing)
        throw createError(409, "SuperAdmin with this email already exists");

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = UserRepo().create({
        password: hashedPassword,
        userName,
        contactDetails: "",
        contactEmail: email,
        createdBy: null, // ✅ system-created
        enabled: true,
        email,
        roleRef: roleSuper,
        tenant: null,
      });

      await UserRepo().save(newUser);

      return res.status(201).json({
        success: true,
        msg: "SuperAdmin created",
        user: {
          id: newUser.id,
          email: newUser.email,
          tenantId: null,
          enabled: newUser.enabled,
          userName: newUser.userName,
          creationDate: newUser.creationdate,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/** ---------------------------------
 *  Tenant Registration (SuperAdmin only)
 * -------------------------------- */
router.post(
  "/tenant",
  requireAuth,
  allowRoles("superadmin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        accountName,
        email,
        password,
        regAddress = "",
        officialEmail = email,
        officialContactNumber = "",
      } = req.body || {};

      if (!accountName || !email || !password) {
        throw createError(400, "accountName, email, password are required");
      }

      const existingTenant = await TenantRepo().findOne({ where: { email } });
      if (existingTenant) throw createError(400, "Tenant already exists");

      const hashedPassword = await bcrypt.hash(password, 10);

      const tenant = TenantRepo().create({
        accountName,
        regAddress,
        officialEmail,
        officialContactNumber,
        email,
        password: hashedPassword,
      });
      await TenantRepo().save(tenant);

      const roleTenant = await getRoleOrThrow("tenant");
      const creator = await UserRepo().findOne({
        where: { id: req.user?.sub },
      });

      const tenantUser = UserRepo().create({
        password: hashedPassword,
        userName: `${accountName} TenantUser`,
        contactDetails: "",
        contactEmail: email,
        createdBy: creator || null, // ✅ link to creator
        enabled: true,
        email,
        roleRef: roleTenant,
        tenant,
      });
      await UserRepo().save(tenantUser);

      // ✅ Assign default licenses for this tenant
      const defaultLicenses = [
        { role: "admin", maxUsers: 11 },
        { role: "auditor", maxUsers: 11 },
        { role: "agent", maxUsers: 100 },
        { role: "reviewer", maxUsers: 11 },
      ];

      for (const lic of defaultLicenses) {
        const newLic = LicenseRepo().create({
          tenant,
          role: lic.role,
          maxUsers: lic.maxUsers,
          usedUsers: 0,
          active: true,
        });
        await LicenseRepo().save(newLic);
      }

      return res.json({
        success: true,
        msg: "Tenant created with tenant user and default licenses",
        tenant: {
          id: tenant.id,
          accountName: tenant.accountName,
          creationDate: tenant.creationDate,
          regAddress: tenant.regAddress,
          officialEmail: tenant.officialEmail,
          officialContactNumber: tenant.officialContactNumber,
        },
        tenantUser: {
          id: tenantUser.id,
          email: tenantUser.email,
          tenantId: tenant.id,
          enabled: tenantUser.enabled,
          creationDate: tenantUser.creationdate,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/** ---------------------------------
 *  User Registration (Admin/Agent/Auditor/Reviewer)
 * -------------------------------- */
router.post(
  "/user",
  requireAuth,
  allowRoles("tenant", "admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, userName, role } = req.body || {};
      if (!email || !password || !userName || !role) {
        throw createError(400, "email, password, userName, role are required");
      }

      const callerRole = (req.user?.role || "").toLowerCase();
      const newRole = String(role).toLowerCase();

      const isTenant = callerRole === "tenant";
      const isAdmin = callerRole === "admin";

      const allowedForTenant = ["admin", "agent", "auditor", "reviewer"];
      const allowedForAdmin = ["agent", "auditor", "reviewer"];

      if (isTenant && !allowedForTenant.includes(newRole)) {
        throw createError(
          403,
          "Tenant can create only admin/agent/auditor/reviewer"
        );
      }
      if (isAdmin && !allowedForAdmin.includes(newRole)) {
        throw createError(
          403,
          "Admin can create only agent/auditor/reviewer"
        );
      }
      if (["superadmin", "tenant"].includes(newRole)) {
        throw createError(403, "Cannot create superadmin/tenant users here");
      }

      const effectiveTenantId = req.user?.tenantId || null;
      if (!effectiveTenantId)
        throw createError(400, "Caller must be bound to a tenant");

      const effectiveTenant = await TenantRepo().findOne({
        where: { id: effectiveTenantId },
      });
      if (!effectiveTenant) throw createError(404, "Tenant not found");

      // ✅ License check
      const license = await LicenseRepo().findOne({
        where: { tenant: { id: effectiveTenant.id }, role: newRole },
      });
      if (!license || !license.active)
        throw createError(403, `License inactive for role: ${newRole}`);
      if (license.usedUsers >= license.maxUsers)
        throw createError(403, `${newRole} license limit exceeded`);

      const dup = await UserRepo()
        .createQueryBuilder("u")
        .leftJoinAndSelect("u.tenant", "t")
        .where("LOWER(u.email) = LOWER(:email)", { email })
        .andWhere("t.id = :tid", { tid: effectiveTenant.id })
        .getOne();
      if (dup) throw createError(400, "Email already used in this tenant");

      const roleRef = await getRoleOrThrow(newRole);
      const creator = await UserRepo().findOne({
        where: { id: req.user?.sub },
      });

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = UserRepo().create({
        password: hashedPassword,
        userName,
        contactDetails: "",
        contactEmail: email,
        createdBy: creator || null, // ✅ link to creator
        enabled: true,
        email,
        roleRef,
        tenant: effectiveTenant,
      });

      await UserRepo().save(newUser);

      // increment license usage
      license.usedUsers += 1;
      await LicenseRepo().save(license);

      return res.status(201).json({
        success: true,
        msg: "User created",
        user: {
          id: newUser.id,
          email: newUser.email,
          tenantId: effectiveTenant.id,
          enabled: newUser.enabled,
          userName: newUser.userName,
          creationDate: newUser.creationdate,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
