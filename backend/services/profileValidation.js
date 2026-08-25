const FACTIONS = ['Neon Wraith','Iron Veil','Crimson Static','Void Circuit','Gold Syndicate','Azure Phantom','Toxic Bloom','Scarlet Dominion','Chrome Legion','Phantom Signal','Obsidian Pact','Ember Protocol','Violet Surge','Steel Covenant','Binary Ghost','Copper Throne','Nova Rift','Silver Wraith','Inferno Grid','Quantum Veil','Unaffiliated'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const URL_FIELDS = new Set(['avatar', 'banner', 'website', 'backgroundImage']);
const THEME_KEYS = new Set(['primaryColor','secondaryColor','accentColor','backgroundColor','fontFamily','fontSize','animations','glowEffects','scanlines','backgroundImage','cursorEffect','layoutStyle']);
const LAYOUT_KEYS = new Set(['leftZone','rightZone','bottomZone','hiddenWidgets','mobileOrder']);
const MODULES = new Set(['identity','bio','faction','top_friends','posts','media','links','creator_summary']);

const cleanString = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : undefined;
const safeUrl = value => {
  if (value === '') return '';
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined; } catch { return undefined; }
};

function validateProfileUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Profile update must be an object' };
  const allowed = new Set(['displayName','bio','avatar','banner','faction','location','website','socialLinks','theme','profileLayout','profilePrivacy','isPrivate','showOnlineStatus','allowDMs']);
  const unknown = Object.keys(body).filter(key => !allowed.has(key));
  if (unknown.length) return { error: `Unsupported profile fields: ${unknown.join(', ')}` };
  const update = {};
  for (const [key, max] of [['displayName',50],['bio',500],['location',100]]) if (body[key] !== undefined) {
    const value = cleanString(body[key], max); if (value === undefined) return { error: `${key} must be a string` }; update[key] = value;
  }
  for (const key of ['avatar','banner','website']) if (body[key] !== undefined) {
    const value = safeUrl(body[key]); if (value === undefined) return { error: `${key} must be an http(s) URL` }; update[key] = value;
  }
  if (body.faction !== undefined) { if (!FACTIONS.includes(body.faction)) return { error: 'Invalid faction' }; update.faction = body.faction; }
  if (body.profilePrivacy !== undefined) { if (!['public','private'].includes(body.profilePrivacy)) return { error: 'Invalid profile privacy' }; update.profilePrivacy = body.profilePrivacy; }
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
      else { const text = cleanString(value, 40); if (text === undefined) return { error: `${key} must be a string` }; theme[key] = text; }
    } update.theme = theme;
  }
  if (body.profileLayout !== undefined) {
    if (!body.profileLayout || typeof body.profileLayout !== 'object' || Array.isArray(body.profileLayout)) return { error: 'profileLayout must be an object' };
    const unknownLayout = Object.keys(body.profileLayout).filter(key => !LAYOUT_KEYS.has(key)); if (unknownLayout.length) return { error: `Unsupported layout fields: ${unknownLayout.join(', ')}` };
    const layout = {}; for (const [key,value] of Object.entries(body.profileLayout)) { if (!Array.isArray(value) || value.length > 20 || value.some(item => !MODULES.has(item))) return { error: `${key} contains unsupported modules` }; layout[key] = [...new Set(value)]; } update.profileLayout = layout;
  }
  return { update };
}

module.exports = { validateProfileUpdate, THEME_KEYS, MODULES };
