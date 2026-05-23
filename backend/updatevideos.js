const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://cyberdope:CyberDope2026!@cyberdope.mongodb.net/cyberdope?retryWrites=true&w=majority';

const updates = [
  ['69e9212ed0842c584c1c112d', 'https://mixkit.co/free-stock-video/download/mixkit-city-traffic-in-a-high-building-perspective-541.mp4'],
  ['69e9212dd0842c584c1c112b', 'https://mixkit.co/free-stock-video/download/mixkit-woman-running-above-time-lapse-34.mp4'],
  ['69e9212dd0842c584c1c1129', 'https://mixkit.co/free-stock-video/download/mixkit-curvy-road-on-a-tree-covered-hill-aerial-view-39.mp4'],
  ['69e9212dd0842c584c1c1127', 'https://mixkit.co/free-stock-video/download/mixkit-daytime-city-traffic-aerial-view-56.mp4'],
  ['69e9212dd0842c584c1c1125', 'https://mixkit.co/free-stock-video/download/mixkit-young-woman-vlogging-over-a-city-footage-26.mp4'],
  ['69e9212dd0842c584c1c1123', 'https://mixkit.co/free-stock-video/download/mixkit-aerial-view-of-city-traffic-at-intersection-56.mp4'],
  ['69e9212dd0842c584c1c1121', 'https://mixkit.co/free-stock-video/download/mixkit-man-under-multicolored-lights-1237.mp4'],
  ['69e9212dd0842c584c1c111f', 'https://mixkit.co/free-stock-video/download/mixkit-tree-moving-in-the-wind-1281.mp4']
];

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const col = db.collection('posts');
    
    let count = 0;
    for (const [id, url] of updates) {
      const r = await col.updateOne({_id: new mongoose.Types.ObjectId(id)}, {$set: {mediaUrl: url}});
      if (r.modifiedCount) { console.log('✅ ' + id.slice(-8)); count++; }
    }
    console.log('Done: ' + count + '/8');
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
