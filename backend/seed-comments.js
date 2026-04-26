const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberdope')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Comment schema inline
const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Define Post schema
const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: String,
  description: String,
  mediaUrl: String,
  thumbnailUrl: String,
  comments: [commentSchema],
  commentsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  avatar: String,
  _id: mongoose.Schema.Types.ObjectId
}));

// Fake user comments
const fakeComments = [
  "🔥 This is fire!",
  "Love this content",
  "Amazing production quality",
  "Need more of this",
  "Absolute banger",
  "Insane skills",
  "This hit different",
  "Can't stop watching",
  "Best video on here",
  "Straight vibes",
  "Underrated talent",
  "Respect the grind",
  "This is what I needed today",
  "The creativity 🎨",
  "Legendary stuff"
];

const fakeUsernames = [
  'cyberpunk_vibe', 'digital_dreamer', 'neon_knight', 'echo_chamber',
  'pixel_perfect', 'synth_wave', 'chrome_soul', 'electric_heart',
  'code_wizard', 'night_owl', 'void_walker', 'data_ghost'
];

async function seedComments() {
  try {
    // Get all posts without comments or with few comments
    const posts = await Post.find().limit(20);
    console.log(`Found ${posts.length} posts to seed comments on`);

    let updated = 0;

    for (const post of posts) {
      // Only seed if post has 0-1 comments
      if (!post.comments || post.comments.length < 2) {
        // Generate 2-4 random comments
        const numComments = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < numComments; i++) {
          const randomComment = fakeComments[Math.floor(Math.random() * fakeComments.length)];
          const randomUsername = fakeUsernames[Math.floor(Math.random() * fakeUsernames.length)];
          
          // Create a fake user ID or use existing user
          const fakeUserId = new mongoose.Types.ObjectId();
          
          post.comments.push({
            author: fakeUserId,
            content: randomComment,
            likes: Math.floor(Math.random() * 20),
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last 7 days
          });
        }
        
        post.commentsCount = post.comments.length;
        await post.save();
        updated++;
        console.log(`✓ Added comments to post: ${post.title}`);
      }
    }

    console.log(`\n✅ Seeded ${updated} posts with comments`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedComments();
