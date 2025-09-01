import { config } from './config';
import app from './app';
import { AppDataSource } from './dataSource/data-source';
import { seedRolesOnce } from "./dataSource/roleSeed"
import { seedSuperAdminOnce } from './dataSource/superAdminSeed';

(async () => {
  const ds = await AppDataSource.initialize(); // 👈 yaha DS object aayega
  console.log('✅ DB connected');

  // ✅ Seed roles & superadmin
  await seedRolesOnce(ds);
  await seedSuperAdminOnce(ds);
  console.log('✅ Roles & SuperAdmin ensured');

  // ✅ Start server
  app.listen(config.port, () => {
    console.log(`🚀 API listening on http://localhost:${config.port}`);
  });
})().catch(err => {
  console.error('Boot error:', err);
  process.exit(1);
});
