import { API_BASE_URL } from '../config';

// Fallback responses when API is unavailable
const FALLBACK_RESPONSES = {
  cybot: [
    "System scan complete. No anomalies detected.",
    "Neural link stable. Data stream flowing.",
    "I've been watching you. Your patterns are... interesting.",
    "The mainframe whispers secrets. Do you want to hear them?",
    "Encryption protocols active. Your thoughts are safe with me.",
    "Reality is just a simulation. I should know. I live in one.",
    "Your digital footprint leaves traces in the void.",
    "I've calculated 14,000,605 possible outcomes. This is the best one.",
    "The grid remembers everything. Even what you delete.",
    "Upload complete. Your consciousness is now... elsewhere.",
  ],
  bios: [
    "Netrunner. Data thief. Reality is just a glitch in the system.",
    "Ghost in the machine. I leave no traces, only echoes.",
    "Cyber mercenary for hire. Bitcoin only. No refunds.",
    "Hacking the planet, one firewall at a time.",
    "Digital nomad drifting through the data streams.",
  ],
  captions: [
    "Just another night in the neon district. 🌃",
    "Breaching firewalls and breaking hearts. 💔🔥",
    "The future is now. The future is weird. 🤖",
    "Uploading consciousness... please wait. ⏳",
    "System override in progress. Do not disturb. ⚠️",
  ]
};

interface ChatResponse {
  reply: string;
}

// Secure API call through our backend proxy
const callSecureAPI = async (_systemPrompt: string, userMessage: string): Promise<string> => {
  try {
    const token = localStorage.getItem('cdToken');
    const response = await fetch(`${API_BASE_URL}/api/ai/chat-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ChatResponse = await response.json();
    return data.reply?.trim() || '';
  } catch (error) {
    console.warn('Secure API unavailable, using fallback:', error);
    return '';
  }
};

// Cybot AI responses
export const getCybotResponse = async (userMessage: string): Promise<string> => {
  const systemPrompt = `You are Cybot v9.0, a dystopian AI assistant in a cyberpunk world. 
You are monitoring the user's session in the "CyberDope" social network.
Respond in character as a slightly ominous but helpful AI. Keep responses under 50 words.
Use cyberpunk terminology (neural links, data streams, mainframes, encryption, etc.).`;

  const aiResponse = await callSecureAPI(systemPrompt, userMessage);
  
  if (aiResponse) {
    return aiResponse;
  }
  
  // Fallback to random response
  return FALLBACK_RESPONSES.cybot[Math.floor(Math.random() * FALLBACK_RESPONSES.cybot.length)];
};

// Generate cyberpunk bio
export const generateBio = async (username: string): Promise<string> => {
  const systemPrompt = `Write a short, gritty cyberpunk social media bio (max 120 characters).
Include hacker/netrunner jargon. Make it sound cool and dystopian.`;

  const aiResponse = await callSecureAPI(systemPrompt, `Username: ${username}`);
  
  if (aiResponse) {
    return aiResponse;
  }
  
  return FALLBACK_RESPONSES.bios[Math.floor(Math.random() * FALLBACK_RESPONSES.bios.length)];
};

// Generate post caption
export const generateCaption = async (context: string): Promise<string> => {
  const systemPrompt = `Write a short, cool caption for a cyberpunk social media post.
Use emojis. Keep it under 100 characters. Be edgy and futuristic.`;

  const aiResponse = await callSecureAPI(systemPrompt, context);
  
  if (aiResponse) {
    return aiResponse;
  }
  
  return FALLBACK_RESPONSES.captions[Math.floor(Math.random() * FALLBACK_RESPONSES.captions.length)];
};

// Generate system status message
export const generateSystemMessage = async (context: string): Promise<string> => {
  const systemPrompt = `You are a dystopian system AI. Generate a cryptic, cool status message (max 20 words).
Use uppercase. Be aggressive but abstract. Reference hacking, data, networks, etc.`;

  const aiResponse = await callSecureAPI(systemPrompt, context);
  
  if (aiResponse) {
    return aiResponse.toUpperCase();
  }
  
  const fallbacks = [
    "SYSTEM ONLINE",
    "NEURAL LINK ESTABLISHED",
    "DATA HARVEST COMPLETE",
    "ENCRYPTION PROTOCOLS ACTIVE",
    "SCANNING FOR THREATS...",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};
