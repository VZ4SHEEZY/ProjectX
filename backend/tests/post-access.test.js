const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Post = require('../models/Post');

const author = new mongoose.Types.ObjectId();
const viewer = new mongoose.Types.ObjectId();

test('post authors retain access to their protected content', () => {
  const post = new Post({ author, type: 'video', visibility: 'subscribers' });
  assert.equal(post.canAccess({ _id: author }), true);
});

test('subscriber visibility is enforced even when legacy monetizationType is free', () => {
  const post = new Post({ author, type: 'video', visibility: 'subscribers', monetizationType: 'free' });
  assert.equal(post.canAccess({ _id: viewer }), false);
  assert.equal(post.canAccess({
    _id: viewer,
    subscriptions: [{ creator: author, status: 'active', expiresAt: new Date(Date.now() + 60000) }]
  }), true);
});

test('expired subscriptions do not grant content access', () => {
  const post = new Post({ author, type: 'video', visibility: 'subscribers' });
  assert.equal(post.canAccess({
    _id: viewer,
    subscriptions: [{ creator: author, status: 'active', expiresAt: new Date(Date.now() - 60000) }]
  }), false);
});

test('faction content only grants access to matching faction members', () => {
  const post = new Post({ author, type: 'video', visibility: 'faction', faction: 'Quantum Veil' });
  assert.equal(post.canAccess({ _id: viewer, faction: 'Quantum Veil' }), true);
  assert.equal(post.canAccess({ _id: viewer, faction: 'Iron Veil' }), false);
});
