/**
 * Database Migration Script
 * Adds Firebase columns and makes Clerk columns nullable
 * Run with: npx tsx scripts/migrate-database.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Starting database migration...\n');

  try {
    // Step 1: Add firebase_uid column
    console.log('1️⃣  Adding firebase_uid column...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255);
    `);
    console.log('   ✅ firebase_uid column added\n');

    // Step 2: Add firebase_org_id column to companies
    console.log('2️⃣  Adding firebase_org_id column to companies...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS firebase_org_id VARCHAR(255);
    `);
    console.log('   ✅ firebase_org_id column added\n');

    // Step 3: Make clerk_id nullable
    console.log('3️⃣  Making clerk_id nullable...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ALTER COLUMN clerk_id DROP NOT NULL;
    `);
    console.log('   ✅ clerk_id is now nullable\n');

    // Step 4: Make clerk_org_id nullable
    console.log('4️⃣  Making clerk_org_id nullable in companies...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE companies 
      ALTER COLUMN clerk_org_id DROP NOT NULL;
    `);
    console.log('   ✅ clerk_org_id is now nullable\n');

    // Step 5: Create unique index on firebase_uid
    console.log('5️⃣  Creating unique index on firebase_uid...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_key 
      ON users(firebase_uid) 
      WHERE firebase_uid IS NOT NULL;
    `);
    console.log('   ✅ Unique index created\n');

    // Step 6: Create index on firebase_uid
    console.log('6️⃣  Creating index on firebase_uid...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS users_firebase_uid_idx 
      ON users(firebase_uid) 
      WHERE firebase_uid IS NOT NULL;
    `);
    console.log('   ✅ Index created\n');

    // Step 7: Create unique index on firebase_org_id
    console.log('7️⃣  Creating unique index on firebase_org_id...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS companies_firebase_org_id_key 
      ON companies(firebase_org_id) 
      WHERE firebase_org_id IS NOT NULL;
    `);
    console.log('   ✅ Unique index created\n');

    // Verify migration
    console.log('8️⃣  Verifying migration...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('firebase_uid', 'clerk_id')
      ORDER BY column_name;
    `;
    console.log('   Migration results:', result);

    console.log('\n✅ Migration completed successfully! 🎉');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart the backend: npm start');
    console.log('   2. Try logging in again');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
