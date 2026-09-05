import React, { useEffect, useState } from 'react';
import { ChevronRight, Crown, Sparkles, Users } from 'lucide-react';
import { USER_FACING_PROGRESSION_ENABLED } from '../config';
import { progressionAPI } from '../services/api';

export interface ProgressionView {
  presentationVersion: string;
  level: number;
  tier: string;
  contribution: number;
  progress: number;
  contributionToNextLevel: number;
  dimensions: Array<{ key: string; label: string; contribution: number }>;
  faction: { state: 'unaffiliated' } | { state: 'affiliated'; name: string; color: string; contribution: number };
  creatorMode: boolean;
  unlocks: { unlocked: ProgressionUnlock[]; next: ProgressionUnlock[] };
}

interface ProgressionUnlock { id: string; level: number; type: string; name: string; description: string }

export const ProgressionPanel: React.FC<{ userId: string }> = ({ userId }) => {
  const [data, setData] = useState<ProgressionView | null>(null);
  useEffect(() => {
    if (!USER_FACING_PROGRESSION_ENABLED || !userId) return;
    let active = true;
    progressionAPI.getUser(userId).then(response => {
      if (active) setData(response.data?.data || null);
    }).catch(() => { if (active) setData(null); });
    return () => { active = false; };
  }, [userId]);

  if (!USER_FACING_PROGRESSION_ENABLED || !data) return null;
  const strongest = [...data.dimensions].sort((a, b) => b.contribution - a.contribution).slice(0, 4);
  return <section data-testid="progression-panel" className="w-full border border-[var(--profile-primary,#39FF14)]/30 bg-black/75 backdrop-blur-md p-4 md:p-5 shadow-[0_0_28px_rgba(57,255,20,0.08)]">
    <div className="flex items-start gap-4">
      <div className="shrink-0 h-14 w-14 border border-[var(--profile-primary,#39FF14)]/50 bg-[var(--profile-primary,#39FF14)]/10 flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase tracking-[.2em] text-gray-400">Level</span>
        <strong className="text-2xl leading-none text-[var(--profile-primary,#39FF14)]">{data.level}</strong>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="text-base md:text-lg font-black uppercase tracking-wider text-white">{data.tier} signal</h2>{data.creatorMode && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#ff4fd8]"><Crown size={11}/> Creator dimension</span>}</div>
        <div className="mt-2 h-1.5 overflow-hidden bg-white/10" aria-label={`${Math.round(data.progress * 100)}% toward next level`}><div className="h-full bg-[linear-gradient(90deg,var(--profile-primary,#39FF14),#ff00ff)]" style={{ width: `${data.progress * 100}%` }}/></div>
        <p className="mt-1.5 text-[10px] uppercase tracking-wider text-gray-500">{data.level === 100 ? 'Apex signal reached' : `${data.contributionToNextLevel} signal to level ${data.level + 1}`}</p>
      </div>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-[1.25fr_.75fr]">
      <div><p className="text-[10px] uppercase tracking-[.18em] text-gray-500 mb-2">Personal dimensions</p><div className="grid grid-cols-2 gap-2">{strongest.map(item => <div key={item.key} className="flex items-center justify-between border border-white/10 bg-white/[.025] px-3 py-2 text-xs"><span className="text-gray-300">{item.label}</span><strong className="text-white tabular-nums">{item.contribution}</strong></div>)}</div></div>
      <div data-testid="faction-contribution"><p className="text-[10px] uppercase tracking-[.18em] text-gray-500 mb-2">Faction contribution</p>{data.faction.state === 'affiliated' ? <div className="border border-white/10 px-3 py-2.5 flex items-center gap-3"><Users size={16} style={{ color: data.faction.color }}/><div className="min-w-0"><p className="text-xs text-white truncate">{data.faction.name}</p><p className="text-[10px] text-gray-500">{data.faction.contribution} contributed</p></div></div> : <div className="border border-dashed border-white/15 px-3 py-2.5"><p className="text-xs text-gray-300">Unaffiliated</p><p className="text-[10px] text-gray-500">Personal signal stands on its own.</p></div>}</div>
    </div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-3"><div className="flex items-center gap-2 text-xs text-gray-300"><Sparkles size={13} className="text-[#ff00ff]"/>{data.unlocks.unlocked.at(-1)?.name || 'Signal Mark'} unlocked</div>{data.unlocks.next[0] && <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500">Next: {data.unlocks.next[0].name} · L{data.unlocks.next[0].level}<ChevronRight size={12}/></div>}</div>
  </section>;
};

export default ProgressionPanel;
