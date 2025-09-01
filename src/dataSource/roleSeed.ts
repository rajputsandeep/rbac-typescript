// import { DataSource } from "typeorm";

// export async function seedRolesOnce(ds: DataSource) {
//   await ds.query(`
//     INSERT INTO "role" ("id","name","createdby")
//     VALUES
//       ('superadmin','Super Admin',NULL),
//       ('tenant','Tenant',NULL),
//       ('admin','Admin',NULL),
//       ('user','User',NULL),
//       ('agent','Agent',NULL),
//       ('auditor','Auditor',NULL),
//       ('reviewer','Reviewer',NULL)
//     ON CONFLICT ("id") DO NOTHING
//   `);
// }
import { DataSource } from "typeorm";
import { Role } from "../entities/Role";

export async function seedRolesOnce(ds: DataSource) {
  const roleRepo = ds.getRepository(Role);

  const roles = [
    { name: "superadmin", label: "Super Admin" },
    { name: "tenant", label: "Tenant" },
    { name: "admin", label: "Administrator" },
    { name: "agent", label: "Agent" },
    { name: "auditor", label: "Auditor" },
    { name: "reviewer", label: "Reviewer" },
  ];

  for (const r of roles) {
    const existing = await roleRepo.findOne({ where: { name: r.name } });
    if (!existing) {
      const role = roleRepo.create({
        name: r.name,
        label: r.label,
        createdby: "system",
      });
      await roleRepo.save(role);
    }
  }
}
