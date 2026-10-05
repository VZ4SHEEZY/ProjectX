'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'release-b-factions-test-secret';
const User = require('../models/User');
const Faction = require('../models/Faction');
const FactionMembership = require('../models/FactionMembership');
const ProgressionProjection = require('../models/ProgressionProjection');
const Post = require('../models/Post');
const factionsRouter = require('../routes/factions');
const { FACTION_CATALOG, keyFor } = require('../services/factionCatalog');
let mongo;
const app = express(); app.use(express.json()); app.use('/api/factions', factionsRouter);
test.before(async()=>{mongo=await MongoMemoryServer.create({binary:{version:'7.0.14'}});await mongoose.connect(mongo.getUri())});
test.after(async()=>{await mongoose.disconnect();await mongo.stop()});
test.beforeEach(async()=>{await mongoose.connection.dropDatabase()});
const tokenFor=user=>jwt.sign({userId:user._id},process.env.JWT_SECRET);

test('faction directory uses canonical identity and reports viewer relationship without forcing membership',async()=>{
  const faction=await Faction.create({key:'neon_wraith',name:'Neon Wraith'});
  const independent=await User.create({username:'independent_b',email:'independent-b@example.test',password:'password',faction:'Unaffiliated'});
  const response=await request(app).get('/api/factions').set('Authorization',`Bearer ${tokenFor(independent)}`);
  assert.equal(response.status,200); assert.equal(response.body.data[0].name,'Neon Wraith'); assert.equal(response.body.data[0].relationship,'unaffiliated');
  assert.match(response.body.data[0].description,/ghost in every system/); assert.equal(await FactionMembership.countDocuments({user:independent._id}),0);
  assert.equal(faction.name,'Neon Wraith');
});

test('faction detail separates overall projection, authorized content, and public community',async()=>{
  const faction=await Faction.create({key:'void_circuit',name:'Void Circuit'});
  const member=await User.create({username:'circuit_member',email:'member-b@example.test',password:'password',faction:'Void Circuit',profilePrivacy:'public'});
  const hidden=await User.create({username:'hidden_member',email:'hidden-b@example.test',password:'password',faction:'Void Circuit',profilePrivacy:'private',isPrivate:true});
  const outsider=await User.create({username:'independent_viewer',email:'viewer-b@example.test',password:'password',faction:'Unaffiliated'});
  await FactionMembership.create([{user:member._id,faction:faction._id},{user:hidden._id,faction:faction._id}]);
  await ProgressionProjection.create({scope:'faction',subjectId:faction.key,projectionContextId:'b-test',policyId:'test',policyVersion:'1',policyArtifactDigest:'digest',evaluationGeneration:'test',projectionContext:{},checkpoint:{total:42.125,contributors:{[member._id]:12}},rebuiltAt:new Date()});
  await Post.create({author:member._id,type:'text',content:'public circuit transmission',faction:faction.name,visibility:'public'});
  await Post.create({author:member._id,type:'text',content:'members only',faction:faction.name,visibility:'faction'});
  const response=await request(app).get(`/api/factions/${faction.key}`).set('Authorization',`Bearer ${tokenFor(outsider)}`);
  assert.equal(response.status,200); assert.equal(response.body.data.progression.total,42.12); assert.deepEqual(response.body.data.members.map(value=>value.username),['circuit_member']);
  assert.deepEqual(response.body.data.activity.map(value=>value.content),['public circuit transmission']);
});

test('Unaffiliated is not exposed as a faction destination',async()=>{
  assert.equal((await request(app).get('/api/factions/unaffiliated')).status,404);
});

test('all canonical factions resolve through the shared data-driven destination',async()=>{
  const factions = Object.values(FACTION_CATALOG);
  assert.equal(factions.length,20);
  await Faction.create(factions.map(({name,color})=>({key:keyFor(name),name,color,status:'active',founding:true})));
  const directory=await request(app).get('/api/factions');
  assert.equal(directory.status,200); assert.equal(directory.body.data.length,20);
  for(const identity of factions){
    const response=await request(app).get(`/api/factions/${keyFor(identity.name)}`);
    assert.equal(response.status,200,identity.name);
    assert.equal(response.body.data.name,identity.name);
    assert.equal(response.body.data.description,identity.description);
  }
});

test('faction payload excludes private progression and anti-abuse internals',async()=>{
  const faction=await Faction.create({key:'neon_wraith',name:'Neon Wraith'});
  await ProgressionProjection.create({scope:'faction',subjectId:faction.key,projectionContextId:'privacy-test',policyId:'private-policy',policyVersion:'secret-version',policyArtifactDigest:'secret-digest',evaluationGeneration:'secret-generation',projectionContext:{internal:'secret'},checkpoint:{total:7,contributors:{hidden:99}},rebuiltAt:new Date()});
  const response=await request(app).get(`/api/factions/${faction.key}`);
  assert.equal(response.status,200); assert.equal(response.body.data.progression.total,7);
  const serialized=JSON.stringify(response.body);
  for(const forbidden of ['contributors','policyId','policyVersion','policyArtifactDigest','evaluationGeneration','projectionContext','secret-digest']) assert.equal(serialized.includes(forbidden),false,forbidden);
});


test('member-only announcements and private post internals stay out of cross-faction responses',async()=>{
  const Announcement=require('../models/Announcement');
  const faction=await Faction.create({key:'neon_wraith',name:'Neon Wraith'});
  const member=await User.create({username:'announcement_member',email:'announce@example.test',password:'password',faction:faction.name});
  const outsider=await User.create({username:'announcement_outsider',email:'outside@example.test',password:'password',faction:'Unaffiliated'});
  await Announcement.create([{title:'Public',message:'public news',targetType:'all',createdBy:member._id},{title:'Private',message:'member news',targetType:'faction',targetFaction:faction.name,createdBy:member._id}]);
  await Post.create({author:member._id,type:'text',content:'safe public text',faction:faction.name,unlocks:[{user:outsider._id,amount:9}],reports:[{user:outsider._id,reason:'secret report'}],likedBy:[outsider._id],earnings:11});
  const response=await request(app).get(`/api/factions/${faction.key}`).set('Authorization',`Bearer ${tokenFor(outsider)}`);
  assert.deepEqual(response.body.data.announcements.map(item=>item.title),['Public']);
  const serialized=JSON.stringify(response.body.data.activity);
  for(const forbidden of ['unlocks','reports','likedBy','earnings','secret report']) assert.equal(serialized.includes(forbidden),false,forbidden);
  const memberResponse=await request(app).get(`/api/factions/${faction.key}`).set('Authorization',`Bearer ${tokenFor(member)}`);
  assert.equal(memberResponse.body.data.announcements.length,2);
});

test('deleted and deactivated authors are safely omitted',async()=>{
  const faction=await Faction.create({key:'iron_veil',name:'Iron Veil'});
  const inactive=await User.create({username:'inactive_b',email:'inactive@example.test',password:'password',faction:faction.name,isActive:false});
  await FactionMembership.create({user:inactive._id,faction:faction._id});
  await Post.create([{author:inactive._id,type:'text',content:'inactive',faction:faction.name},{author:new mongoose.Types.ObjectId(),type:'text',content:'deleted',faction:faction.name}]);
  const response=await request(app).get(`/api/factions/${faction.key}`);
  assert.equal(response.status,200);assert.deepEqual(response.body.data.activity,[]);assert.deepEqual(response.body.data.members,[]);
});
