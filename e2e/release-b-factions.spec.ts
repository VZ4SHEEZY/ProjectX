import { test, expect, login, runtime } from './fixtures';

const loginAsCertificationUser = async (page:any, slug:string) => {
  const data=await runtime();
  await page.goto('/');
  await page.getByPlaceholder('your@email.com').fill(`qa_${data.runId}_${slug}@example.invalid`);
  await page.getByPlaceholder('••••••••').fill(data.password);
  await page.getByRole('button',{name:'ESTABLISH LINK'}).click();
  await expect(page.getByText('CYBER//DOPE',{exact:true}).first()).toBeVisible();
};

test('Unaffiliated users discover all 20 canonical factions and retain an intentional independent identity',async({monitoredPage:page})=>{
  const data=await runtime();
  await page.route('**/api/posts/feed/foryou?*',async route=>{const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,500));await route.fulfill({response});});
  await login(page);
  await page.getByRole('button',{name:'FACTION',exact:true}).click();
  await expect(page.getByText('INDEPENDENT BY CHOICE',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'EXPLORE FACTIONS'}).click();
  await expect(page.getByRole('heading',{name:'CyberDope Factions'})).toBeVisible();
  await expect(page.getByText('Independent by choice')).toBeVisible();
  await expect(page.getByTestId('faction-directory').getByRole('button')).toHaveCount(20);
  await page.goto(`/users/${data.certification.unaffiliated.username}`);
  await expect(page.getByText('Independent identity')).toBeVisible();
  await expect(page.getByText('Independent by choice. Full personal progression, no faction score.')).toBeVisible();
});

test('faction member and cross-faction destinations share one responsive route',async({monitoredPage:page},testInfo)=>{
  await loginAsCertificationUser(page,'faction01');
  await page.goto('/factions/neon_wraith');
  await expect(page.getByTestId('faction-destination')).toContainText('Neon Wraith');
  await expect(page.getByText('Your faction')).toBeVisible();
  await page.goto('/factions/iron_veil');
  await expect(page.getByText('Cross-faction view')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Recent faction activity'})).toBeVisible();
  if(testInfo.project.name.startsWith('mobile')) await expect(page.getByTestId('faction-destination')).toBeInViewport();
});

test('Following feed and friendship action remain distinct concepts',async({monitoredPage:page})=>{
  const data=await runtime(); await login(page);
  await page.goto('/feed');
  await expect(page.getByRole('button',{name:'FOLLOWING',exact:true})).toBeVisible();
  await page.goto(`/users/${data.certification.factionProfiles[0].username}`);
  await expect(page.getByRole('button',{name:/^(FOLLOW|FOLLOWING|REQUESTED)$/})).toBeVisible();
  await expect(page.getByRole('button',{name:/^(ADD FRIEND|UNFRIEND)$/})).toBeVisible();
});

test('Outrider route remains compatible with its staging gate',async({monitoredPage:page})=>{
  await login(page); await page.goto('/outrider');
  await expect(page.getByRole('heading',{name:'OUTRIDER',exact:true})).toBeVisible();
});


test('normal-user progression separates personal identity from faction contribution',async({monitoredPage:page})=>{
  await login(page);
  await page.goto('/profile');
  await expect(page.getByTestId('progression-panel')).toContainText('Personal progression');
  await expect(page.getByTestId('faction-contribution')).toContainText('No faction score is assigned.');
  await expect(page.getByTestId('progression-panel')).not.toContainText('Creator dimension');
});

test('returning users preserve their session and destination through a temporary API failure',async({page})=>{
  await login(page);
  const token=await page.evaluate(()=>localStorage.getItem('cdToken'));
  await page.route('**/api/auth/me',route=>route.fulfill({status:503,json:{message:'Temporary outage'}}));
  await page.goto('/factions/neon_wraith');
  await expect(page.getByText('Your session is saved. The network is temporarily unavailable.')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('cdToken'))).toBe(token);
  await page.unroute('**/api/auth/me');
  await page.getByRole('button',{name:'RETRY CONNECTION'}).click();
  await expect(page.getByTestId('faction-destination')).toContainText('Neon Wraith');
});

test('faction and progression notifications open their destination even without an actor',async({monitoredPage:page})=>{
  await login(page);
  await page.route('**/api/notifications?*',route=>route.fulfill({json:{success:true,data:[{_id:'faction',type:'faction_update',message:'Your faction has new activity',actor:null,read:true,createdAt:new Date().toISOString(),metadata:{factionName:'Iron Veil'}},{_id:'progression',type:'rank_up',message:'You ranked up',actor:null,read:true,createdAt:new Date().toISOString()}],unreadCount:0}}));
  await page.getByTitle('Notifications').click();
  await page.getByRole('button').filter({hasText:'Your faction has new activity'}).click();
  await expect(page.getByTestId('faction-destination')).toContainText('Iron Veil');
  await page.getByTitle('Notifications').click();
  await page.getByRole('button').filter({hasText:'You ranked up'}).click();
  await expect(page).toHaveURL(/\/profile$/);
});


test('member personal progression and faction contribution use distinct canonical checkpoints',async({monitoredPage:page})=>{
  await loginAsCertificationUser(page,'faction01');
  await page.goto('/profile');
  await expect(page.getByTestId('progression-panel')).toContainText('Personal progression');
  await expect(page.getByTestId('faction-contribution')).toContainText('25 legitimate activity contributed');
  await page.getByTestId('faction-contribution').getByRole('link').click();
  await expect(page.getByTestId('faction-destination')).toContainText('Neon Wraith');
  await expect(page.getByText('Combined legitimate member contribution. This is distinct from personal progression.')).toBeVisible();
  await expect(page.getByText('120',{exact:true})).toBeVisible();
});
