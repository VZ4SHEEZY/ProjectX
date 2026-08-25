/* Additive Release 1 backfill. Dry-run by default; legacy Users are never changed. */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const ProfileLayout = require('../models/ProfileLayout');
const ProfileModule = require('../models/ProfileModule');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Faction = require('../models/Faction');
const FactionMembership = require('../models/FactionMembership');
const Creator = require('../models/Creator');
const AccountCapability = require('../models/AccountCapability');
const PlatformRole = require('../models/PlatformRole');

const FOUNDING_FACTIONS = ['Neon Wraith','Iron Veil','Crimson Static','Void Circuit','Gold Syndicate','Azure Phantom','Toxic Bloom','Scarlet Dominion','Chrome Legion','Phantom Signal','Obsidian Pact','Ember Protocol','Violet Surge','Steel Covenant','Binary Ghost','Copper Throne','Nova Rift','Silver Wraith','Inferno Grid','Quantum Veil'];
const MODULE_TYPES = ['identity','bio','faction','top_friends','posts','media','links'];
const APPROVED = { users: 27, validFollows: 14, rejectedDanglingFollows: 8, profiles: 27, layouts: 27, modules: 189, factions: 20, memberships: 23, creators: 6, capabilities: 6, platformOwners: 1, totalInserts: 313 };
const MODELS = [ProfileLayout, ProfileModule, Follow, Block, FactionMembership, Creator, AccountCapability, PlatformRole, Profile, Faction];
const INDEXES = [[Profile,{user:1}],[ProfileLayout,{profile:1}],[ProfileModule,{profile:1,position:1}],[Follow,{follower:1,followed:1}],[Block,{blocker:1,blocked:1}],[Faction,{key:1}],[Faction,{name:1}],[FactionMembership,{user:1,status:1},{partialFilterExpression:{status:'active'}}],[Creator,{user:1}],[AccountCapability,{user:1,capability:1}],[PlatformRole,{user:1,role:1}]];
const slug = v => v.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const idxName = keys => Object.entries(keys).map(([k,v])=>`${k}_${v}`).join('_');

function analyzeLegacy(users) {
  const ids = new Set(users.map(u=>String(u._id))), follows = new Map(), blocks = new Map(), rejected = [];
  const add = (kind, source, raw) => { const target=String(raw), key=`${source._id}:${target}`; if (!mongoose.isValidObjectId(target)||!ids.has(target)) rejected.push({kind,reason:'dangling',sourceLegacyId:String(source._id)}); else if (String(source._id)===target) rejected.push({kind,reason:'self',sourceLegacyId:String(source._id)}); else (kind==='follow'?follows:blocks).set(key,kind==='follow'?{follower:source._id,followed:raw,sourceLegacyId:source._id}:{blocker:source._id,blocked:raw,sourceLegacyId:source._id}); };
  for (const user of users) { for (const target of user.following||[]) add('follow',user,target); for (const target of user.blockedUsers||[]) add('block',user,target); }
  return { validEdges:[...follows.values()], validBlocks:[...blocks.values()], rejected };
}
function malformedLayout(user) {
  const value=user.profileLayout||user.layout;
  if(!value)return false;
  if(Array.isArray(value))return value.some(x=>!x||typeof x!=='object'||!['x','y','w','h'].every(k=>Number.isFinite(x[k])));
  if(typeof value!=='object')return true;
  // Empty legacy zones are harmless defaults. Any populated zone needs manual
  // migration because legacy widget names/coordinates are not the V2 contract.
  return Object.values(value).some(zone=>!Array.isArray(zone)||zone.length>0);
}
async function readiness() {
  const out=[]; for (const [Model,keys,extra={}] of INDEXES) { const exists=(await mongoose.connection.db.listCollections({name:Model.collection.name}).toArray()).length; const found=exists&&(await Model.collection.indexes()).find(i=>JSON.stringify(i.key)===JSON.stringify(keys)); out.push({collection:Model.collection.name,name:idxName(keys),ready:Boolean(found&&found.unique),canCreate:!found||Boolean(found.unique),options:extra}); } return out;
}
async function ensureIndexes() { for (const [Model,keys,extra={}] of INDEXES) await Model.collection.createIndex(keys,{unique:true,name:idxName(keys),...extra}); const result=await readiness(); if(result.some(x=>!x.ready)) throw new Error('Required unique index verification failed'); return result; }

async function buildPreflight() {
  const users=await User.find({}).lean(), analysis=analyzeLegacy(users), ids=users.map(u=>u._id);
  const [profiles,factions,creators,caps,platformRoles,rules,links,indexes]=await Promise.all([Profile.find({user:{$in:ids}}).lean(),Faction.find({name:{$in:FOUNDING_FACTIONS}}).lean(),Creator.find({user:{$in:ids}}).lean(),AccountCapability.find({user:{$in:ids},capability:'creator_mode'}).lean(),PlatformRole.find({role:'platform_owner',state:'active'}).lean(),mongoose.connection.collection('accessrules').find({expression:{$exists:false},audience:{$exists:true}}).toArray(),mongoose.connection.collection('profilemodules').find({accessRule:{$exists:false},'accessRules.0':{$exists:true}}).toArray(),readiness()]);
  const legacyAdmins=users.filter(u=>u.isAdmin===true), expectedOwner=legacyAdmins.find(u=>u.username==='vz4sheezy');
  const ownerIdentityValid=legacyAdmins.length===1&&Boolean(expectedOwner)&&platformRoles.every(r=>String(r.user)===String(expectedOwner._id));
  const platformOwnersToCreate=ownerIdentityValid&&platformRoles.length===0?1:0;
  const pByUser=new Map(profiles.map(p=>[String(p.user),p])), pids=profiles.map(p=>p._id);
  const [layouts,modules,follows,blocks,members]=await Promise.all([ProfileLayout.find({profile:{$in:pids}}).lean(),ProfileModule.find({profile:{$in:pids}}).lean(),Follow.find({}).lean(),Block.find({}).lean(),FactionMembership.find({user:{$in:ids},status:'active'}).lean()]);
  const layoutSet=new Set(layouts.map(x=>String(x.profile))), moduleSet=new Set(modules.map(x=>String(x.profile))), followSet=new Set(follows.map(x=>`${x.follower}:${x.followed}`)), blockSet=new Set(blocks.map(x=>`${x.blocker}:${x.blocked}`)), memberSet=new Set(members.map(x=>String(x.user))), creatorSet=new Set(creators.map(x=>String(x.user))), capSet=new Set(caps.map(x=>String(x.user)));
  let pc=0,lc=0,mc=0,membership=0,creator=0,cap=0;
  for(const u of users){const p=pByUser.get(String(u._id));if(!p){pc++;lc++;mc+=7}else{if(!layoutSet.has(String(p._id)))lc++;if(!moduleSet.has(String(p._id)))mc+=7}if(u.faction&&u.faction!=='Unaffiliated'&&FOUNDING_FACTIONS.includes(u.faction)&&!memberSet.has(String(u._id)))membership++;if(u.isCreator||['pending','approved'].includes(u.creatorStatus)){if(!creatorSet.has(String(u._id)))creator++;if(!capSet.has(String(u._id)))cap++;}}
  const ftc=analysis.validEdges.filter(x=>!followSet.has(`${x.follower}:${x.followed}`)).length, btc=analysis.validBlocks.filter(x=>!blockSet.has(`${x.blocker}:${x.blocked}`)).length, fc=FOUNDING_FACTIONS.filter(n=>!factions.some(f=>f.name===n)).length;
  const projectedTotalInserts=pc+lc+mc+ftc+btc+fc+membership+creator+cap+platformOwnersToCreate;
  const reconciledTotalRecords=profiles.length+pc+layouts.length+lc+modules.length+mc+analysis.validEdges.length+analysis.validBlocks.length+factions.length+fc+members.length+membership+creators.length+creator+caps.length+cap+platformRoles.length+platformOwnersToCreate;
  const report={usersDiscovered:users.length,validFollows:analysis.validEdges.length,followsToCreate:ftc,rejectedDanglingFollows:analysis.rejected.filter(x=>x.kind==='follow'&&x.reason==='dangling').length,rejectedSelfFollows:analysis.rejected.filter(x=>x.kind==='follow'&&x.reason==='self').length,rejectedInvalidBlocks:analysis.rejected.filter(x=>x.kind==='block').length,profilesToCreate:pc,layoutsToCreate:lc,modulesToCreate:mc,factionsToCreate:fc,membershipsToCreate:membership,creatorsToCreate:creator,capabilitiesToCreate:cap,platformOwnersToCreate,platformOwnerIdentity:{expectedUsernamePresent:Boolean(users.some(u=>u.username==='vz4sheezy')),legacyAdminCount:legacyAdmins.length,durableLegacyAdminMatch:ownerIdentityValid,existingActivePlatformOwners:platformRoles.length,retainsLegacyAdminAuthority:Boolean(expectedOwner?.isAdmin),authorityModelReady:ownerIdentityValid},blocksToCreate:btc,malformedLegacyLayouts:users.filter(malformedLayout).length,discardedLegacyCustomCss:users.filter(u=>(typeof u.customCss==='string'&&u.customCss.trim())||(typeof u.theme?.customCss==='string'&&u.theme.customCss.trim())).length,legacyAccessRulesRequiringConversion:rules.length,legacyModuleRuleLinksRequiringConversion:links.length,projectedTotalInserts,reconciledTotalRecords,reconciledProfiles:profiles.length+pc,reconciledLayouts:layouts.length+lc,reconciledModules:modules.length+mc,reconciledFactions:factions.length+fc,reconciledMemberships:members.length+membership,reconciledCreators:creators.length+creator,reconciledCapabilities:caps.length+cap,reconciledPlatformOwners:platformRoles.length+platformOwnersToCreate,indexReadiness:indexes,indexesReady:indexes.every(x=>x.ready),indexesCreatable:indexes.every(x=>x.canCreate),rollbackReady:MODELS.every(M=>M.schema.path('migrationRunId')),topFriendsToCreate:0};
  return {users,analysis,report,expectedOwner};
}
function approvedDifferences(r){const got={users:r.usersDiscovered,validFollows:r.validFollows,rejectedDanglingFollows:r.rejectedDanglingFollows,profiles:r.reconciledProfiles,layouts:r.reconciledLayouts,modules:r.reconciledModules,factions:r.reconciledFactions,memberships:r.reconciledMemberships,creators:r.reconciledCreators,capabilities:r.reconciledCapabilities,platformOwners:r.reconciledPlatformOwners,totalInserts:r.reconciledTotalRecords};return Object.entries(APPROVED).filter(([k,v])=>got[k]!==v).map(([k,v])=>({metric:k,approved:v,observed:got[k]}));}
function validateRunId(id){if(!id||!/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(id))throw new Error('A non-ambiguous migrationRunId (8-128 safe characters) is required');}

async function applyMigration({migrationRunId,override=false,manifestPath,failAfter=0}){
  validateRunId(migrationRunId); if((await Promise.all(MODELS.map(M=>M.exists({migrationRunId})))).some(Boolean))throw new Error(`migrationRunId already exists: ${migrationRunId}`);
  const pre=await buildPreflight(), diffs=approvedDifferences(pre.report); if(!pre.report.platformOwnerIdentity.authorityModelReady)throw new Error('Platform owner durable identity preflight failed'); if(diffs.length&&!override)throw new Error(`Approved reconciliation mismatch; apply aborted: ${JSON.stringify(diffs)}`); if(pre.report.legacyAccessRulesRequiringConversion||pre.report.legacyModuleRuleLinksRequiringConversion)throw new Error('Legacy access-rule conversion requires a separately reversible migration'); if(!pre.report.indexesCreatable||!pre.report.rollbackReady)throw new Error('Index or rollback preflight failed'); pre.report.indexReadiness=await ensureIndexes();pre.report.indexesReady=true;
  const manifest={migrationRunId,records:[]}; let inserts=0; const session=await mongoose.startSession();
  const record=(doc,M)=>{manifest.records.push({collection:M.collection.name,id:String(doc._id)});if(failAfter&&++inserts>=failAfter)throw new Error('Injected migration failure');};
  try{await session.withTransaction(async()=>{
    for(const name of FOUNDING_FACTIONS)if(!await Faction.exists({name}).session(session)){const d=(await Faction.create([{key:slug(name),name,founding:true,status:'active',migrationRunId}],{session}))[0];record(d,Faction)}
    if(!await PlatformRole.exists({user:pre.expectedOwner._id,role:'platform_owner'}).session(session)){const d=(await PlatformRole.create([{user:pre.expectedOwner._id,role:'platform_owner',state:'active',grantedAt:pre.expectedOwner.adminSince||new Date(),source:'legacy_backfill',migrationRunId,sourceLegacyId:pre.expectedOwner._id,reasonCode:'legacy_primary_admin'}],{session}))[0];record(d,PlatformRole)}
    for(const u of pre.users){let p=await Profile.findOne({user:u._id}).session(session);if(!p){p=(await Profile.create([{user:u._id,source:'legacy_backfill',migrationRunId,sourceLegacyId:u._id,displayName:u.displayName||'',bio:u.bio||'',avatar:u.avatar||'',banner:u.banner||'',locationLabel:u.location||'',website:u.website||'',socialLinks:u.socialLinks||{},privacy:u.profilePrivacy||'public',followApprovalRequired:u.isPrivate===true}],{session}))[0];record(p,Profile)}if(!await ProfileLayout.exists({profile:p._id}).session(session)){const d=(await ProfileLayout.create([{profile:p._id,theme:{...(u.theme||{}),customCss:undefined},factionStarterTheme:'full',version:1,migrationRunId,sourceLegacyId:u._id}],{session}))[0];record(d,ProfileLayout)}if(!await ProfileModule.exists({profile:p._id}).session(session))for(const [position,type]of MODULE_TYPES.entries()){const d=(await ProfileModule.create([{profile:p._id,type,position,enabled:true,config:{},schemaVersion:1,migrationRunId,sourceLegacyId:u._id}],{session}))[0];record(d,ProfileModule)}if(u.faction&&u.faction!=='Unaffiliated'&&FOUNDING_FACTIONS.includes(u.faction)&&!await FactionMembership.exists({user:u._id,status:'active'}).session(session)){const f=await Faction.findOne({name:u.faction}).session(session),d=(await FactionMembership.create([{user:u._id,faction:f._id,status:'active',source:'legacy_backfill',joinedAt:u.createdAt||new Date(),migrationRunId,sourceLegacyId:u._id}],{session}))[0];record(d,FactionMembership)}if(u.isCreator||['pending','approved'].includes(u.creatorStatus)){const state=u.isCreator||u.creatorStatus==='approved'?'active':'pending';if(!await Creator.exists({user:u._id}).session(session)){const d=(await Creator.create([{user:u._id,state,source:'legacy_backfill',migrationRunId,sourceLegacyId:u._id}],{session}))[0];record(d,Creator)}if(!await AccountCapability.exists({user:u._id,capability:'creator_mode'}).session(session)){const d=(await AccountCapability.create([{user:u._id,capability:'creator_mode',state:state==='active'?'enabled':'pending',migrationRunId,sourceLegacyId:u._id}],{session}))[0];record(d,AccountCapability)}}}
    for(const e of pre.analysis.validEdges)if(!await Follow.exists({follower:e.follower,followed:e.followed}).session(session)){const d=(await Follow.create([{...e,source:'legacy_backfill',migrationRunId}],{session}))[0];record(d,Follow)}for(const e of pre.analysis.validBlocks)if(!await Block.exists({blocker:e.blocker,blocked:e.blocked}).session(session)){const d=(await Block.create([{...e,source:'legacy_backfill',migrationRunId}],{session}))[0];record(d,Block)}
  })}finally{await session.endSession()}
  // withTransaction may retry its callback with fresh document IDs. Build the
  // manifest from committed run provenance, never from callback side effects.
  manifest.records=[];
  for(const M of MODELS){const committed=await M.find({migrationRunId}).select('_id').lean();for(const doc of committed)manifest.records.push({collection:M.collection.name,id:String(doc._id)})}
  const target=manifestPath||path.join(__dirname,'..','migration-manifests',`${migrationRunId}.json`);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,`${JSON.stringify(manifest,null,2)}\n`,{flag:'wx',mode:0o600});return{mode:'apply',migrationRunId,preflight:pre.report,inserted:manifest.records.length,manifest:target};
}
async function rollbackMigration({migrationRunId,dryRun=true}){validateRunId(migrationRunId);const counts={};for(const M of MODELS)counts[M.collection.name]=await M.countDocuments({migrationRunId});const total=Object.values(counts).reduce((a,b)=>a+b,0);if(!total)throw new Error(`No records found for migrationRunId: ${migrationRunId}`);if(!dryRun){const s=await mongoose.startSession();try{await s.withTransaction(async()=>{for(const M of MODELS)await M.deleteMany({migrationRunId},{session:s})})}finally{await s.endSession()}}return{mode:dryRun?'rollback-dry-run':'rollback',migrationRunId,recordsMatched:total,collections:counts};}
function args(argv){const val=f=>{const i=argv.indexOf(f);return i<0?undefined:argv[i+1]},apply=argv.includes('--apply'),rollback=argv.includes('--rollback');if(apply&&rollback)throw new Error('--apply and --rollback are mutually exclusive');return{apply,rollback,override:argv.includes('--override-approved-counts'),dryRun:!apply||argv.includes('--dry-run'),migrationRunId:val('--migration-run-id'),manifestPath:val('--manifest')}}
async function cli(){const a=args(process.argv.slice(2));if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required');await mongoose.connect(process.env.MONGODB_URI,{autoIndex:false,autoCreate:false});try{if(a.rollback)return console.log(JSON.stringify(await rollbackMigration(a),null,2));if(a.apply)return console.log(JSON.stringify(await applyMigration({...a,migrationRunId:a.migrationRunId||`release1_${Date.now()}_${crypto.randomUUID()}`}),null,2));const p=await buildPreflight();console.log(JSON.stringify({mode:'dry-run',migrationRunId:a.migrationRunId||`release1_${Date.now()}_${crypto.randomUUID()}`,...p.report,approvedDifferences:approvedDifferences(p.report)},null,2))}finally{await mongoose.disconnect()}}
if(require.main===module)cli().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={FOUNDING_FACTIONS,MODULE_TYPES,APPROVED,analyzeLegacy,buildPreflight,ensureIndexes,applyMigration,rollbackMigration,approvedDifferences};
