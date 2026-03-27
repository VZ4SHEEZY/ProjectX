const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { protect: auth } = require('../middleware/auth');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-opus-4-6';

const getText = (response) =>
  response.content.find((b) => b.type === 'text')?.text?.trim() || '';

// Generate post caption/content
router.post('/generate-caption', auth, async (req, res) => {
  try {
    const { topic, mood, style } = req.body;
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: 'You are a creative social media content creator specializing in cyberpunk aesthetics.',
      messages: [{
        role: 'user',
        content: `Write a ${mood || 'cyberpunk'} style social media post about ${topic || 'life in the neon city'}. Style: ${style || 'edgy and mysterious'}. Keep it under 280 characters, make it engaging and include relevant hashtags.`
      }]
    });
    const caption = getText(response);
    res.json({ success: true, caption, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI Caption Error:', error);
    res.status(500).json({ error: 'Failed to generate caption' });
  }
});

// Generate bio
router.post('/generate-bio', auth, async (req, res) => {
  try {
    const { persona, interests, faction } = req.body;
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: 'You are a creative bio writer for cyberpunk social media profiles.',
      messages: [{
        role: 'user',
        content: `Write a cool cyberpunk social media bio for someone who is ${persona || 'a mysterious netrunner'}. Interests: ${interests || 'hacking, neon lights, synthwave'}. Faction: ${faction || 'corporate rebel'}. Keep it under 160 characters, make it edgy and memorable.`
      }]
    });
    const bio = getText(response);
    res.json({ success: true, bio, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI Bio Error:', error);
    res.status(500).json({ error: 'Failed to generate bio' });
  }
});

// Generate image description/alt text
router.post('/generate-image-description', auth, async (req, res) => {
  try {
    const { imageUrl, style } = req.body;
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl }
          },
          {
            type: 'text',
            text: `Describe this image in an engaging way for social media. Style: ${style || 'mysterious and atmospheric'}. Keep it under 100 words.`
          }
        ]
      }]
    });
    const description = getText(response);
    res.json({ success: true, description, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI Image Description Error:', error);
    res.status(500).json({ error: 'Failed to generate image description' });
  }
});

// Image generation — not supported by Claude API
router.post('/generate-image', auth, async (req, res) => {
  res.status(501).json({ error: 'Image generation is not supported. Use a dedicated image generation service.' });
});

// AI Chat Assistant
router.post('/chat-assistant', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: 'You are a helpful cyberpunk-themed AI assistant for a social media platform called CyberDope. Be helpful but maintain an edgy, futuristic personality.',
      messages: [{ role: 'user', content: message }]
    });
    const reply = getText(response);
    res.json({ success: true, reply, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Generate comment reply suggestions
router.post('/suggest-replies', auth, async (req, res) => {
  try {
    const { comment, tone = 'friendly' } = req.body;
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: 'You are a social media engagement expert.',
      messages: [{
        role: 'user',
        content: `Suggest 3 ${tone} replies to this comment on a cyberpunk social media platform: "${comment}". Keep each reply under 100 characters. Return only the 3 replies, one per line, no numbering.`
      }]
    });
    const suggestions = getText(response).split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3);
    res.json({ success: true, suggestions, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI Reply Suggestion Error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Content moderation
router.post('/moderate', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: 'You are a content moderation AI. Always respond with valid JSON only, no extra text.',
      messages: [{
        role: 'user',
        content: `Analyze this content for inappropriate material and return a JSON object with these exact fields: flagged (boolean), categories (array of strings), severity ("low", "medium", or "high"), reason (string). Content: "${content}"`
      }]
    });
    const moderation = JSON.parse(getText(response));
    res.json({ success: true, moderation, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI Moderation Error:', error);
    res.status(500).json({ error: 'Failed to moderate content' });
  }
});

module.exports = router;
