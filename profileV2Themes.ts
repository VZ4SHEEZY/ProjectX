export type FactionInfluence = 'full' | 'partial' | 'off';

export interface ProfileThemeTokens {
  primaryColor: string; secondaryColor: string; accentColor: string; backgroundColor: string;
  fontFamily: 'mono' | 'sans' | 'serif' | 'display'; fontSize: 'small' | 'medium' | 'large';
  animations: boolean; glowEffects: boolean; scanlines: boolean; backgroundImage: string;
  cursorEffect: 'none' | 'glow' | 'trail'; layoutStyle: 'single' | 'sidebar-left' | 'sidebar-right' | 'masonry';
  borderStyle: 'minimal' | 'solid' | 'double' | 'glow'; borderRadius: 'none' | 'small' | 'medium' | 'large';
  spacing: 'compact' | 'comfortable' | 'spacious'; effectIntensity: 'off' | 'low' | 'medium';
}

const base: ProfileThemeTokens = { primaryColor:'#39FF14', secondaryColor:'#FF00FF', accentColor:'#00FFFF', backgroundColor:'#050505', fontFamily:'mono', fontSize:'medium', animations:true, glowEffects:true, scanlines:false, backgroundImage:'', cursorEffect:'none', layoutStyle:'sidebar-right', borderStyle:'solid', borderRadius:'small', spacing:'comfortable', effectIntensity:'low' };

const palettes: Record<string, Partial<ProfileThemeTokens>> = {
  'Neon Wraith': { primaryColor:'#B8FF3D', secondaryColor:'#B026FF', accentColor:'#61E7FF', backgroundColor:'#07070D', borderStyle:'glow' },
  'Iron Veil': { primaryColor:'#B9C5CE', secondaryColor:'#596773', accentColor:'#FF5A36', backgroundColor:'#090B0D', borderStyle:'double' },
  'Crimson Static': { primaryColor:'#FF334E', secondaryColor:'#8C1028', accentColor:'#FFD166', backgroundColor:'#100509', scanlines:true },
  'Void Circuit': { primaryColor:'#8E7DFF', secondaryColor:'#352E75', accentColor:'#65FFF1', backgroundColor:'#05040B', borderStyle:'glow' },
  'Gold Syndicate': { primaryColor:'#FFD447', secondaryColor:'#8C6518', accentColor:'#FFF0A6', backgroundColor:'#0E0A03', borderStyle:'double', fontFamily:'serif' },
  'Azure Phantom': { primaryColor:'#3BBEFF', secondaryColor:'#165B9E', accentColor:'#C2F2FF', backgroundColor:'#030B12' },
  'Toxic Bloom': { primaryColor:'#8DFF3D', secondaryColor:'#CC2F8A', accentColor:'#FFF36B', backgroundColor:'#071006', borderRadius:'large' },
  'Scarlet Dominion': { primaryColor:'#FF274D', secondaryColor:'#74152B', accentColor:'#E6C07B', backgroundColor:'#100306', borderStyle:'double', fontFamily:'display' },
  'Chrome Legion': { primaryColor:'#DCE5EA', secondaryColor:'#687983', accentColor:'#5CFFED', backgroundColor:'#080A0B' },
  'Phantom Signal': { primaryColor:'#DF4CFF', secondaryColor:'#4A1B69', accentColor:'#52FFD9', backgroundColor:'#09050D', scanlines:true },
  'Obsidian Pact': { primaryColor:'#B898FF', secondaryColor:'#32274B', accentColor:'#FF4365', backgroundColor:'#030304', borderStyle:'double' },
  'Ember Protocol': { primaryColor:'#FF6B2C', secondaryColor:'#9E271C', accentColor:'#FFD166', backgroundColor:'#100704' },
  'Violet Surge': { primaryColor:'#B052FF', secondaryColor:'#5D20A8', accentColor:'#FF7CE5', backgroundColor:'#0B0512', borderStyle:'glow' },
  'Steel Covenant': { primaryColor:'#A8BBC7', secondaryColor:'#435563', accentColor:'#69D2E7', backgroundColor:'#070A0D', borderStyle:'double' },
  'Binary Ghost': { primaryColor:'#4DFFB8', secondaryColor:'#176B52', accentColor:'#D9FFF2', backgroundColor:'#020907', scanlines:true },
  'Copper Throne': { primaryColor:'#E6974C', secondaryColor:'#78472C', accentColor:'#76E0C2', backgroundColor:'#0E0805', fontFamily:'serif' },
  'Nova Rift': { primaryColor:'#FF4FD8', secondaryColor:'#5136C8', accentColor:'#65E8FF', backgroundColor:'#08051A', borderStyle:'glow' },
  'Silver Wraith': { primaryColor:'#E6EDF2', secondaryColor:'#778791', accentColor:'#A78BFA', backgroundColor:'#08090C' },
  'Inferno Grid': { primaryColor:'#FF4028', secondaryColor:'#C77A18', accentColor:'#FFF15C', backgroundColor:'#110502', scanlines:true },
  'Quantum Veil': { primaryColor:'#38E8FF', secondaryColor:'#7357FF', accentColor:'#FF5FD2', backgroundColor:'#040713', borderStyle:'glow' },
  'Unaffiliated': { primaryColor:'#39FF14', secondaryColor:'#777777', accentColor:'#E5E7EB', backgroundColor:'#050505', glowEffects:false }
};

export const factionThemeNames = Object.keys(palettes);
export const getFactionStarterTheme = (faction?: string): ProfileThemeTokens => ({ ...base, ...(palettes[faction || 'Unaffiliated'] || palettes.Unaffiliated) });

export function resolveProfileTheme(faction: string | undefined, influence: FactionInfluence = 'full', custom: Partial<ProfileThemeTokens> = {}): ProfileThemeTokens {
  const starter = getFactionStarterTheme(faction);
  if (influence === 'full') return { ...base, ...custom, ...starter, backgroundImage: custom.backgroundImage || starter.backgroundImage };
  if (influence === 'partial') return { ...starter, ...custom };
  return { ...base, ...custom };
}

export const profileThemeStyle = (theme: ProfileThemeTokens): CSSProperties => ({
  '--profile-primary': theme.primaryColor, '--profile-secondary': theme.secondaryColor, '--profile-accent': theme.accentColor,
  '--profile-bg': theme.backgroundColor, '--profile-gap': theme.spacing === 'compact' ? '0.65rem' : theme.spacing === 'spacious' ? '1.5rem' : '1rem',
  '--profile-radius': theme.borderRadius === 'none' ? '0' : theme.borderRadius === 'small' ? '0.35rem' : theme.borderRadius === 'large' ? '1.25rem' : '0.75rem',
  backgroundColor: theme.backgroundColor, backgroundImage: theme.backgroundImage ? `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.75)),url(${theme.backgroundImage})` : undefined,
  backgroundSize: 'cover', backgroundAttachment: 'fixed', fontFamily: theme.fontFamily === 'mono' ? 'ui-monospace, monospace' : theme.fontFamily === 'serif' ? 'Georgia, serif' : 'ui-sans-serif, system-ui, sans-serif'
} as CSSProperties);
import type { CSSProperties } from 'react';
