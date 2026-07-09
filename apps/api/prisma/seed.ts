import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  const hash = await bcrypt.hash('admin123', 12);

  const bruno = await db.systemUser.upsert({
    where: { email: 'brunoantunes94@hotmail.com' },
    update: {},
    create: {
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
