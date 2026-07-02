const { MongoClient } = require('mongodb');

async function verifyUser() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    return;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    // Update vz4sheezy user to have isAgeVerified: true
    const result = await db.collection('users').updateOne(
      { username: 'vz4sheezy' },
      { $set: { isAgeVerified: true } }
    );

    console.log(`Updated ${result.modifiedCount} users`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

verifyUser();
