const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { protect: auth } = require('../middleware/auth');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Generate post caption/content
router.post('/generate-caption', auth, async (req, res) => {
  try {
    const { topic, mood, style } = req.body;
    const prompt = `Write a ${mood || 'cyberpunk'} style social media post about ${topic || 'life in the neon city'}. 
    Style: ${style || 'edgy and mysterious'}.
    Keep it under 280 characters, make it engaging and include relevant hashtags.`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a creative social media content creator specializing in cyberpunk aesthetics.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.8
    });
    const caption = completion.choices[0].message.content.trim();
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
    const prompt = `Write a cool cyberpunk social media bio for someone who is ${persona || 'a mysterious netrunner'}.
    Interests: ${interests || 'hacking, neon lights, synthwave'}.
    Faction: ${faction || 'corporate rebel'}.
    Keep it under 160 characters, make it edgy and memorable.`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a creative bio writer for cyberpunk social media profiles.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.9
    });
    const bio = completion.choices[0].message.content.trim();
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
    const prompt = `Describe this cyberpunk image in an engaging way for social media. 
    Style: ${style || 'mysterious and atmospheric'}.
    Keep it under 100 words.`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        { role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]}
      ],
      max_tokens: 150
    });
    const description = completion.choices[0].message.content.trim();
    res.json({ success: true, description, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI Image Description Error:', error);
    res.status(500).json({ error: 'Failed to generate image description' });
  }
});

// Generate DALL-E image
router.post('/generate-image', auth, async (req, res) => {
  try {
    const { prompt, size = '1024x1024' } = req.body;
    const enhancedPrompt = `Cyberpunk style: ${prompt}. Neon lights, futuristic cityscape, high contrast, cinematic lighting, 8k quality.`;
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      size,
      quality: 'standard',
      n: 1
    });
    const imageUrl = response.data[0].url;
    res.json({ success: true, imageUrl, prompt: enhancedPrompt, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI Image Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// AI Chat Assistant
router.post('/chat-assistant', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful cyberpunk-themed AI assistant for a social media platform called CyberDope. Be helpful but maintain an edgy, futuristic personality.' },
        { role: 'user', content: message }
      ],
      max_tokens: 200,
      temperature: 0.7
    });
    const reply = completion.choices[0].message.content.trim();
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
    const prompt = `Suggest 3 ${tone} replies to this comment on a cyberpunk social media platform: "${comment}". Keep each reply under 100 characters.`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a social media engagement expert.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.8
    });
    const suggestions = completion.choices[0].message.content.trim().split('\n').filter(l => l.trim()).slice(0, 3);
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Analyze this content for inappropriate material. Return a JSON object with: flagged (boolean), categories (array), severity (low/medium/high), reason (string)' },
        { role: 'user', content: content }
      ],
      max_tokens: 150,
      temperature: 0.3
    });
    const moderation = JSON.parse(completion.choices[0].message.content.trim());
    res.json({ success: true, moderation, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI Moderation Error:', error);
    res.status(500).json({ error: 'Failed to moderate content' });
  }
});

module.exports = router;
