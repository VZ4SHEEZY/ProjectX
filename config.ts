// API Configuration
const configuredApiUrl = import.meta.env.VITE_API_URL || 'https://cyberdope-api.onrender.com/api';
export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '');
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_ORIGIN).replace(/\/$/, '');

// No API keys here! They're safely stored on the backend server only.
export const OPENAI_CONFIG = {
  model: 'gpt-4o-mini', // Fast and cheap
  maxTokens: 150,
  temperature: 0.9, // Creative responses
};
