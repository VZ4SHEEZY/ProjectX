require('dotenv').config({ path: '/Users/bojackson/ProjectX/backend/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

    // Generate fresh hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('CyberDope2026', salt);

    console.log(`Generated hash: ${hashedPassword.substring(0, 50)}...`);

    // Update the password hash
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount === 1) {
      console.log(`✅ Password reset for vz4sheezy`);
      
      // Verify
      const updated = await db.collection('users').findOne({ username: 'vz4sheezy' });
      console.log('\n✅ Verification:');
      console.log('   User ID:', updated._id);
      console.log('   Username:', updated.username);
      console.log('   isAdmin:', updated.isAdmin);
      
      // Also verify the password comparison works
      const isMatch = await bcrypt.compare('CyberDope2026', hashedPassword);
      console.log('   Password match verification:', isMatch ? '✅ PASS' : '❌ FAIL');
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
