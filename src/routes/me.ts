import express, { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../dataSource/data-source";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

import { AppUser } from "../entities/AppUser";
import { TenantAccount } from "../entities/TenantAccount";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";

const router = express.Router();

/** Repositories */
const UserRepo = () => AppDataSource.getRepository(AppUser);
const TenantRepo = () => AppDataSource.getRepository(TenantAccount);
const RoleRepo = () => AppDataSource.getRepository(Role);
const PermissionRepo = () => AppDataSource.getRepository(Permission);

router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sub: userId, role, tenantId, email } = req.user || {};
      const roleNorm = (role || "").toLowerCase();

      /** ------------------ SUPER ADMIN ------------------ */
      if (roleNorm === "superadmin") {
        const superAdmin = await UserRepo().findOne({
          where: { email },
          relations: ["tenant", "roleRef", "createdBy"],
        });

        const tenants = await TenantRepo().find();

        return res.json({
          success: true,
          role: "superadmin",
          superAdmin: superAdmin
            ? {
                id: superAdmin.id,
                email: superAdmin.email,
                userName: superAdmin.userName,
                tenantId: superAdmin.tenant ? superAdmin.tenant.id : null,
                enabled: superAdmin.enabled,
                creationDate: superAdmin.creationdate,
                createdBy: superAdmin.createdBy
                  ? {
                      id: superAdmin.createdBy.id,
                      email: superAdmin.createdBy.email,
                      userName: superAdmin.createdBy.userName,
                    }
                  : null,
              }
            : {
                id: "superadmin",
                accountName: "System SuperAdmin",
                email,
              },
          tenants: tenants.map((t) => ({
            id: t.id,
            accountName: t.accountName,
            creationDate: t.creationDate,
            regAddress: t.regAddress,
            officialEmail: t.officialEmail,
            officialContactNumber: t.officialContactNumber,
          })),
        });
      }

      /** ------------------ TENANT LOGIN ------------------ */
      if (roleNorm === "tenant") {
        const tenant = await TenantRepo().findOne({ where: { id: tenantId } });
        if (!tenant) throw createError(404, "Tenant not found");

        // ❌ exclude tenant role user
        const users = await UserRepo().find({
          where: { tenant: { id: tenant.id } },
          relations: ["roleRef", "createdBy"],
        });

        return res.json({
          success: true,
          role: "tenant",
          tenant: {
            id: tenant.id,
            accountName: tenant.accountName,
            creationDate: tenant.creationDate,
            regAddress: tenant.regAddress,
            officialEmail: tenant.officialEmail,
            officialContactNumber: tenant.officialContactNumber,
          },
          users: users
            .filter((u) => u.roleRef?.name !== "tenant") // ✅ tenant user hide
            .map((u) => ({
              id: u.id,
              email: u.email,
              role: u.roleRef?.name || "unknown",
              userName: u.userName,
              enabled: u.enabled,
              creationDate: u.creationdate,
              createdBy: u.createdBy
                ? {
                    id: u.createdBy.id,
                    email: u.createdBy.email,
                    userName: u.createdBy.userName,
                  }
                : null,
            })),
        });
      }

      /** ------------------ END USERS (Admin/Agent/etc) ------------------ */
      const user = await UserRepo().findOne({
        where: [{ id: userId || "" }, { email: email || "" }],
        relations: ["tenant", "roleRef", "createdBy"],
      });
      if (!user) throw createError(404, "User not found");

      const roleId = user.roleRef?.id;
      const roleName = user.roleRef?.name || "unknown";

      const permissions = await PermissionRepo().find({
        where: { role: { id: roleId } },
        relations: ["role"],
      });

      const base: any = {
        id: user.id,
        email: user.email,
        role: roleName,
        roleId,
        tenant: user.tenant
          ? {
              id: user.tenant.id,
              accountName: user.tenant.accountName,
              creationDate: user.tenant.creationDate,
              regAddress: user.tenant.regAddress,
              officialEmail: user.tenant.officialEmail,
              officialContactNumber: user.tenant.officialContactNumber,
            }
          : null,
        enabled: user.enabled,
        userName: user.userName,
        creationDate: user.creationdate,
        createdBy: user.createdBy
          ? {
              id: user.createdBy.id,
              email: user.createdBy.email,
              userName: user.createdBy.userName,
            }
          : null,
        permissions: permissions.map((p) => ({
          access: p.access,
          enabled: p.enabled,
        })),
      };

      // If Admin → include other users (exclude tenant & self)
      if (roleName === "admin" && user.tenant) {
        const tenantUsers = await UserRepo().find({
          where: { tenant: { id: user.tenant.id } },
          relations: ["roleRef", "createdBy"],
        });

        base.tenantUsers = tenantUsers
          .filter((u) => u.id !== user.id && u.roleRef?.name !== "tenant") // ✅ exclude self & tenant user
          .map((u) => ({
            id: u.id,
            email: u.email,
            role: u.roleRef?.name || "unknown",
            userName: u.userName,
            enabled: u.enabled,
            creationDate: u.creationdate,
            createdBy: u.createdBy
              ? {
                  id: u.createdBy.id,
                  email: u.createdBy.email,
                  userName: u.createdBy.userName,
                }
              : null,
          }));
      }

      return res.json({ success: true, ...base });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
