require('dotenv').config({ path: '/Users/bojackson/ProjectX/backend/.env' });
const mongoose = require('mongoose');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env file');
    process.exit(1);
  }

  console.log('📡 Connecting to MongoDB...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Host: ${mongoose.connection.host}`);

    const db = mongoose.connection.db;
    
    // Get all users
    const users = await db.collection('users').find({}, { projection: { username: 1, email: 1, isAdmin: 1 } }).toArray();
    
    console.log(`\n📋 Total users in database: ${users.length}`);
    console.log('\n🔍 Listing all users:\n');
    
    for (const user of users) {
      const adminStatus = user.isAdmin ? 'ADMIN' : 'user';
      console.log(`  - ${user.username} (${adminStatus}): id=${user._id}, email=${user.email}`);
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    
    if (err.message.includes('ENOTFOUND') || err.message.includes('ETIMEDOUT')) {
      console.log('\n💡 Tip: The MongoDB hostname in MONGODB_URI might be incorrect.');
      console.log('   Please get the correct URI from your Render dashboard → Environment variables');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
