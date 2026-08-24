const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Post IDs and new video URLs
const updates = [
  {
    id: '69e9212ed0842c584c1c112d',
    mediaUrl: 'https://mixkit.co/free-stock-video/download/mixkit-city-traffic-in-a-high-building-perspective-541.mp4'
  },
  {
    id: '69e9212dd0842c584c1c112b',
    mediaUrl: 'https://mixkit.co/free-stock-video/download/mixkit-woman-running-above-time-lapse-34.mp4'
  },
  {
    id: '69e9212dd0842c584c1c1129',
    mediaUrl: 'https://mixkit.co/free-stock-video/download/mixkit-curvy-road-on-a-tree-covered-hill-aerial-view-39.mp4'
  },
  {
    id: '69e9212dd0842c584c1c1127',
    mediaUrl: 'https://mixkit.co/free-stock-video/download/mixkit-daytime-city-traffic-aerial-view-56.mp4'
  },
  {
    id: '69e9212dd0842c584c1c1125',
    mediaUrl: 'https://mixkit.co/free-stock-video/download/mixkit-young-woman-vlogging-over-a-city-footage-26.mp4'
  },
  {
    id: '69e9212dd0842c584c1c1123',
    mediaUrl: 'https://mixkit.co/free-stock-video/download/mixkit-aerial-view-of-city-traffic-at-intersection-56.mp4'
  },
  {
    id: '69e9212dd0842c584c1c1121',
    mediaUrl: 'https://mixkit.co/free-stock-video/download/mixkit-man-under-multicolored-lights-1237.mp4'
  },
  {
    id: '69e9212dd0842c584c1c111f',
    mediaUrl: 'https://mixkit.co/free-stock-video/download/mixkit-tree-moving-in-the-wind-1281.mp4'
  }
];

async function updateVideos() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');

    let updated = 0;
    for (const update of updates) {
      const result = await postsCollection.updateOne(
        { _id: new mongoose.Types.ObjectId(update.id) },
        { $set: { mediaUrl: update.mediaUrl } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated post ${update.id.slice(-8)}`);
        updated++;
      } else {
        console.log(`⚠️  Post ${update.id.slice(-8)} not found or not modified`);
      }
    }

    console.log(`\n✅ Total updated: ${updated}/8`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateVideos();
