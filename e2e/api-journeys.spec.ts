import { test, expect, runtime, userFor } from './fixtures';
import { io } from 'socket.io-client';

test('social, content, comments, DM unread, and creator tiers persist', async ({ request }) => {
  const data = await runtime();
  const auth = async (role: string) => { const user = userFor(data, role); const r = await request.post(`${data.apiURL}/auth/login`, { data: { email: user.email, password: data.password } }); return { user, token: (await r.json()).token }; };
  const primary = await auth('primary'), peer = await auth('peer'), creator = await auth('creator');
  const headers = (token: string) => ({ authorization: `Bearer ${token}` });
  const follow = await request.post(`${data.apiURL}/users/${peer.user.id}/follow`, { headers: headers(primary.token) });
  expect(follow.ok()).toBeTruthy(); expect((await follow.json()).followersCount).toBeGreaterThanOrEqual(0);
  expect((await request.post(`${data.apiURL}/users/${peer.user.id}/follow`, { headers: headers(primary.token) })).ok()).toBeTruthy();
  const post = await request.post(`${data.apiURL}/posts`, { headers: headers(primary.token), data: { type: 'text', content: `E2E ${data.runId}`, description: `E2E ${data.runId}`, visibility: 'public' } });
  expect(post.status()).toBe(201); const postId = (await post.json()).data._id;
  expect((await request.post(`${data.apiURL}/posts/${postId}/like`, { headers: headers(peer.token) })).ok()).toBeTruthy();
  const comment = await request.post(`${data.apiURL}/posts/${postId}/comments`, { headers: headers(peer.token), data: { content: 'deterministic comment' } });
  expect(comment.status()).toBe(201); const commentId = (await comment.json()).data._id;
  expect((await request.post(`${data.apiURL}/posts/${postId}/comments`, { headers: headers(primary.token), data: { content: 'deterministic reply', parentCommentId: commentId } })).status()).toBe(201);
  expect((await request.post(`${data.apiURL}/comments/not-an-id/like`, { headers: headers(primary.token) })).status()).toBe(400);
  expect((await request.get(`${data.apiURL}/search?q=${encodeURIComponent(primary.user.username)}`)).ok()).toBeTruthy();
  const socketOrigin = data.apiURL.replace(/\/api$/, '');
  const peerSocket = io(socketOrigin, { auth: { token: peer.token }, transports: ['websocket'], reconnection: false });
  await new Promise<void>((resolve, reject) => { peerSocket.once('connect', resolve); peerSocket.once('connect_error', reject); });
  const received = new Promise<any>((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Realtime message timeout')), 5000); peerSocket.once('message', message => { clearTimeout(timeout); resolve(message); }); });
  expect((await request.post(`${data.apiURL}/messages`, { headers: headers(primary.token), data: { recipientId: peer.user.id, content: `realtime ${data.runId}`, isVanishing: false } })).ok()).toBeTruthy();
  expect((await received).content).toBe(`realtime ${data.runId}`);
  peerSocket.disconnect(); peerSocket.connect();
  await new Promise<void>((resolve, reject) => { peerSocket.once('connect', resolve); peerSocket.once('connect_error', reject); });
  peerSocket.disconnect();
  expect((await (await request.get(`${data.apiURL}/messages/unread/count`, { headers: headers(peer.token) })).json()).unreadCount).toBeGreaterThanOrEqual(1);
  const tiers = [{ name: 'QA Tier', price: 3, description: 'persistent', benefits: ['test'], color: 'gray', icon: 'star', isActive: true }];
  expect((await request.put(`${data.apiURL}/creator/subscription-tiers`, { headers: headers(creator.token), data: { tiers } })).ok()).toBeTruthy();
  const fetched = await (await request.get(`${data.apiURL}/creator/subscription-tiers`, { headers: headers(creator.token) })).json();
  expect(fetched.data[0]).toMatchObject({ name: 'QA Tier', price: 3 });
});

test('wallet and payment failure paths never require a real wallet', async ({ request }) => {
  const data = await runtime(), primary = userFor(data, 'primary');
  const auth = await request.post(`${data.apiURL}/auth/login`, { data: { email: primary.email, password: data.password } });
  const token = (await auth.json()).token, headers = { authorization: `Bearer ${token}` };
  expect((await request.post(`${data.apiURL}/wallet/connect`, { headers, data: { address: '0x0000000000000000000000000000000000000001', signature: '0x00', challengeId: 'invalid' } })).status()).toBeGreaterThanOrEqual(400);
  expect((await request.post(`${data.apiURL}/tips/intents`, { headers, data: { creatorId: userFor(data, 'creator').id, amount: '1.00' } })).status()).toBe(503);
});
