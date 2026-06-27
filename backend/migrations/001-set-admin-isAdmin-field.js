/**
 * MIGRATION: Set isAdmin = true on vz4sheezy account
 * 
 * SAFE MIGRATION PATTERN:
 * 1. Run this BEFORE deploying code that checks isAdmin
 * 2. Verify it worked with the verification script
 * 3. Only then merge new code
 * 4. This way, by the time code checks isAdmin, your account is already set
 * 
 * RUN FROM /Users/bojackson/ProjectX/backend/:
 * 
 *   node migrations/001-set-admin-isAdmin-field.js
 * 
 * VERIFY IT WORKED:
 * 
 *   node migrations/verify-admin.js
 * 
 * The script will connect to MongoDB, find the user with username 'vz4sheezy',
 * and set isAdmin = true and adminSince = now.
 */

const mongoose = require('mongoose');
const User = require('../models/User');

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberdope';

async function migrateAdminAccess() {
  try {
    console.log('🔐 ADMIN MIGRATION: Setting isAdmin on vz4sheezy account...');
    console.log(`📡 Connecting to: ${MONGODB_URI}`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the admin account
    const user = await User.findOne({ username: 'vz4sheezy' });
    
    if (!user) {
      console.error('❌ ERROR: User vz4sheezy not found in database');
      console.error('   Double-check the username and try again');
      process.exit(1);
    }
    
    console.log(`\n📋 Found user: ${user.username}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current isAdmin: ${user.isAdmin}`);
    console.log(`   Current adminSince: ${user.adminSince}`);
    
    // Check if already admin
    if (user.isAdmin === true) {
      console.log('\n⚠️  User is already isAdmin = true');
      console.log('   No changes needed. Exiting.');
      process.exit(0);
    }
    
    // Set admin access
    console.log('\n🔧 Setting isAdmin = true and adminSince = now...');
    const beforeUpdate = user.isAdmin;
    user.isAdmin = true;
    user.adminSince = new Date();
    
    const result = await user.save();
    
    console.log(`\n✅ MIGRATION SUCCESSFUL`);
    console.log(`   Before: isAdmin = ${beforeUpdate}`);
    console.log(`   After: isAdmin = ${result.isAdmin}`);
    console.log(`   Admin Since: ${result.adminSince}`);
    console.log(`\n🎯 vz4sheezy now has admin access via isAdmin field`);
    
    // Disconnect
    await mongoose.connection.close();
    console.log('\n✅ Closed database connection');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Is MONGODB_URI set in .env?');
    console.error('2. Is MongoDB running and accessible?');
    console.error('3. Is the username spelled correctly ("vz4sheezy")?');
    process.exit(1);
  }
}

// Run migration
migrateAdminAccess();
