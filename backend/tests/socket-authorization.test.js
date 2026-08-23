const test = require('node:test');
const assert = require('node:assert/strict');

const User = require('../models/User');
const Stream = require('../models/Stream');
const Group = require('../models/Group');
const { authorizeRoom, registerAuthorizedSocketHandlers } = require('../services/socketAuthorization');

const userId = '507f1f77bcf86cd799439011';
const otherUserId = '507f191e810c19729de860ea';
const thirdUserId = '507f191e810c19729de860eb';
const original = {
  userExists: User.exists,
  streamFindOne: Stream.findOne,
  streamExists: Stream.exists,
  groupExists: Group.exists
};

test.afterEach(() => {
  User.exists = original.userExists;
  Stream.findOne = original.streamFindOne;
  Stream.exists = original.streamExists;
  Group.exists = original.groupExists;
});

test('conversation rooms reject authenticated users who are not participants', async () => {
  User.exists = async () => ({ _id: otherUserId });
  const authorization = await authorizeRoom(`conversation:${otherUserId}:${thirdUserId}`, userId);
  assert.equal(authorization, null);
});

test('group rooms reject non-members', async () => {
  Group.exists = async () => null;
  assert.equal(await authorizeRoom(`group:${otherUserId}`, userId), null);
});

test('unknown and inactive stream rooms are rejected', async () => {
  Stream.findOne = () => ({ select: () => ({ lean: async () => null }) });
  assert.equal(await authorizeRoom(otherUserId, userId), null);
  assert.equal(await authorizeRoom('arbitrary-room', userId), null);
});

test('unauthorized room joins do not join or enable broadcasts', async () => {
  const handlers = new Map();
  const joined = [];
  const emitted = [];
  const socket = {
    userId,
    on: (event, handler) => handlers.set(event, handler),
    join: async (room) => joined.push(room),
    leave: async () => {},
    to: () => ({ emit: (...args) => emitted.push(args) }),
    broadcast: { emit: (...args) => emitted.push(args) }
  };
  registerAuthorizedSocketHandlers({}, socket);

  let acknowledgement;
  await handlers.get('join-room')('arbitrary-room', (value) => { acknowledgement = value; });
  handlers.get('typing')({ roomId: 'arbitrary-room', isTyping: true });
  handlers.get('stream-message')({ streamId: 'arbitrary-room', message: 'intrusion' });

  assert.deepEqual(acknowledgement, { success: false, error: 'Room access denied' });
  assert.deepEqual(joined, []);
  assert.deepEqual(emitted, []);
});
