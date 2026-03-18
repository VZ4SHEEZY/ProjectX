// API Configuration
// Backend API URL - the secure proxy that hides your OpenAI key

// For local development:
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// For production (after deploying backend):
// export const API_BASE_URL = 'https://your-backend-url.onrender.com';

// No API keys here! They're safely stored on the backend server only.

export const OPENAI_CONFIG = {
  model: 'gpt-4o-mini', // Fast and cheap
  maxTokens: 150,
  temperature: 0.9, // Creative responses
};
