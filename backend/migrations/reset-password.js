require('dotenv').config({ path: '/Users/bojackson/ProjectX/backend/.env' });
const mongoose = require('mongoose');

// Pre-hashed password for 'CyberDope2026' using bcryptjs
// Generated with: bcrypt.hash('CyberDope2026', 10)
const NEW_HASHED_PASSWORD = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJ/VdCmgqNe';

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env file');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Get the user
    const user = await db.collection('users').findOne({ username: 'vz4sheezy' });
    
    if (!user) {
      console.error('❌ User "vz4sheezy" not found');
      process.exit(1);
    }

    // Update the password hash
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: NEW_HASHED_PASSWORD } }
    );

    if (result.modifiedCount === 1) {
      console.log(`✅ Password reset for vz4sheezy`);
      console.log(`   New password: CyberDope2026`);
      
      // Verify
      const updated = await db.collection('users').findOne({ username: 'vz4sheezy' });
      console.log('\n✅ Verification:');
      console.log('   User ID:', updated._id);
      console.log('   Username:', updated.username);
      console.log('   isAdmin:', updated.isAdmin);
    } else {
      console.error('\n❌ Password update failed');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
