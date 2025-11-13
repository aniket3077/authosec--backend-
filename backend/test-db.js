// Test database connection with Prisma
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testing Supabase + Prisma connection...\n');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');
    
    // Check if tables exist
    const users = await prisma.user.findMany({ take: 5 });
    console.log(`📊 Found ${users.length} users in database`);
    
    if (users.length > 0) {
      console.log('   Sample user:', users[0]);
    }
    
    const posts = await prisma.post.findMany({ take: 5 });
    console.log(`📝 Found ${posts.length} posts in database\n`);
    
    if (posts.length > 0) {
      console.log('   Sample post:', posts[0]);
    }
    
    console.log('\n✨ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n💡 Tip: Check your DATABASE_URL in .env file');
    } else if (error.code === 'P1017') {
      console.error('\n💡 Tip: Run "npx prisma db push" to create tables');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
