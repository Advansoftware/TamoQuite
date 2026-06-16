import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  const hash = await bcrypt.hash('admin123', 12);

  const bruno = await db.systemUser.create({
    data: {
      email: 'brunoantunes94@hotmail.com',
      name: 'Bruno Antunes',
      passwordHash: hash,
      role: 'ADMIN',
      mustChangePassword: true,
      isActive: true,
    },
  });

  console.log(`✅ Admin user created: ${bruno.email}`);
  console.log('🔑 Default password: admin123 (must change on first login)');
  console.log('🌱 Seed complete!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });