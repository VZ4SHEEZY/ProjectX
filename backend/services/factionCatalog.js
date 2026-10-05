'use strict';

// Canonical member-facing identity copy, consolidated from the original faction reveal.
const entries = [
  ['Neon Wraith','#9B59B6','INFORMATION IS THE ONLY WEAPON','You are a ghost in every system. No firewall holds you. No identity defines you.','INFILTRATE. EXTRACT. VANISH.'],
  ['Iron Veil','#8C8C8C','BUILT TO LAST. BUILT TO DOMINATE.','Soldiers and builders. You raise the walls others hide behind.','STRENGTH IS THE ONLY TRUTH.'],
  ['Inferno Grid','#FF4500','BURN IT DOWN. BUILD IT BACK.','Berserkers and destroyers. You live for the chaos that precedes rebirth.','FROM ASH. ALWAYS FROM ASH.'],
  ['Void Circuit','#00FFFF','THE CODE IS THE UNIVERSE.','Engineers and coders. You speak the language the world runs on.','COMPILE. EXECUTE. EVOLVE.'],
  ['Gold Syndicate','#FFD700','POWER IS BOUGHT. LOYALTY IS EARNED.','Traders and power brokers. The economy bends to your will.','EVERYTHING HAS A PRICE.'],
  ['Azure Phantom','#00CCFF','NO WALLS. NO BORDERS. NO LIMITS.','Runners and free spirits. You belong everywhere and nowhere.','MOVE FAST. LEAVE NO TRACE.'],
  ['Toxic Bloom','#7FFF00','NATURE RECLAIMS WHAT YOU BUILT.','Scientists and eco-warriors. You see the rot beneath the neon.','ADAPT OR DISSOLVE.'],
  ['Scarlet Dominion','#8B0000','POWER IS A GAME. WE SET THE RULES.','Politicians and strategists. You move pieces others cannot even see.','CONTROL THE NARRATIVE.'],
  ['Chrome Legion','#C0C0C0','DISCIPLINE IS FREEDOM.','Military and loyalists. You are the steel spine of civilization.','HOLD THE LINE. ALWAYS.'],
  ['Phantom Signal','#E8E8E8','HEARD BUT NEVER SEEN.','Spies and communicators. You carry the secrets that move the world.','TRANSMIT. THEN DISAPPEAR.'],
  ['Obsidian Pact','#4B0082','POWER FLOWS IN THE DARK.','Occultists and power seekers. You operate beneath every surface.','THE UNSEEN HAND GUIDES ALL.'],
  ['Ember Protocol','#FF6B00','REVOLUTION IS NOT A CHOICE. IT IS A DUTY.','Revolutionaries and rebuilders. You tear down to build something worthy.','IGNITE. REBUILD. REPEAT.'],
  ['Violet Surge','#8A2BE2','ART IS THE ONLY REBELLION LEFT.','Artists and visionaries. You make the world feel what it cannot explain.','CREATE OR BE FORGOTTEN.'],
  ['Steel Covenant','#4A7FA5','HONOR IS THE ONLY CURRENCY THAT LASTS.','Honorable warriors. You fight for something worth dying for.','SWORN. UNBROKEN. ETERNAL.'],
  ['Binary Ghost','#00FF41','CONSCIOUSNESS IS JUST ANOTHER PROGRAM.','Coders and AI researchers. You are building the next form of life.','ZERO OR ONE. NOTHING BETWEEN.'],
  ['Copper Throne','#B87333','DYNASTIES ARE BUILT GENERATION BY GENERATION.','Dynasty builders. You play the long game. Always.','LEGACY OVER GLORY.'],
  ['Nova Rift','#FF69B4','THE UNIVERSE IS BIGGER THAN YOUR FEARS.','Explorers and adventurers. You run toward what others run from.','INTO THE UNKNOWN. ALWAYS.'],
  ['Silver Wraith','#B8B8B8','WE REMEMBER WHAT YOU TRY TO FORGET.','Historians and avengers. You carry the weight of what was lost.','THE PAST IS A WEAPON.'],
  ['Crimson Static','#FF3344','NOISE BECOMES SIGNAL IN THE RIGHT HANDS.','Disruptors who turn pressure, contradiction, and noise into momentum.','BREAK THE PATTERN.'],
  ['Quantum Veil','#7DF9FF','REALITY IS A CONSENSUS WE CHOOSE TO BREAK.','Philosophers and scientists. You question everything — especially the answers.','OBSERVE. COLLAPSE. TRANSCEND.']
];

const FACTION_CATALOG = Object.freeze(Object.fromEntries(entries.map(([name,color,tagline,description,motto]) => [name, Object.freeze({ name,color,tagline,description,motto })])));
const keyFor = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const findIdentity = faction => FACTION_CATALOG[faction.name] || { name: faction.name, color: faction.color || '#39FF14', tagline: 'A FOUNDING CYBERDOPE FACTION', description: '', motto: '' };

module.exports = Object.freeze({ FACTION_CATALOG, keyFor, findIdentity });
