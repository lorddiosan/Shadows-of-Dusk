import { CORE_TRAIT_DEFINITIONS } from '../types/game';

export interface TraitBadgeInfo {
  icon: string;
  label: string;
  badgeClass: string;
  isTemp?: boolean;
}

export const getTraitBadgeInfo = (trait: string, isTemp = false): TraitBadgeInfo => {
  const t = trait.trim();
  const lower = t.toLowerCase();

  // Temporary traits / Status effects
  if (isTemp || lower.includes('fire') || lower.includes('burn') || lower.includes('poison') || lower.includes('stun') || lower.includes('freeze') || lower.includes('frozen') || lower.includes('frost') || lower.includes('acid') || lower.includes('bleed')) {
    if (lower.includes('fire') || lower.includes('burn')) {
      return { icon: '🔥', label: t, badgeClass: 'bg-red-950/90 border-red-500 text-red-300 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]', isTemp: true };
    }
    if (lower.includes('poison') || lower.includes('venom') || lower.includes('toxin')) {
      return { icon: '🧪', label: t, badgeClass: 'bg-emerald-950/90 border-lime-500 text-lime-300 animate-pulse shadow-[0_0_8px_rgba(132,204,22,0.5)]', isTemp: true };
    }
    if (lower.includes('stun') || lower.includes('paralyz') || lower.includes('shock')) {
      return { icon: '⚡', label: t, badgeClass: 'bg-amber-950/90 border-yellow-400 text-yellow-300 animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.5)]', isTemp: true };
    }
    if (lower.includes('freeze') || lower.includes('frozen') || lower.includes('frost') || lower.includes('chill')) {
      return { icon: '❄️', label: t, badgeClass: 'bg-cyan-950/90 border-cyan-400 text-cyan-300 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.5)]', isTemp: true };
    }
    if (lower.includes('acid') || lower.includes('corrod')) {
      return { icon: '💧', label: t, badgeClass: 'bg-lime-950/90 border-lime-400 text-lime-300 animate-pulse shadow-[0_0_8px_rgba(163,230,53,0.5)]', isTemp: true };
    }
    if (lower.includes('bleed')) {
      return { icon: '🩸', label: t, badgeClass: 'bg-rose-950/90 border-red-600 text-rose-300 animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.5)]', isTemp: true };
    }
    return { icon: '✨', label: t, badgeClass: 'bg-amber-950/90 border-amber-400 text-amber-300 animate-pulse', isTemp: true };
  }

  // Permanent traits
  switch (lower) {
    case 'infiltrator':
      return { icon: '🥷', label: 'Infiltrator', badgeClass: 'bg-amber-950/90 border-amber-500 text-amber-300' };
    case 'leader':
      return { icon: '👑', label: 'Leader', badgeClass: 'bg-yellow-950/90 border-yellow-500 text-yellow-300' };
    case 'shieldwall':
      return { icon: '🛡️', label: 'Shieldwall', badgeClass: 'bg-blue-950/90 border-blue-400 text-blue-300' };
    case 'flying':
      return { icon: '🪽', label: 'Flying', badgeClass: 'bg-sky-950/90 border-sky-400 text-sky-300' };
    case 'berserk':
      return { icon: '⚔️', label: 'Berserk', badgeClass: 'bg-rose-950/90 border-rose-500 text-rose-300' };
    case 'sniper':
      return { icon: '🎯', label: 'Sniper', badgeClass: 'bg-purple-950/90 border-purple-400 text-purple-300' };
    case 'rapid fire':
      return { icon: '⚡', label: 'Rapid Fire', badgeClass: 'bg-amber-950/90 border-yellow-400 text-yellow-300' };
    case 'cavalry':
      return { icon: '🐎', label: 'Cavalry', badgeClass: 'bg-orange-950/90 border-orange-500 text-orange-300' };
    case 'heavy armour':
      return { icon: '🦾', label: 'Heavy Armour', badgeClass: 'bg-zinc-800 border-zinc-500 text-zinc-200' };
    case 'unyielding':
      return { icon: '🗿', label: 'Unyielding', badgeClass: 'bg-stone-900 border-stone-500 text-stone-200' };
    case 'psionic':
      return { icon: '🔮', label: 'Psionic', badgeClass: 'bg-violet-950/90 border-violet-400 text-violet-300' };
    case 'teleport':
      return { icon: '🌀', label: 'Teleport', badgeClass: 'bg-indigo-950/90 border-indigo-400 text-indigo-300' };
    case 'scout':
      return { icon: '🔭', label: 'Scout', badgeClass: 'bg-teal-950/90 border-teal-400 text-teal-300' };
    case 'regeneration':
      return { icon: '💚', label: 'Regeneration', badgeClass: 'bg-emerald-950/90 border-emerald-400 text-emerald-300' };
    case 'skimmer':
      return { icon: '⛵', label: 'Skimmer', badgeClass: 'bg-cyan-950/90 border-cyan-400 text-cyan-300' };
    case 'firing deck':
    case 'firingdeck':
      return { icon: '🔫', label: 'Firing Deck', badgeClass: 'bg-amber-950/90 border-amber-500 text-amber-300' };
    default:
      return { icon: '🏷️', label: t, badgeClass: 'bg-zinc-850 border-zinc-600 text-zinc-300' };
  }
};

export const getTraitExplanation = (trait: string): string => {
  const t = trait.trim();
  const lower = t.toLowerCase();

  if (CORE_TRAIT_DEFINITIONS[t]?.summary) {
    return CORE_TRAIT_DEFINITIONS[t].summary;
  }
  
  const matchedCoreKey = Object.keys(CORE_TRAIT_DEFINITIONS).find(k => k.toLowerCase() === lower);
  if (matchedCoreKey) {
    return CORE_TRAIT_DEFINITIONS[matchedCoreKey].summary;
  }

  if (lower.includes('fire') || lower.includes('burn')) {
    return 'Takes 1 mortal wound at end of round until extinguished.';
  }
  if (lower.includes('poison') || lower.includes('venom') || lower.includes('toxin')) {
    return 'Suffers -1 to Attack Modifiers and takes periodic toxin damage.';
  }
  if (lower.includes('stun') || lower.includes('paralyz') || lower.includes('shock')) {
    return 'Movement reduced by 2" and reaction abilities disabled.';
  }
  if (lower.includes('freeze') || lower.includes('frozen') || lower.includes('frost') || lower.includes('chill')) {
    return 'Halves movement distance and increases incoming melee damage.';
  }
  if (lower.includes('acid') || lower.includes('corrod')) {
    return 'Corrodes armor: -1 DEF penalty until cleansed.';
  }
  if (lower.includes('bleed')) {
    return 'Takes 1 damage whenever conducting a normal move or charge.';
  }
  if (lower.includes('shieldwall')) {
    return '+1 Defense against ranged attacks while maintaining squad coherency.';
  }
  if (lower.includes('skimmer')) {
    return 'Hovers over low ground obstacles and ignores difficult terrain penalties.';
  }
  if (lower.includes('firing deck') || lower.includes('firingdeck')) {
    return 'Units embarked inside this vehicle can shoot using the vehicle as their firing position.';
  }
  return 'Special tactical unit trait.';
};
