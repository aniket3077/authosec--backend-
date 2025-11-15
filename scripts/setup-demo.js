/**
 * Complete demo setup script
 * 1. Clears Firebase users
 * 2. Creates Firebase demo users
 * 3. Instructions for database seeding
 */

const { exec } = require('child_process');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

async function runScript(scriptPath, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 ${description}`);
  console.log('='.repeat(60) + '\n');
  
  return new Promise((resolve, reject) => {
    const process = exec(`node "${scriptPath}"`, { cwd: path.dirname(scriptPath) });
    
    process.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

async function setupDemo() {
  console.log('\n' + '█'.repeat(60));
  console.log('█' + ' '.repeat(58) + '█');
  console.log('█' + '  🔐 AUTHOSEC DEMO DATA SETUP  '.padEnd(58) + '█');
  console.log('█' + ' '.repeat(58) + '█');
  console.log('█'.repeat(60) + '\n');

  try {
    // Step 1: Clear Firebase users
    console.log('📝 Step 1: Clear existing Firebase users');
    await runScript(
      path.join(__dirname, 'clear-firebase-users.js'),
      'Clearing Firebase Authentication users'
    );

    // Step 2: Create Firebase demo users
    console.log('\n📝 Step 2: Create Firebase demo users');
    await runScript(
      path.join(__dirname, 'create-firebase-users.js'),
      'Creating Firebase demo users'
    );

    // Step 3: Database instructions
    console.log('\n' + '='.repeat(60));
    console.log('📝 Step 3: Database Setup (Manual)');
    console.log('='.repeat(60) + '\n');
    
    console.log('Please run the following SQL scripts in your Supabase SQL Editor:\n');
    console.log('1️⃣  Clear Database:');
    console.log('   File: scripts/clear-database.sql');
    console.log('   Or run: psql $DATABASE_URL -f scripts/clear-database.sql\n');
    
    console.log('2️⃣  Seed Demo Data:');
    console.log('   File: scripts/seed-demo-data.sql');
    console.log('   Or run: psql $DATABASE_URL -f scripts/seed-demo-data.sql\n');

    console.log('='.repeat(60));
    console.log('✅ Firebase setup complete!');
    console.log('📋 Complete database setup to finish demo data installation');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupDemo();
