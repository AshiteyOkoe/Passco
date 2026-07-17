import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User';

const SEED_USERS = [
  {
    name: 'Test Student',
    email: 'test@test.com',
    password: 'password123',
    role: 'student' as const,
    institution: 'PASSCO Academy',
    gradeLevel: 'JHS 3',
    dateOfBirth: new Date('2008-07-15'),
  },
  {
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin' as const,
    institution: 'PASSCO Academy',
    gradeLevel: '',
    dateOfBirth: new Date('1990-03-10'),
  },
];

export async function seedUsers(): Promise<void> {
  for (const userData of SEED_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) continue;

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    await User.create({ ...userData, password: hashedPassword });
    console.log(`  Seeded: ${userData.email} [${userData.role}]`);
  }
}

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/passco';

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('Connected to MongoDB');
  } catch {
    console.log('Local MongoDB not available, trying in-memory...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memServer = await MongoMemoryServer.create();
    await mongoose.connect(memServer.getUri());
    console.log('Connected to in-memory MongoDB');
  }

  await seedUsers();

  console.log('\nSeed complete.');
  await mongoose.disconnect();
  process.exit(0);
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}