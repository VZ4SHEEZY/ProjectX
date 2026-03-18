const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Notification = require('./models/Notification');
const Message = require('./models/Message');
const { Conversation } = require('./models/Message');
const Tip = require('./models/Tip');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberdope');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const sampleUsers = [
  {
    username: 'neon_dreamer',
    email: 'neon@cyberdope.io',
    password: 'password123',
    bio: 'Living in the matrix, one byte at a time. Netrunner by day, digital artist by night.',
    faction: 'Netrunners',
    isCreator: true,
    isVerified: true,
    isAgeVerified: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neon',
    subscriptionTiers: [
      { name: 'Basic', price: 5, benefits: ['Access to exclusive posts', 'Monthly digital wallpaper'] },
      { name: 'VIP', price: 15, benefits: ['All Basic perks', '1-on-1 chat', 'Early access to content'] }
    ]
  },
  {
    username: 'chrome_queen',
    email: 'chrome@cyberdope.io',
    password: 'password123',
    bio: 'Cybernetic enhancements and tech reviews. 50% human, 50% machine, 100% awesome.',
    faction: 'Corporates',
    isCreator: true,
    isVerified: true,
    isAgeVerified: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chrome'
  },
  {
    username: 'street_samurai',
    email: 'samurai@cyberdope.io',
    password: 'password123',
    bio: 'Code is my katana. Protecting the digital realm from corporate overlords.',
    faction: 'Street Samurai',
    isCreator: true,
    isVerified: false,
    isAgeVerified: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=samurai'
  },
  {
    username: 'data_witch',
    email: 'witch@cyberdope.io',
    password: 'password123',
    bio: 'Casting spells in binary. Tarot readings for the digital age.',
    faction: 'Tech-Priests',
    isCreator: true,
    isVerified: true,
    isAgeVerified: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=witch'
  },
  {
    username: 'nomad_soul',
    email: 'nomad@cyberdope.io',
    password: 'password123',
    bio: 'No fixed address, no fixed identity. Roaming the digital highways.',
    faction: 'Unaffiliated',
    isCreator: false,
    isVerified: false,
    isAgeVerified: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nomad'
  },
  {
    username: 'glitch_god',
    email: 'glitch@cyberdope.io',
    password: 'password123',
    bio: 'Finding beauty in broken code. Glitch art and vaporwave aesthetics.',
    faction: 'Netrunners',
    isCreator: true,
    isVerified: true,
    isAgeVerified: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=glitch'
  },
  {
    username: 'corp_drone',
    email: 'drone@cyberdope.io',
    password: 'password123',
    bio: "Just another cog in the machine. But I'm learning to dream.",
    faction: 'Corporates',
    isCreator: false,
    isVerified: false,
    isAgeVerified: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=drone'
  },
  {
    username: 'cyber_punkette',
    email: 'punkette@cyberdope.io',
    password: 'password123',
    bio: 'Rebel with a cause. Fighting for digital freedom and open source.',
    faction: 'Street Samurai',
    isCreator: true,
    isVerified: false,
    isAgeVerified: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=punkette'
  }
];

const samplePosts = [
  {
    title: 'They Are Hiding More Than We Thought',
    description: "Just hacked into the mainframe. The things I've seen... 🤯 Stay vigilant, netrunners.",
    type: 'text',
    monetizationType: 'free',
    tags: ['netrunner', 'hacking', 'truth'],
    views: 15420
  },
  {
    title: 'Neural Link Review - This Changes Everything',
    description: 'New cybernetic implant review dropping tomorrow! Subscribers get early access 👀',
    type: 'video',
    mediaUrl: 'https://example.com/video1.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
    monetizationType: 'subscribers',
    tags: ['cybernetics', 'review', 'tech'],
    views: 8900
  },
  {
    title: 'Late Night Coding Session',
    description: "There's something poetic about watching the sunrise through lines of code.",
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    monetizationType: 'free',
    tags: ['coding', 'night', 'aesthetic'],
    views: 6700
  },
  {
    title: 'Digital Tarot: The Tower Card',
    description: '🔮 The Tower card appears. Expect sudden changes - destruction precedes creation.',
    type: 'text',
    monetizationType: 'free',
    tags: ['tarot', 'divination', 'cyberwitch'],
    views: 12300
  },
  {
    title: 'Night City at 3 AM',
    description: "POV: You're walking through Night City at 3 AM. The neon never sleeps.",
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800',
    monetizationType: 'free',
    tags: ['nightcity', 'neon', 'cyberpunk'],
    views: 22100
  },
  {
    title: 'Corporate Meltdown - Glitch Art',
    description: 'My latest glitch art piece. What do you think?',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800',
    monetizationType: 'free',
    tags: ['glitchart', 'digitalart', 'aesthetic'],
    views: 18900
  },
  {
    title: 'Behind The Scenes: Netrunning Operation',
    description: 'The matrix is beautiful and terrifying.',
    type: 'video',
    mediaUrl: 'https://example.com/video2.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
    monetizationType: 'ppv',
    price: 2.99,
    tags: ['netrunner', 'matrix'],
    views: 4500
  },
  {
    title: 'Digital Dreams - New Single Out Now',
    description: 'Just dropped my new single on all platforms! 🎵',
    type: 'audio',
    mediaUrl: 'https://example.com/audio1.mp3',
    monetizationType: 'free',
    tags: ['music', 'synthwave'],
    views: 9800
  }
];

const sampleCommentTexts = [
  'This is absolutely mind-blowing! 🔥',
  "Can't wait for the next update!",
  'The aesthetic is *chef\'s kiss*',
  'Following you for more content like this',
  'How do you even create something like this?',
  'This resonates with me on a spiritual level',
  'First! 🚀',
  'Shared this with my crew, they love it'
];

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    await Notification.deleteMany({});
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await Tip.deleteMany({});

    console.log('Creating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await User.create({ ...userData, password: hashedPassword });
      createdUsers.push(user);
      console.log(`Created user: ${user.username}`);
    }

    console.log('Creating posts...');
    const createdPosts = [];
    for (const postData of samplePosts) {
      const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const post = await Post.create({ ...postData, author: randomUser._id });
      createdPosts.push(post);
      console.log(`Created post: ${post.title}`);
    }

    console.log('Creating comments...');
    for (const post of createdPosts) {
      const numComments = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < numComments; i++) {
        const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        const randomText = sampleCommentTexts[Math.floor(Math.random() * sampleCommentTexts.length)];
        await Comment.create({
          author: randomUser._id,
          post: post._id,
          text: randomText
        });
      }
    }

    console.log('Creating follows...');
    for (const user of createdUsers) {
      const numFollows = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < numFollows; i++) {
        const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        if (randomUser._id.toString() !== user._id.toString() &&
            !user.following.includes(randomUser._id)) {
          user.following.push(randomUser._id);
          user.followingCount += 1;
          randomUser.followers.push(user._id);
          randomUser.followersCount += 1;
          await user.save();
          await randomUser.save();
        }
      }
    }

    console.log('Creating tips...');
    const creators = createdUsers.filter(u => u.isCreator);
    for (let i = 0; i < 10; i++) {
      const sender = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const recipient = creators[Math.floor(Math.random() * creators.length)];
      if (sender._id.toString() !== recipient._id.toString()) {
        const amount = [0.01, 0.05, 0.1, 0.5][Math.floor(Math.random() * 4)];
        await Tip.create({
          sender: sender._id,
          recipient: recipient._id,
          amount,
          currency: 'ETH',
          status: 'completed',
          recipientAmount: amount * 0.85,
          platformFee: amount * 0.15
        });
        recipient.totalEarnings += amount * 0.85;
        recipient.availableBalance += amount * 0.85;
        await recipient.save();
      }
    }

    console.log('Creating conversations and messages...');
    for (let i = 0; i < 8; i++) {
      const sender = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const recipient = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      if (sender._id.toString() !== recipient._id.toString()) {
        const msgTexts = [
          'Hey! Love your content!',
          'Thanks for the follow!',
          'When is your next drop?',
          'Your art is incredible',
          "Let's collaborate sometime",
          'Big fan of your work!'
        ];
        const text = msgTexts[Math.floor(Math.random() * msgTexts.length)];
        const convo = await Conversation.create({
          participants: [sender._id, recipient._id],
          lastMessage: { text, sender: sender._id, sentAt: new Date() }
        });
        await Message.create({
          conversation: convo._id,
          sender: sender._id,
          recipient: recipient._id,
          text,
          status: 'sent'
        });
      }
    }

    console.log('Creating notifications...');
    for (const user of createdUsers) {
      const numNotifs = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < numNotifs; i++) {
        const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        const types = ['follow', 'like', 'comment'];
        const type = types[Math.floor(Math.random() * types.length)];
        if (randomUser._id.toString() !== user._id.toString()) {
          const messages = {
            follow: `${randomUser.username} started following you`,
            like: `${randomUser.username} liked your post`,
            comment: `${randomUser.username} commented on your post`
          };
          await Notification.create({
            recipient: user._id,
            sender: randomUser._id,
            type,
            message: messages[type],
            isRead: Math.random() > 0.5
          });
        }
      }
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('- 8 users created');
    console.log('- 8 posts created');
    console.log('- Comments, tips, messages, and notifications created');
    console.log('\nDemo login:');
    console.log('  Email:    neon@cyberdope.io');
    console.log('  Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();