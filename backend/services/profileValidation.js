const FACTIONS = ['Neon Wraith','Iron Veil','Crimson Static','Void Circuit','Gold Syndicate','Azure Phantom','Toxic Bloom','Scarlet Dominion','Chrome Legion','Phantom Signal','Obsidian Pact','Ember Protocol','Violet Surge','Steel Covenant','Binary Ghost','Copper Throne','Nova Rift','Silver Wraith','Inferno Grid','Quantum Veil','Unaffiliated'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const URL_FIELDS = new Set(['avatar', 'banner', 'website', 'backgroundImage']);
const THEME_KEYS = new Set(['primaryColor','secondaryColor','accentColor','backgroundColor','fontFamily','fontSize','animations','glowEffects','scanlines','backgroundImage','cursorEffect','layoutStyle','borderStyle','borderRadius','spacing','effectIntensity']);
const LAYOUT_KEYS = new Set(['leftZone','rightZone','bottomZone','hiddenWidgets','mobileOrder']);
const MODULES = new Set(['identity','bio','faction','top_friends','posts','media','links','creator_summary']);
const THEME_ENUMS = {
  fontFamily: new Set(['mono','sans','serif','display']), fontSize: new Set(['small','medium','large']),
  cursorEffect: new Set(['none','glow','trail']), layoutStyle: new Set(['single','sidebar-left','sidebar-right','masonry']),
  borderStyle: new Set(['minimal','solid','double','glow']), borderRadius: new Set(['none','small','medium','large']),
  spacing: new Set(['compact','comfortable','spacious']), effectIntensity: new Set(['off','low','medium'])
};

const cleanString = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : undefined;
const safeUrl = value => {
  if (value === '') return '';
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined; } catch { return undefined; }
};

function validateProfileUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Profile update must be an object' };
  const allowed = new Set(['displayName','bio','avatar','banner','location','website','socialLinks','theme','profileLayout','profilePrivacy','isPrivate','showOnlineStatus','allowDMs','dmAudience','friendRequestAudience']);
  const unknown = Object.keys(body).filter(key => !allowed.has(key));
  if (unknown.length) return { error: `Unsupported profile fields: ${unknown.join(', ')}` };
  const update = {};
  for (const [key, max] of [['displayName',50],['bio',500],['location',100]]) if (body[key] !== undefined) {
    const value = cleanString(body[key], max); if (value === undefined) return { error: `${key} must be a string` }; update[key] = value;
  }
  for (const key of ['avatar','banner','website']) if (body[key] !== undefined) {
    const value = safeUrl(body[key]); if (value === undefined) return { error: `${key} must be an http(s) URL` }; update[key] = value;
  }
  if (body.profilePrivacy !== undefined) { if (!['public','users','followers','friends','private'].includes(body.profilePrivacy)) return { error: 'Invalid profile privacy' }; update.profilePrivacy = body.profilePrivacy; }
  if (body.dmAudience !== undefined) { if (!['nobody','friends','mutual_follows','subscribers','friends_subscribers','everyone'].includes(body.dmAudience)) return { error: 'Invalid DM audience' }; update.dmAudience = body.dmAudience; }
  if (body.friendRequestAudience !== undefined) { if (!['nobody','users','followers','friends_of_friends','everyone'].includes(body.friendRequestAudience)) return { error: 'Invalid friend request audience' }; update.friendRequestAudience = body.friendRequestAudience; }
  for (const key of ['isPrivate','showOnlineStatus','allowDMs']) if (body[key] !== undefined) { if (typeof body[key] !== 'boolean') return { error: `${key} must be boolean` }; update[key] = body[key]; }
  if (body.socialLinks !== undefined) {
    if (!body.socialLinks || typeof body.socialLinks !== 'object' || Array.isArray(body.socialLinks)) return { error: 'socialLinks must be an object' };
    const links = {}; for (const key of ['twitter','instagram','discord','telegram']) if (body.socialLinks[key] !== undefined) { const value = safeUrl(body.socialLinks[key]); if (value === undefined) return { error: `socialLinks.${key} must be an http(s) URL` }; links[key] = value; }
    update.socialLinks = links;
  }
  if (body.theme !== undefined) {
    if (!body.theme || typeof body.theme !== 'object' || Array.isArray(body.theme)) return { error: 'theme must be an object' };
    const unknownTheme = Object.keys(body.theme).filter(key => !THEME_KEYS.has(key)); if (unknownTheme.length) return { error: `Unsupported theme fields: ${unknownTheme.join(', ')}` };
    const theme = {}; for (const [key,value] of Object.entries(body.theme)) {
      if (key.endsWith('Color')) { if (typeof value !== 'string' || !HEX.test(value)) return { error: `${key} must be a hex color` }; theme[key] = value; }
      else if (['animations','glowEffects','scanlines'].includes(key)) { if (typeof value !== 'boolean') return { error: `${key} must be boolean` }; theme[key] = value; }
      else if (URL_FIELDS.has(key)) { const url = safeUrl(value); if (url === undefined) return { error: `${key} must be an http(s) URL` }; theme[key] = url; }
      else { const text = cleanString(value, 40); if (text === undefined || (THEME_ENUMS[key] && !THEME_ENUMS[key].has(text))) return { error: `${key} is not an approved choice` }; theme[key] = text; }
    } update.theme = theme;
  }
  if (body.profileLayout !== undefined) {
    if (!body.profileLayout || typeof body.profileLayout !== 'object' || Array.isArray(body.profileLayout)) return { error: 'profileLayout must be an object' };
    const unknownLayout = Object.keys(body.profileLayout).filter(key => !LAYOUT_KEYS.has(key)); if (unknownLayout.length) return { error: `Unsupported layout fields: ${unknownLayout.join(', ')}` };
    const layout = {}; for (const [key,value] of Object.entries(body.profileLayout)) { if (!Array.isArray(value) || value.length > 20 || value.some(item => !MODULES.has(item))) return { error: `${key} contains unsupported modules` }; layout[key] = [...new Set(value)]; } update.profileLayout = layout;
  }
  return { update };
}

function validateLayoutUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Layout update must be an object' };
  const allowed = new Set(['theme','factionStarterTheme']);
  const unknown = Object.keys(body).filter(key => !allowed.has(key));
  if (unknown.length) return { error: `Unsupported layout fields: ${unknown.join(', ')}` };
  if (body.factionStarterTheme !== undefined && !['full','partial','off'].includes(body.factionStarterTheme)) return { error: 'Invalid faction influence' };
  const validated = validateProfileUpdate({ theme: body.theme || {} });
  if (validated.error) return validated;
  return { update: { ...(body.theme !== undefined ? { theme: validated.update.theme } : {}), ...(body.factionStarterTheme !== undefined ? { factionStarterTheme: body.factionStarterTheme } : {}) } };
}

const MODULE_CONFIG = {
  identity: { tagline: ['string', 120] }, bio: { text: ['string', 500] }, faction: {}, top_friends: {}, posts: {},
  media: { limit: ['number', 12] }, links: {}, creator_summary: { heading: ['string', 100], description: ['string', 300] }
};
function validateModuleConfig(type, config = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return { error: 'Module config must be an object' };
  const contract = MODULE_CONFIG[type];
  if (!contract || Object.keys(config).some(key => !contract[key])) return { error: `Unsupported ${type} module configuration` };
  const update = {};
  for (const [key, value] of Object.entries(config)) {
    const [kind, max] = contract[key];
    if (kind === 'string') { if (typeof value !== 'string') return { error: `${type}.${key} must be a string` }; update[key] = value.trim().slice(0, max); }
    if (kind === 'number') { if (!Number.isInteger(value) || value < 1 || value > max) return { error: `${type}.${key} is outside the allowed range` }; update[key] = value; }
  }
  return { update };
}

module.exports = { validateProfileUpdate, validateLayoutUpdate, validateModuleConfig, THEME_KEYS, MODULES };
