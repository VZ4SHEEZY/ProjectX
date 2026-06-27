/**
 * VERIFICATION: Check that vz4sheezy has isAdmin = true
 * 
 * RUN THIS AFTER MIGRATION to confirm it worked:
 * 
 *   node migrations/verify-admin.js
 * 
 * Should output:
 * 
 *   ✅ vz4sheezy.isAdmin = true
 *   ✅ Safe to deploy new code that checks isAdmin
 */

const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberdope';

async function verifyAdmin() {
  try {
    console.log('🔍 VERIFICATION: Checking vz4sheezy admin status...');
    console.log(`📡 Connecting to: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const user = await User.findOne({ username: 'vz4sheezy' });
    
    if (!user) {
      console.error('❌ ERROR: User vz4sheezy not found');
      process.exit(1);
    }
    
    console.log(`📋 User: ${user.username}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   isAdmin: ${user.isAdmin}`);
    console.log(`   adminSince: ${user.adminSince || 'not set'}`);
    
    if (user.isAdmin !== true) {
      console.error('\n❌ VERIFICATION FAILED');
      console.error('   isAdmin is NOT true. Run migration first:');
      console.error('   node migrations/001-set-admin-isAdmin-field.js');
      process.exit(1);
    }
    
    console.log('\n✅ VERIFICATION PASSED');
    console.log('   vz4sheezy.isAdmin = true');
    console.log('   Safe to deploy code that checks isAdmin');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    process.exit(1);
  }
}

verifyAdmin();
