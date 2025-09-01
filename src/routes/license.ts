import express from "express";
import { AppDataSource } from "../dataSource/data-source";
import { requireAuth } from "../middleware/auth";
import { allowRoles } from "../middleware/roleGuard";
import { TenantLicense } from "../entities/TenantLicense";

const router = express.Router();
const LicenseRepo = () => AppDataSource.getRepository(TenantLicense);

// Get all licenses for a tenant
router.get("/:tenantId", requireAuth, allowRoles("superadmin"), async (req, res) => {
  const { tenantId } = req.params;
  const licenses = await LicenseRepo().find({
    where: { tenant: { id: tenantId } },
  });
  res.json(licenses);
});

// Update license for a role
// ✅ Bulk Update Licenses (SuperAdmin only)
router.put("/:tenantId", requireAuth, allowRoles("superadmin"), async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { licenses } = req.body; // { admin: 20, reviewer: 15 }

    if (!licenses || typeof licenses !== "object") {
      return res.status(400).json({ error: "licenses object required" });
    }

    const updated: any[] = [];

    for (const [role, maxUsers] of Object.entries(licenses)) {
      let license = await LicenseRepo().findOne({
        where: { tenant: { id: tenantId }, role: role.toLowerCase() },
      });

      if (!license) {
        return res.status(404).json({ error: `License not found for role: ${role}` });
      }

      license.maxUsers = Number(maxUsers);
      await LicenseRepo().save(license);

      // 👇 only minimal info return
      updated.push({
        id: license.id,
        role: license.role,
        maxUsers: license.maxUsers,
        usedUsers: license.usedUsers,
        active: license.active,
      });
    }

    res.json({ success: true, msg: "Licenses updated", licenses: updated });
  } catch (err) {
    next(err);
  }
});


export default router;
