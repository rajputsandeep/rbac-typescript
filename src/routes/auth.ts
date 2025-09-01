import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { signJwt } from "../services/jwt";
import { findAuthSubject } from "../services/auth";
import { AppDataSource } from "../dataSource/data-source";
import {
  createAndSendChallenge,
  resendChallenge,
  verifyChallenge,
} from "../services/twofa";
import { createError } from "../middleware/errorHandler";

import bcrypt from "bcrypt";
import crypto from "crypto";
import { AppUser } from "../entities/AppUser";
import { PasswordReset } from "../entities/PasswordReset";

import { send2FACode } from "../services/mailer";

const UserRepo = () => AppDataSource.getRepository(AppUser);
const ResetRepo = () => AppDataSource.getRepository(PasswordReset);

const router = express.Router();

/** ------------------------
 * Zod Schemas
 * ------------------------ */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const verifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().min(4).max(10),
});

const resendSchema = z.object({
  challengeId: z.string().uuid(),
});

/**
 * STEP 1: Login with credentials -> issue a 2FA challenge
 */
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw createError(400, "Invalid payload", parsed.error.flatten());
      }
      const { email, password } = parsed.data;

      // 1) validate credentials
      const subject = await findAuthSubject(email, password);
      // subject will now include roleRef: { id, name }
      if (!subject) {
        throw createError(401, "Invalid credentials");
      }

      // 2) create & send challenge
      const ip =
        (req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
          req.ip) ?? null;
      const userAgent = req.get("user-agent") || null;

      const { challengeId, expiresAt } = await createAndSendChallenge({
        userId: subject.id,
        email: subject.email,
          role: subject.type, // ✅ from roleRef
        tenantId: subject.tenantId ?? null,
        ip,
        userAgent,
        ttlMinutes: 10,
      });

      return res.json({
        success: true,
        msg: "Verification code sent to your email",
        challengeId,
        expiresAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * STEP 1b: Resend 2FA challenge
 */
router.post(
  "/2fa/resend",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = resendSchema.safeParse(req.body);
      if (!parsed.success) {
        throw createError(400, "Invalid payload", parsed.error.flatten());
      }
      const { challengeId } = parsed.data;

      const out = await resendChallenge(challengeId);
      return res.json({
        success: true,
        msg: "Code resent",
        ...out,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * STEP 2: Verify 2FA code -> Issue JWT
 */
router.post(
  "/2fa/verify",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success) {
        throw createError(400, "Invalid payload", parsed.error.flatten());
      }
      const { challengeId, code } = parsed.data;

      const result = await verifyChallenge({ challengeId, code });
      if (!result.ok) {
        throw createError(400, result.error || "Invalid code");
      }

      // ✅ Build JWT with roleRef data
      const payload = {
        sub: result.userId,
        email: result.email,
        role: result.role,       // roleRef.name saved in challenge
        tenantId: result.tenantId ?? null,
      };
      const token = signJwt(payload);

      // update last-login metadata (best effort)
      try {
        if (result.role !== "tenant") {
          await AppDataSource.createQueryBuilder()
            .update("app_user")
            .set({
              last_login_at: () => "NOW()",
              last_login_ip: "", // TODO: add ip
              last_login_user_agent: "", // TODO: add ua
            })
            .where(`"id" = :uid`, { uid: result.userId })
            .execute();

          await AppDataSource.createQueryBuilder()
            .update("app_user")
            .set({ login_count: () => "COALESCE(login_count,0) + 1" })
            .where(`"id" = :uid`, { uid: result.userId })
            .execute();
        }
      } catch (e) {
        console.warn("⚠️ login metadata update skipped:", e);
      }

      return res.json({
        success: true,
        token,
        payload,
      });
    } catch (err) {
      next(err);
    }
  }
);

/** Forgot password */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await UserRepo().findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    const reset = ResetRepo().create({ user, token, expiresAt: expires });
    await ResetRepo().save(reset);

    await send2FACode({
      to: email,
      code: `Reset token: ${token}`,
    });

    return res.json({
      success: true,
      msg: "Password reset instructions sent",
    });
  } catch (err) {
    next(err);
  }
});

/** Reset password */
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res
        .status(400)
        .json({ error: "token and newPassword required" });

    const reset = await ResetRepo().findOne({
      where: { token },
      relations: ["user"],
    });
    if (!reset || reset.used)
      return res.status(400).json({ error: "Invalid or used token" });
    if (new Date(reset.expiresAt).getTime() < Date.now())
      return res.status(400).json({ error: "Token expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    reset.user.password = hashedPassword;
    await UserRepo().save(reset.user);

    reset.used = true;
    await ResetRepo().save(reset);

    return res.json({ success: true, msg: "Password reset successful" });
  } catch (err) {
    next(err);
  }
});

export default router;
