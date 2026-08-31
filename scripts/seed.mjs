import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  const email = 'auditor@example.com';
  const password = 'AuditPass123!';
  const name = 'Lead Financial Auditor';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ Demo user already exists: ${email}`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
    },
  });

  console.log(`✅ Demo user created: ${email} / ${password}`);
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
