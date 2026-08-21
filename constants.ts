
import { Video, User } from './types';

export const CURRENT_USER: User = {
    id: 'u1',
    username: 'Ghost_In_The_Shell',
    walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    btcAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop',
    bio: 'Netrunner. Data thief. Reality is a glitch. // 📍 Night City // 🟢 ONLINE',
    faction: 'NETRUNNER',
    isVerified: true,
    isAgeVerified: true, // Set to true for demo purposes so you can see everything
    subscriptionPlan: {
      name: 'OPERATOR ACCESS',
      priceEth: '0.05',
      priceBtc: '0.002',
      benefits: ['Exclusive Video Logs', 'Private Discord Channel', 'Hex-Badge on Profile']
    },
    theme: {
      // Vibrant Neon City Background
      backgroundImage: 'https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=2550&auto=format&fit=crop',
      customCss: `
/* DEMO THEME: NEON OVERRIDE */
.bio-widget {
  background: rgba(0, 0, 0, 0.7) !important;
  border: 1px solid #00FFFF !important;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
}

.bio-text {
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 2px;
  color: #00FFFF !important;
  text-shadow: 0 0 10px #00FFFF;
}

/* Make the grid items look like glass shards */
.react-grid-item {
  border-radius: 0px;
  clip-path: polygon(
    10px 0, 100% 0, 
    100% calc(100% - 10px), 
    calc(100% - 10px) 100%, 
    0 100%, 0 10px
  );
}
`
    }
};

export const VIDEOS: Video[] = [
    {
        id: 'v1',
        // Tears of Steel (Sci-Fi/Cyberpunk Vibe) - Reliable Google Storage Link
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        thumbnail: 'https://picsum.photos/400/800?1',
        description: 'Cruising through the Neon District. The rain never stops here. 🌧️ #cyberpunk #nightcity',
        likes: 1240,
        isSensitive: false,
        tags: ['neon', 'nightcity', 'vibe'],
        user: {
            id: 'u2',
            username: 'Neon_Drifter',
            walletAddress: '0x123...',
            avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop',
            bio: 'Drifting through the datastream',
            isVerified: true
        }
    },
    {
        id: 'v2',
        // For Bigger Blazes (Action/Heist Vibe) - Reliable Google Storage Link
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnail: 'https://picsum.photos/400/800?2',
        description: 'Breaching the mainframe. Level 5 security is a joke. 💻💀 #hacking #netrunner',
        likes: 8900,
        isSensitive: true, // Content Gating Enabled (Blur)
        tags: ['hacking', 'security', 'breach'],
        user: {
            id: 'u3',
            username: 'Zero_Cool',
            walletAddress: '0x456...',
            avatar: 'https://images.unsplash.com/photo-1618641986557-6ecd23ff9387?w=100&auto=format&fit=crop',
            bio: 'Mess with the best, die like the rest'
        }
    },
    {
        id: 'v3',
        // For Bigger Escapes (Fast Paced) - Reliable Google Storage Link
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnail: 'https://picsum.photos/400/800?3',
        description: 'EXCLUSIVE: Visualizing the hidden blockchain layers. Premium access only. 💎',
        likes: 450,
        isSensitive: false,
        isPremium: true, // Monetization Enabled (Paywall)
        price: '0.05',
        tags: ['data', 'viz', 'crypto', 'premium'],
        user: {
            id: 'u4',
            username: 'Data_Mage',
            walletAddress: '0x789...',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop',
            bio: 'Visualizing the invisible',
            isVerified: true
        }
    },
    {
        id: 'v4',
        // For Bigger Joyrides (Adrenaline) - Reliable Google Storage Link
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        thumbnail: 'https://picsum.photos/400/800?4',
        description: 'WARNING: 18+ CONTENT. Sub-level 4 rave footage. 🚫👀',
        likes: 2200,
        isSensitive: false,
        isNSFW: true, // Age Gating Enabled (Strict 18+)
        tags: ['rave', 'underground', 'nsfw'],
        user: {
            id: 'u5',
            username: 'Rave_Queen',
            walletAddress: '0x999...',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop',
            bio: 'Live fast',
            isVerified: true
        }
    }
];
