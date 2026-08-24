require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env file');
    process.exit(1);
  }
  if (!process.env.RESET_PASSWORD || !process.env.TARGET_USERNAME) {
    console.error('RESET_PASSWORD and TARGET_USERNAME are required');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Get the user
    const user = await db.collection('users').findOne({ username: process.env.TARGET_USERNAME });
    
    if (!user) {
      console.error('❌ Target user not found');
      process.exit(1);
    }

    // Update the password hash
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: await bcrypt.hash(process.env.RESET_PASSWORD, 12) } }
    );

    if (result.modifiedCount === 1) {
      console.log('✅ Password reset for target user');
      
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
