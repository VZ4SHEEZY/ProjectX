const cloudinary = require('cloudinary').v2;

const REQUIRED_CLOUDINARY_ENV = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const isConfigured = (env = process.env) => REQUIRED_CLOUDINARY_ENV.every((key) => env[key]?.trim());

const uploadBuffer = (buffer, options) => new Promise((resolve, reject) => {
  if (!isConfigured()) return reject(new Error('Durable media storage is not configured'));
  if (!buffer?.length) return reject(new Error('Audio file is empty'));

  const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) reject(error);
    else resolve(result);
  });
  stream.on('error', reject);
  stream.end(buffer);
});

const storeVoiceAudio = async ({ buffer, mimeType, originalName, ownerId }) => {
  const result = await uploadBuffer(buffer, {
    folder: 'cyberdope/voice',
    resource_type: 'video',
    type: 'upload',
    context: {
      ownerId: ownerId.toString(),
      originalName: originalName || 'voice-message',
      mimeType
    }
  });

  return {
    url: result.secure_url,
    storageKey: result.public_id,
    bytes: result.bytes,
    duration: result.duration
  };
};

const deleteVoiceAudio = async (storageKey) => {
  if (!storageKey) return;
  if (!isConfigured()) throw new Error('Durable media storage is not configured');
  const result = await cloudinary.uploader.destroy(storageKey, { resource_type: 'video', invalidate: true });
  if (!['ok', 'not found'].includes(result.result)) {
    throw new Error(`Durable media deletion failed: ${result.result}`);
  }
};

module.exports = {
  REQUIRED_CLOUDINARY_ENV,
  isConfigured,
  storeVoiceAudio,
  deleteVoiceAudio
};
