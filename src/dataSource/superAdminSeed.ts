import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";

export async function seedSuperAdminOnce(ds: DataSource) {
  const hashedPassword = await bcrypt.hash("Password@123", 10);

  // Superadmin role fetch karo
  const role = await ds.query(
    `SELECT id FROM role WHERE name = $1 LIMIT 1`,
    ["superadmin"]
  );
  if (!role || role.length === 0) {
    throw new Error("⚠️ Superadmin role not seeded yet");
  }
  const roleId = role[0].id;

 await ds.query(
  `
  INSERT INTO "app_user"
    ("password","userName","contactDetails","contactEmail",
     "creationdate","enabled","email","role_id","tenant_id","createdby_id")
  VALUES
    ($1,$2,$3,$4,NOW(),true,$5,$6,NULL,NULL)
  ON CONFLICT ("email") DO NOTHING
  `,
  [
    hashedPassword,
    "Seed SuperAdmin",
    "",
    "superadmin@example.com",
    "superadmin@example.com",
    roleId,
  ]
);


  console.log("✅ SuperAdmin seeded successfully");
}
