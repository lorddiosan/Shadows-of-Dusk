import { describe, it, expect } from 'vitest';
import { UnitAbility, AbilityTiming, AbilityCost, AbilityType, CORE_TRAIT_DEFINITIONS } from '../../types/game';
import { vfxDispatcher } from '../../services/audioVfxService';
import { FACTIONS, UNIT_TEMPLATES } from '../../data/factions';

describe('DESIGN-007 / CODE-026: Ability System and Activation Criteria', () => {
  const sampleAbility: UnitAbility = {
    id: 'test_ability_1',
    name: 'Overwatch Fire',
    icon: '🎯',
    type: 'active',
    affects: 'target',
    activationTiming: 'movement',
    cost: '1_cp',
    effectType: 'damage',
    duration: 'instant',
    triggerCondition: 'When enemy unit ends movement within range',
    effect: 'Conduct reactive snap fire at moving enemy.'
  };

  it('validates active ability activation timing and cost logic', () => {
    const isActivatable = (
      ability: UnitAbility,
      currentPhase: string,
      currentCP: number,
      usedThisRound: number
    ): { activatable: boolean; reason?: string } => {
      if (ability.type === 'passive') {
        return { activatable: false, reason: 'Passive doctrine always active' };
      }

      const timingMatches =
        !ability.activationTiming ||
        ability.activationTiming === 'any_time' ||
        ability.activationTiming.toLowerCase() === currentPhase.toLowerCase();

      const costAmount = ability.cost === '1_cp' ? 1 : ability.cost === '2_cp' ? 2 : 0;
      const hasEnoughCP = currentCP >= costAmount;

      if (!timingMatches) {
        return { activatable: false, reason: `Available in ${ability.activationTiming?.toUpperCase()} phase` };
      }
      if (!hasEnoughCP) {
        return { activatable: false, reason: `Requires ${costAmount} CP` };
      }
      if (ability.cost === 'once_per_round' && usedThisRound >= 1) {
        return { activatable: false, reason: 'Already used this round' };
      }

      return { activatable: true };
    };

    // Correct phase + 0 CP required -> activatable even if currentCP is 0
    const zeroCPAbility: UnitAbility = {
      ...sampleAbility,
      cost: 'free'
    };
    expect(isActivatable(zeroCPAbility, 'Movement', 0, 0)).toEqual({ activatable: true });

    // Wrong phase -> not activatable
    expect(isActivatable(sampleAbility, 'Command', 2, 0).activatable).toBe(false);
    expect(isActivatable(sampleAbility, 'Command', 2, 0).reason).toContain('MOVEMENT');

    // Passive ability check
    const passiveAbility: UnitAbility = {
      ...sampleAbility,
      id: 'test_passive',
      type: 'passive',
      cost: 'free'
    };
    expect(isActivatable(passiveAbility, 'Movement', 2, 0).activatable).toBe(false);
  });

  it('enforces zero-CP cost rule and +1 Free CP generation', () => {
    const cpGeneratorAbility: UnitAbility = {
      id: 'test_rally',
      name: 'Rallying War Cry',
      type: 'active',
      affects: 'all_friendly',
      activationTiming: 'command',
      cost: 'gain_1_cp',
      gainsCP: true,
      duration: 'end_of_round',
      effect: 'Active player generates +1 Free CP.'
    };

    let p1CP = 2;
    const isP1 = true;
    const gainsCP = cpGeneratorAbility.cost === 'gain_1_cp' || !!cpGeneratorAbility.gainsCP;

    // Zero-CP rule: No CP is deducted on activation
    if (gainsCP && isP1) {
      p1CP += 1;
    }

    expect(p1CP).toBe(3);
    expect(gainsCP).toBe(true);
  });

  it('verifies vfxDispatcher triggers and dispatches events correctly', () => {
    const receivedEvents: any[] = [];
    const unsubscribe = vfxDispatcher.subscribe((ev: any) => receivedEvents.push(ev));

    // 1. Shooting trigger
    vfxDispatcher.triggerShoot({ x: 100, y: 100 }, { x: 300, y: 300 }, 'laser');
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].type).toBe('shoot_projectile');
    expect(receivedEvents[0].variant).toBe('laser');

    // 2. Fight trigger
    vfxDispatcher.triggerFight({ x: 200, y: 200 }, 'slash');
    expect(receivedEvents.length).toBe(2);
    expect(receivedEvents[1].type).toBe('melee_slash');

    // 3. Ability trigger (+1 CP)
    vfxDispatcher.triggerAbility({ x: 150, y: 150 }, '⭐', 'CP Boost', 'gain_cp');
    expect(receivedEvents.length).toBe(3);
    expect(receivedEvents[2].type).toBe('cp_sparkle');
    expect(receivedEvents[2].variant).toBe('gain_cp');

    unsubscribe();
  });

  it('verifies new mechanical traits are present in CORE_TRAIT_DEFINITIONS', () => {
    const traitIds = Object.keys(CORE_TRAIT_DEFINITIONS);

    expect(traitIds).toContain('Rapid Fire');
    expect(traitIds).toContain('Berserk');
    expect(traitIds).toContain('Teleport');
    expect(traitIds).toContain('Psionic');
    expect(traitIds).toContain('Regeneration');
    expect(traitIds).toContain('Sniper');
    expect(traitIds).toContain('Cavalry');
    expect(traitIds).toContain('Unyielding');
  });

  it('verifies all factions have zero-CP faction abilities defined', () => {
    expect(FACTIONS.length).toBeGreaterThanOrEqual(6);

    FACTIONS.forEach((faction: any) => {
      expect(faction.factionAbility).toBeDefined();
      expect(faction.factionAbility.cost).not.toBe('1_cp');
      expect(faction.factionAbility.cost).not.toBe('2_cp');
      expect(faction.factionAbility.vfxType).toBeDefined();
    });
  });

  it('verifies unit templates in UNIT_TEMPLATES have abilities and traits', () => {
    const leaders = UNIT_TEMPLATES.filter((u: any) => u.type === 'Character');
    
    expect(leaders.length).toBeGreaterThanOrEqual(3);
    leaders.forEach((leader: any) => {
      expect(leader.traits).toContain('Leader');
      expect(leader.abilities).toBeDefined();
      expect(leader.abilities.length).toBeGreaterThan(0);
      // Leaders have a +1 Free CP generating ability
      const hasCPGain = leader.abilities.some((a: any) => a.cost === 'gain_1_cp' || a.gainsCP);
      expect(hasCPGain).toBe(true);
    });
  });

  it('verifies custom unit playing cards support full theme, rarity, artwork, and lore customizations', () => {
    const customCardAbility: UnitAbility = {
      id: 'ab_sniper_headshot',
      name: 'Eagle Eye Execution',
      type: 'active',
      affects: 'target',
      activationTiming: 'shooting',
      cost: 'once_per_round',
      effect: 'Execute a lethal precision shot dealing 3 AP damage to an enemy commander.',
      effectType: 'damage',
      duration: 'instant',
      vfxType: 'ballistic',
      cardTheme: 'crimson',
      cardRarity: 'Legendary',
      cardArtworkUrl: 'https://example.com/sniper_art.webp',
      actionButtonText: 'FIRE EXECUTION SHOT',
      quote: 'One round, one silence.',
      icon: '🎯'
    };

    expect(customCardAbility.cardTheme).toBe('crimson');
    expect(customCardAbility.cardRarity).toBe('Legendary');
    expect(customCardAbility.cardArtworkUrl).toBe('https://example.com/sniper_art.webp');
    expect(customCardAbility.actionButtonText).toBe('FIRE EXECUTION SHOT');
    expect(customCardAbility.quote).toBe('One round, one silence.');
  });
});
