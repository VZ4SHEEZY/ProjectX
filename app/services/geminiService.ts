// Mock Gemini Service - No external dependencies required
// This is a simplified version that doesn't require the Google GenAI SDK

// Generates a cyberpunk-style system analysis of a user or context
export const generateSystemMessage = async (context: string): Promise<string> => {
  // Mock implementation - returns random cyberpunk messages
  const messages = [
    "SYSTEM_ONLINE",
    "SCANNING...",
    "DECRYPTING METADATA...",
    "TRACKING USER EYE MOVEMENT...",
    "DATA HARVEST COMPLETE",
    "NEURAL LINK ESTABLISHED",
    "BYPASSING FIREWALL...",
    "UPLOADING CONSCIOUSNESS...",
    "SYNCING WITH MAINFRAME...",
    "ENCRYPTING DATA STREAM..."
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};

export const generateBio = async (username: string): Promise<string> => {
  // Mock implementation
  return `Netrunner ${username}. Data streams flowing. System override in progress. // LEVEL_5_ACCESS`;
};
