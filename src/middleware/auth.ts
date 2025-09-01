import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../services/jwt";
import { config } from "../config";
import { createError } from "./errorHandler";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      throw createError(401, "Missing Bearer token");
    }

    const decoded = verifyJwt(token);
    // decoded payload => { sub, email, role, tenantId }
    req.user = decoded;

    const role = (decoded.role || "").toLowerCase();

    // Super Admin, Admin, Tenant bypass tenant header check
    const skipTenantHeader =
      role === "superadmin" || role === "admin" || role === "tenant";

    if (config.enforceTenantHeader && !skipTenantHeader) {
      const tenantHeader = req.headers["x-tenant-id"] as string | undefined;

      if (!tenantHeader) {
        throw createError(
          403,
          "Tenant header required. Provide X-Tenant-Id."
        );
      }
      if (!decoded.tenantId) {
        throw createError(403, "Token missing tenant scope.");
      }
      if (tenantHeader !== decoded.tenantId) {
        throw createError(
          403,
          "Tenant mismatch. Provide correct X-Tenant-Id header."
        );
      }
    }

    // convenience: req.tenantId (header > token fallback)
    req.tenantId =
      (req.headers["x-tenant-id"] as string) || decoded.tenantId || null;

    return next();
  } catch (err) {
    next(createError(401, "Invalid or expired token"));
  }
}
