// API Configuration
const configuredApiUrl = import.meta.env.VITE_API_URL || 'https://cyberdope-api.onrender.com/api';
export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '');
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_ORIGIN).replace(/\/$/, '');
const progressionRolloutStage = Number.parseInt(import.meta.env.VITE_PROGRESSION_ROLLOUT_STAGE || '0', 10);
export const USER_FACING_PROGRESSION_ENABLED = import.meta.env.VITE_USER_FACING_PROGRESSION_ENABLED === 'true'
  && Number.isInteger(progressionRolloutStage) && progressionRolloutStage >= 1 && progressionRolloutStage <= 4;

// No API keys here! They're safely stored on the backend server only.
export const OPENAI_CONFIG = {
  model: 'gpt-4o-mini', // Fast and cheap
  maxTokens: 150,
  temperature: 0.9, // Creative responses
};
