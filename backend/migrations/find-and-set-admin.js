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

    const db = mongoose.connection.db;
    
    // Search for vz4sheezy
    console.log('\n🔍 Searching for vz4sheezy in users collection...');
    const user = await db.collection('users').findOne({ username: 'vz4sheezy' });

    if (!user) {
      console.error('\n❌ User "vz4sheezy" not found in production database');
      
      // List all usernames to help debug
      const allUsers = await db.collection('users').find({}, { projection: { username: 1 } }).toArray();
      console.log('\n📋 All users in database:');
      allUsers.sort((a, b) => a.username.localeCompare(b.username)).forEach(u => console.log(`  - ${u.username}`));
      
      process.exit(1);
    }

    console.log('\n✅ Found user:');
    console.log('   ID:', user._id);
    console.log('   Username:', user.username);
    console.log('   Email:', user.email);
    console.log('   Current isAdmin:', user.isAdmin || false);

    if (user.isAdmin === true) {
      console.log('\n✅ User already has isAdmin = true');
      process.exit(0);
    }

    // Set isAdmin to true
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { isAdmin: true, adminSince: new Date() } }
    );

    if (result.modifiedCount === 1) {
      console.log('\n🔧 Updated user record');
      
      // Verify
      const updated = await db.collection('users').findOne({ _id: user._id });
      console.log('\n✅ Verification - after update:');
      console.log('   isAdmin:', updated.isAdmin);
      console.log('   adminSince:', updated.adminSince);
      
      process.exit(0);
    } else {
      console.error('\n❌ Update failed');
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
