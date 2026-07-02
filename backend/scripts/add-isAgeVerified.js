const { MongoClient } = require('mongodb');

async function addIsAgeVerified() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    return;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    // Update all users to have isAgeVerified: true for now (temporary fix)
    const result = await db.collection('users').updateMany(
      {},
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

addIsAgeVerified();
