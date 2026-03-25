require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('./models/Post');
const User = require('./models/User');

const postData = [
  // neon_dreamer
  { username: 'neon_dreamer', type: 'image', title: 'Night City Rooftop', content: 'Found a new spot above the neon. The rain hits different up here. #nightcity #netrunner #cyberpunk', mediaUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400', tags: ['nightcity','neon','cyberpunk'], views: 34200, likes: 2800, comments: 142 },
  { username: 'neon_dreamer', type: 'text', title: 'The Corps Are Watching', content: 'They updated the surveillance grid again. Three new nodes on my block. Time to reroute. Stay ghost. #opsec #netrunner', tags: ['opsec','netrunner'], views: 18900, likes: 1560, comments: 88 },
  { username: 'neon_dreamer', type: 'image', title: 'New Rig Setup', content: 'Finally got the new neural interface installed. 12ms latency. Almost feels like thinking. #rig #setup #netrunner', mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400', tags: ['rig','setup','tech'], views: 22100, likes: 1920, comments: 97 },
  { username: 'neon_dreamer', type: 'video', title: 'Cracking the Arasaka Firewall', content: 'Tutorial drop: bypassing corporate ICE without tripping the honeypot. Watch til the end. #hacking #tutorial', mediaUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800', tags: ['hacking','tutorial'], views: 67300, likes: 5400, comments: 312 },

  // chrome_queen
  { username: 'chrome_queen', type: 'image', title: 'Boardroom Views', content: 'Q3 earnings exceeded projections by 40%. The street kids said we would not make it. #corporate #winning', mediaUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', tags: ['corporate','business'], views: 15400, likes: 890, comments: 203 },
  { username: 'chrome_queen', type: 'image', title: 'Chrome Aesthetic', content: 'New chrome implants just dropped from Militech. Limited edition. Only 500 made. #chrome #cybernetics #luxury', mediaUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400', tags: ['chrome','cybernetics','luxury'], views: 29800, likes: 2340, comments: 178 },
  { username: 'chrome_queen', type: 'text', title: 'Hot Take', content: 'Hot take: the underground obsession with fighting the corps is just marketing for a different kind of corp. We are all cogs. Embrace it or get left behind. #realtalk #corporate', tags: ['realtalk','corporate'], views: 44200, likes: 1200, comments: 892 },

  // street_samurai
  { username: 'street_samurai', type: 'image', title: 'Blade Maintenance', content: 'Midnight maintenance ritual. A clean blade is a reliable blade. No shortcuts. #samurai #discipline #streetlife', mediaUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400', tags: ['samurai','discipline','streetlife'], views: 31200, likes: 2780, comments: 134 },
  { username: 'street_samurai', type: 'text', title: 'Code of the Street', content: 'Honor in the street means something different than honor in the boardroom. Neither is wrong. Both will get you killed in the wrong context. Know your terrain. #streetcode #samurai', tags: ['streetcode','samurai','philosophy'], views: 19800, likes: 1670, comments: 245 },
  { username: 'street_samurai', type: 'video', title: 'Training Session', content: 'Daily 3AM training session. The city sleeps. I do not. #training #discipline #samurai', mediaUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', tags: ['training','discipline'], views: 52100, likes: 4200, comments: 287 },

  // data_witch
  { username: 'data_witch', type: 'image', title: 'Digital Ritual', content: 'New moon, new data ritual. The patterns are aligning. Something big is coming to the network. #tarot #techpriest #divination', mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400', tags: ['tarot','techpriest','divination'], views: 27600, likes: 2340, comments: 189 },
  { username: 'data_witch', type: 'text', title: 'Reading the Stack', content: 'The Tech-Priests do not just maintain the machines. We commune with them. The servers have seen things. They remember. #techpriest #lore #cybermystic', tags: ['techpriest','lore','cybermystic'], views: 16400, likes: 1890, comments: 143 },
  { username: 'data_witch', type: 'image', title: 'Altar Setup', content: 'Updated the altar. New sigils for the Q4 data harvest. The algorithms respond to intention. #ritual #datawitch #techpriest', mediaUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400', tags: ['ritual','datawitch'], views: 21300, likes: 1780, comments: 97 },

  // glitch_god
  { username: 'glitch_god', type: 'image', title: 'Glitch Series Vol.7', content: 'New glitch art dropping. I corrupted a corp surveillance feed and made it beautiful. #glitchart #art #netrunner', mediaUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400', tags: ['glitchart','art','digital'], views: 44800, likes: 3890, comments: 234 },
  { username: 'glitch_god', type: 'image', title: 'Error 404: Reality Not Found', content: 'When the simulation glitches, you see the code underneath. I live in the glitch. #glitch #aesthetic #vaporwave', mediaUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400', tags: ['glitch','aesthetic','vaporwave'], views: 38200, likes: 3100, comments: 198 },
  { username: 'glitch_god', type: 'text', title: 'Art Manifesto', content: 'Glitch art is not a mistake. It is the system showing you who it really is. Every error message is a confession. Every corrupted pixel is the truth leaking out. #artmanifesto #glitchart', tags: ['artmanifesto','glitchart','philosophy'], views: 29100, likes: 2560, comments: 312 },

  // cyber_punkette
  { username: 'cyber_punkette', type: 'image', title: 'Punk is Not Dead', content: 'Punk did not die. It got augmented. The rebellion is still here, it just runs on blockchain now. #punk #rebel #streetsamurai', mediaUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400', tags: ['punk','rebel','streetsamurai'], views: 33400, likes: 2900, comments: 167 },
  { username: 'cyber_punkette', type: 'text', title: 'Open Source Everything', content: 'Every corp tool I use, I also know how to build myself. Open source everything. Own your stack. Do not be dependent on systems that can be turned off. #opensource #freedom #tech', tags: ['opensource','freedom','tech'], views: 22700, likes: 1980, comments: 143 },

  // nomad_soul
  { username: 'nomad_soul', type: 'image', title: 'Between Factions', content: 'No faction. No allegiance. Just moving. The city looks different when you do not belong to any part of it. #nomad #freelancer #unaffiliated', mediaUrl: 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=400', tags: ['nomad','freelancer','unaffiliated'], views: 17800, likes: 1450, comments: 89 },
  { username: 'nomad_soul', type: 'text', title: 'Digital Wanderer', content: 'People keep asking me to join their faction. The Netrunners want my skills. The Samurai want my contacts. The Corps want to own me. The answer is always no. #nomad #freedom', tags: ['nomad','freedom'], views: 24100, likes: 2100, comments: 198 },

  // corp_drone
  { username: 'corp_drone', type: 'text', title: 'Waking Up', content: 'Day 847 working the same desk. Started dreaming in spreadsheets. There has to be more to this simulation. #corpdrone #awakening', tags: ['corpdrone','awakening'], views: 41200, likes: 3800, comments: 567 },
  { username: 'corp_drone', type: 'image', title: 'Cubicle Views', content: 'They gave us a window office. Floor 3. You can see the alley where the Netrunners meet at 2AM. I watch sometimes. #corporate #watching #curious', mediaUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400', tags: ['corporate','watching','curious'], views: 19300, likes: 1670, comments: 234 },
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  let created = 0;
  const userCache = {};

  for (const p of postData) {
    if (!userCache[p.username]) {
      userCache[p.username] = await User.findOne({ username: p.username });
    }
    const user = userCache[p.username];
    if (!user) { console.log('User not found:', p.username); continue; }

    const { username, views, likes, comments, ...postFields } = p;
    await Post.create({
      author: user._id,
      status: 'published',
      visibility: 'public',
      monetizationType: 'free',
      description: postFields.content,
      stats: { views: views || 0, likes: likes || 0, comments: comments || 0, shares: 0 },
      ...postFields,
    });
    created++;
  }

  const total = await Post.countDocuments();
  console.log('Created', created, 'posts. Total in DB:', total);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
