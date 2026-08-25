import { test, expect, login } from './fixtures';
import { mkdir } from 'node:fs/promises';

test.skip(!process.env.VISUAL_QA, 'Run explicitly to create final visual QA artifacts');
test.setTimeout(180_000);
const out='artifacts/release2-final-visual-qa';
const factions=['Neon Wraith','Iron Veil','Crimson Static','Void Circuit','Gold Syndicate','Azure Phantom','Toxic Bloom','Scarlet Dominion','Chrome Legion','Phantom Signal','Obsidian Pact','Ember Protocol','Violet Surge','Steel Covenant','Binary Ghost','Copper Throne','Nova Rift','Silver Wraith','Inferno Grid','Quantum Veil'];
const modules=['identity','bio','faction','top_friends','posts','media','links'].map((type,position)=>({_id:`module-${type}`,type,position,enabled:true,config:type==='bio'?{text:'A long-form signal about art, technology, community, and the strange futures we are building together. This profile is intentionally populated to verify variable-height modules without leaving a giant blank hole beside Top Friends.'}:type==='identity'?{tagline:'Personal signal. Faction roots. No templates.'}:type==='media'?{limit:6}:{}}));
const friends=Array.from({length:8},(_,i)=>({_id:`friend-${i}`,username:`signal_${i+1}`,displayName:['Muse','Heretic','Nyx','Rook','Vega','Zero','Echo','Iris'][i],avatar:`https://api.dicebear.com/7.x/avataaars/svg?seed=top-${i}`}));
const posts=Array.from({length:6},(_,i)=>({_id:`post-${i}`,description:`Transmission ${i+1}: populated visual QA content`,mediaUrl:i<4?`https://picsum.photos/seed/cyberdope-${i}/640/640`:undefined,thumbnailUrl:i<4?`https://picsum.photos/seed/cyberdope-${i}/640/640`:undefined}));

async function mockPublic(page:any,{faction='Unaffiliated',creator=false,influence='full',theme={},locked=false,username='visual_signal'}:any={}){
  const owner={_id:'visual-user',id:'visual-user',username,displayName:creator?'Nova Vale — Creator':'Nova Vale',avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=visual-owner',banner:'https://picsum.photos/seed/cyberdope-banner/1400/440',bio:'Independent signal',faction,followersCount:481,followingCount:92,postsCount:6,isCreator:creator,website:'https://example.com',socialLinks:{instagram:'https://example.com/instagram'}};
  const active=[...modules]; if(creator)active.splice(1,0,{_id:'module-creator',type:'creator_summary',position:1,enabled:true,config:{heading:'Worlds, motion, and midnight transmissions',description:'A creator-led profile where original work lives inside the same social identity.'}} as any); if(locked)active.splice(3,0,{_id:'module-locked',type:'media',position:3,locked:true,requirements:{op:'or',children:[{op:'predicate',type:'friends'},{op:'predicate',type:'subscribers'}]}} as any);
  await page.route('**/api/users/**',async(route:any)=>{if(route.request().method()!=='GET')return route.continue();await route.fulfill({json:{success:true,data:{user:owner}}})});
  await page.route('**/api/profiles/visual-user',async(route:any)=>route.fulfill({json:{success:true,data:{owner,profile:{user:'visual-user',bio:owner.bio},layout:{factionStarterTheme:influence,theme},modules:active}}}));
  await page.route('**/api/posts**',async(route:any)=>route.fulfill({json:{success:true,data:posts}}));
  await page.route('**/api/social/top-friends/visual-user',async(route:any)=>route.fulfill({json:{success:true,data:friends.map((friend,position)=>({friend,position}))}}));
}
async function capturePublic(page:any,name:string){await page.goto('/users/visual_signal');await expect(page.getByTestId('profile-v2-modules')).toBeVisible();await page.waitForTimeout(300);await page.screenshot({path:`${out}/${name}.png`,fullPage:true});}

test('capture final Profile V2 public, faction, creator, lock, and individuality states',async({monitoredPage:page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','desktop capture run'); await mkdir(out,{recursive:true}); await login(page);
  for(let i=0;i<factions.length;i++){await page.unrouteAll({behavior:'wait'});await mockPublic(page,{faction:factions[i]});await capturePublic(page,`faction-${String(i+1).padStart(2,'0')}-${factions[i].toLowerCase().replaceAll(' ','-')}`)}
  for(const influence of ['full','partial','off']){await page.unrouteAll({behavior:'wait'});await mockPublic(page,{faction:'Obsidian Pact',influence});await capturePublic(page,`influence-${influence}`)}
  await page.unrouteAll({behavior:'wait'});await mockPublic(page,{faction:'Unaffiliated',username:'vz4sheezy'});await capturePublic(page,'unaffiliated-vz4sheezy');
  await page.unrouteAll({behavior:'wait'});await mockPublic(page,{faction:'Nova Rift',creator:true});await capturePublic(page,'creator-profile-desktop');
  await page.unrouteAll({behavior:'wait'});await mockPublic(page,{faction:'Binary Ghost',locked:true});await capturePublic(page,'locked-preview');
  await page.unrouteAll({behavior:'wait'});await mockPublic(page,{faction:'Obsidian Pact',theme:{primaryColor:'#ff4f9a',backgroundColor:'#170516',fontFamily:'serif',layoutStyle:'single',borderRadius:'large',spacing:'spacious'}});await capturePublic(page,'same-faction-obsidian-personal-a');
  await page.unrouteAll({behavior:'wait'});await mockPublic(page,{faction:'Obsidian Pact',theme:{primaryColor:'#62ffe5',secondaryColor:'#2850ff',backgroundColor:'#020b13',fontFamily:'sans',layoutStyle:'masonry',borderStyle:'minimal',spacing:'compact'}});await capturePublic(page,'same-faction-obsidian-personal-b');
});

test('capture mobile public and creator profiles',async({monitoredPage:page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium','Pixel 7 capture run');await mkdir(out,{recursive:true});await login(page);await mockPublic(page,{faction:'Toxic Bloom'});await capturePublic(page,'mobile-public-pixel-7');await page.unrouteAll({behavior:'wait'});await mockPublic(page,{faction:'Nova Rift',creator:true});await capturePublic(page,'mobile-creator-pixel-7');
});

test('capture desktop and mobile Studio states',async({monitoredPage:page},testInfo)=>{
  await mkdir(out,{recursive:true});await login(page);if(testInfo.project.name==='mobile-chromium'){await page.getByLabel('Open navigation').click();await page.getByRole('button',{name:'PROFILE STUDIO'}).click();await expect(page.getByTestId('profile-v2-studio')).toBeVisible();await page.screenshot({path:`${out}/profile-studio-mobile-pixel-7.png`,fullPage:true});return}
  await page.getByLabel('Open Profile Studio').click();await expect(page.getByTestId('profile-v2-studio')).toBeVisible();await page.screenshot({path:`${out}/profile-studio-design.png`,fullPage:true});
  await page.getByRole('button',{name:'modules',exact:true}).click();await page.screenshot({path:`${out}/profile-studio-modules.png`,fullPage:true});
  await page.getByRole('button',{name:'access',exact:true}).click();await page.getByText('Add access rule').click();const mode=page.getByLabel('Rule operator').last();await mode.selectOption('and');await page.screenshot({path:`${out}/access-rule-and.png`,fullPage:true});await mode.selectOption('or');await page.screenshot({path:`${out}/access-rule-or.png`,fullPage:true});
  await page.getByRole('button',{name:'friends',exact:true}).click();await page.screenshot({path:`${out}/top-friends-editor.png`,fullPage:true});
});

test('build all-20-factions contact sheet',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','desktop contact sheet');await mkdir(out,{recursive:true});
  const cards=factions.map((faction,index)=>`<figure><img src="http://127.0.0.1:4173/${out}/faction-${String(index+1).padStart(2,'0')}-${faction.toLowerCase().replaceAll(' ','-')}.png"><figcaption>${String(index+1).padStart(2,'0')} — ${faction}</figcaption></figure>`).join('');
  await page.setViewportSize({width:1600,height:1000});await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#030303;color:white;font:16px ui-monospace,monospace}h1{color:#39ff14;letter-spacing:.12em}main{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0;border:1px solid #333;background:#090909;padding:8px}img{width:100%;height:390px;object-fit:cover;object-position:top}figcaption{padding:10px 4px 3px;color:#ddd}</style><h1>CYBERDOPE — 20 FOUNDING FACTION STARTERS</h1><main>${cards}</main>`);await page.waitForLoadState('networkidle');await page.screenshot({path:`${out}/all-20-factions-contact-sheet.png`,fullPage:true});
});
