require('dotenv').config({ path: '/Users/bojackson/ProjectX/backend/.env' });
const mongoose = require('mongoose');

async function verify() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env file');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Verify vz4sheezy
    const user = await db.collection('users').findOne({
      username: 'vz4sheezy'
    });

    if (!user) {
      console.error('❌ User "vz4sheezy" not found');
      process.exit(1);
    }

    console.log('📋 Verification for vz4sheezy:');
    console.log('   ID:', user._id);
    console.log('   Username:', user.username);
    console.log('   isAdmin:', user.isAdmin);
    console.log('   adminSince:', user.adminUntil ? 'null' : (user.adminSince || 'not set'));
    
    if (user.isAdmin === true) {
      console.log('\n✅ VERIFICATION PASSED - vz4sheezy has admin access');
    } else {
      console.log('\n❌ FAILED - isAdmin is not true');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verify();
