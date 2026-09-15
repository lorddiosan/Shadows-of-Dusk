import { Unit, UnitType } from '../types/game';

// Section 5: Combat Resolution
export interface CombatResult {
  attackerName: string;
  defenderName: string;
  isMelee: boolean;
  totalAttacks: number;
  hitRolls: number[];       // The d20 hit rolls
  targetCurrentDef: number; // Target's Def threshold
  hitsCount: number;        // How many d20 > targetDef
  damageDie: string;        // 'd3', 'd6', 'd8', etc.
  damageRolls: number[];    // Individual damage rolls for each hit
  totalDamage: number;      // Sum of damage
  livesLost: number;        // Lives lost by target
  defModifierChange: number;
  leaderSaved: boolean;
  logText: string;
  // Backward compatibility:
  attackReceived: number;
  roll1d3: number;
  damageCategory: 'double_def' | 'normal_damage' | 'glance' | 'absorbed';
  diceRolled: number[];
}

export function parseDieSides(dieStr?: string): number {
  if (!dieStr) return 3;
  const match = dieStr.toLowerCase().match(/d(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
}

/**
 * Type Advantage Cycle (Section 4):
 * Vehicle beats Infantry -> Infantry beats Monster -> Monster beats Vehicle.
 * Character sits outside cycle (matchups only via passives).
 * Winning type matchup grants Advantage (+1 stack, max 2).
 */
export function checkTypeAdvantage(attackerType: UnitType, defenderType: UnitType): boolean {
  if (attackerType === 'Vehicle' && defenderType === 'Infantry') return true;
  if (attackerType === 'Infantry' && defenderType === 'Monster') return true;
  if (attackerType === 'Monster' && defenderType === 'Vehicle') return true;
  return false;
}

/**
 * Advantage & Disadvantage Stacking:
 * Roll with Advantage: roll 2d20 take highest.
 * Roll with Disadvantage: roll 2d20 take lowest.
 */
export function rollAttackD3(netAdvantage: number): { chosenRoll: number; rolls: number[] } {
  const numDice = Math.min(3, 1 + Math.abs(netAdvantage));
  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * 3) + 1);
  }
  const chosenRoll = netAdvantage > 0 ? Math.max(...rolls) : netAdvantage < 0 ? Math.min(...rolls) : rolls[0];
  return { chosenRoll, rolls };
}

/**
 * Leader Survival Roll:
 * When a Leader would lose lives, roll 1d6.
 * If the result is higher than the damage received, Leader survives instead.
 */
export function rollLeaderSurvival(damageReceived: number): { survived: boolean; roll: number } {
  const roll = Math.floor(Math.random() * 6) + 1;
  return { survived: roll > damageReceived, roll };
}

/**
 * Two-Roll Combat Resolution Engine:
 * 1. Attacks count = livingModelsCount * attacksPerModel (melee or ranged).
 * 2. Hit Roll: For each attack, roll 1d20. If d20 > target.Def, attack hits!
 * 3. Damage Roll: For each hit that passed, roll the unit's damage die (d3, d6, d8, etc.).
 * 4. Sum damage rolls and apply to target lives.
 */
export function resolveCombat(
  attacker: Unit,
  defender: Unit,
  isMelee: boolean,
  extraAdvantageStacks: number = 0
): CombatResult {
  // 1. Calculate living models
  const livingTokens = (attacker.tokens || []).filter(t => t.currentLives > 0);
  const livingModelCount = livingTokens.length > 0 
    ? livingTokens.length 
    : Math.max(1, attacker.stats.modelCount || 1);

  // 2. Determine attack count per model & damage die
  const attacksPerModel = isMelee 
    ? (attacker.stats.meleeAttacks ?? 1) 
    : (attacker.stats.rangedAttacks ?? (attacker.stats.range > 0 ? 1 : 0));
  
  const damageDie = isMelee
    ? (attacker.stats.meleeDamageDice ?? (attacker.type === 'Vehicle' || attacker.type === 'Monster' ? 'd6' : 'd3'))
    : (attacker.stats.rangedDamageDice ?? (attacker.type === 'Vehicle' ? 'd6' : 'd3'));

  const totalAttacks = Math.max(1, livingModelCount * attacksPerModel);

  // Advantage / Disadvantage
  let adv = attacker.advantageStacks + extraAdvantageStacks;
  let disadv = attacker.disadvantageStacks;
  if (isMelee && checkTypeAdvantage(attacker.type, defender.type)) {
    adv += 1;
  }
  const netAdvantage = Math.max(-2, Math.min(2, adv - disadv));

  // 3. Roll 1: To-Hit Roll (d20 vs Def)
  const currentDef = Math.max(1, defender.stats.def + defender.stats.defModifier);
  const hitRolls: number[] = [];
  let hitsCount = 0;

  for (let i = 0; i < totalAttacks; i++) {
    let roll = Math.floor(Math.random() * 20) + 1; // 1-20
    if (netAdvantage > 0) {
      const advRoll = Math.floor(Math.random() * 20) + 1;
      roll = Math.max(roll, advRoll);
    } else if (netAdvantage < 0) {
      const disadvRoll = Math.floor(Math.random() * 20) + 1;
      roll = Math.min(roll, disadvRoll);
    }
    hitRolls.push(roll);

    // If roll > target Def: Hit! If <= target Def: Fails
    if (roll > currentDef) {
      hitsCount++;
    }
  }

  // 4. Roll 2: Damage Rolls
  const dieSides = parseDieSides(damageDie);
  const damageRolls: number[] = [];
  for (let i = 0; i < hitsCount; i++) {
    damageRolls.push(Math.floor(Math.random() * dieSides) + 1);
  }

  let totalDamage = damageRolls.reduce((a, b) => a + b, 0);
  const defModifierChange = 0;

  // Check Leader survival roll if lives would be lost
  let leaderSaved = false;
  if (totalDamage > 0 && defender.type === 'Character') {
    const survival = rollLeaderSurvival(totalDamage);
    if (survival.survived) {
      totalDamage = 0;
      leaderSaved = true;
    }
  }

  const livesLost = totalDamage;
  const damageCategory: 'double_def' | 'normal_damage' | 'glance' | 'absorbed' = 
    hitsCount >= 2 ? 'double_def' : hitsCount === 1 ? 'normal_damage' : 'glance';

  // Construct readable battle log
  const weaponType = isMelee ? 'Melee' : 'Ranged';
  let logText = `⚔️ [${weaponType} Attack] ${attacker.name} (${livingModelCount} models) made ${totalAttacks} attack(s) vs Def ${currentDef}. `;
  logText += `Hit rolls (d20): [${hitRolls.join(', ')}] → ${hitsCount}/${totalAttacks} Hit! `;

  if (hitsCount > 0) {
    logText += `Damage (${damageDie} x ${hitsCount}): [${damageRolls.join(', ')}] = ${totalDamage} Damage. `;
    if (leaderSaved) {
      logText += `👑 Leader Survival Roll Succeeded! ${defender.name} parried the mortal damage!`;
    } else {
      logText += `${defender.name} loses ${livesLost} Life (Remaining: ${Math.max(0, defender.stats.lives - livesLost)}).`;
    }
  } else {
    logText += `All attacks failed to beat ${defender.name}'s Defense (${currentDef}).`;
  }

  return {
    attackerName: attacker.name,
    defenderName: defender.name,
    isMelee,
    totalAttacks,
    hitRolls,
    targetCurrentDef: currentDef,
    hitsCount,
    damageDie,
    damageRolls,
    totalDamage,
    livesLost,
    defModifierChange,
    leaderSaved,
    logText,
    attackReceived: totalDamage,
    roll1d3: hitRolls[0] || 0,
    damageCategory,
    diceRolled: hitRolls
  };
}

/**
 * Section 5.4: Charge Roll
 * 1d6:
 * 5-6: full Mv charge
 * 3-4: half Mv charge (Math.floor(Mv / 2))
 * 1-2: charge fails (0 Mv)
 * Successful charge grants Advantage (+1 stack) in the Fight phase.
 */
export function rollCharge(mv: number): { distance: number; roll: number; success: boolean } {
  const roll = Math.floor(Math.random() * 6) + 1;
  if (roll >= 5) {
    return { distance: mv, roll, success: true };
  } else if (roll >= 3) {
    return { distance: Math.max(1, Math.floor(mv / 2)), roll, success: true };
  } else {
    return { distance: 0, roll, success: false };
  }
}

export type AbilityUsageLimit = 'once_per_game' | 'once_per_round' | 'once_per_activation';

/**
 * Determine the usage limit rule for an ability:
 * - Faction abilities are once per game unless explicitly specified otherwise ('once_per_round' or 'once_per_activation')
 * - Regular/unit abilities are once per round unless explicitly specified otherwise ('once_per_game' or 'once_per_activation')
 */
export function getAbilityUsageLimit(
  ability: { cost?: string },
  isFaction: boolean
): AbilityUsageLimit {
  if (isFaction) {
    if (ability.cost === 'once_per_round') return 'once_per_round';
    if (ability.cost === 'once_per_activation') return 'once_per_activation';
    return 'once_per_game';
  }
  if (ability.cost === 'once_per_game') return 'once_per_game';
  if (ability.cost === 'once_per_activation') return 'once_per_activation';
  return 'once_per_round';
}

/**
 * Evaluate whether an ability is activatable given current phase and usage records.
 */
export function checkAbilityActivation(params: {
  ability: {
    type?: string;
    activationTiming?: string;
    cost?: string;
  };
  isFaction: boolean;
  currentPhase: string;
  usedInRound: number;
  usedInGame: boolean;
}): { isActivatable: boolean; disabledReason?: string; rule: AbilityUsageLimit } {
  const { ability, isFaction, currentPhase, usedInRound, usedInGame } = params;
  const rule = getAbilityUsageLimit(ability, isFaction);

  if (ability.type === 'passive') {
    return { isActivatable: false, disabledReason: 'Passive doctrine always active', rule };
  }

  const timingMatches =
    !ability.activationTiming ||
    ability.activationTiming === 'any_time' ||
    ability.activationTiming.toLowerCase() === currentPhase.toLowerCase() ||
    (currentPhase.toLowerCase() === 'action' && ['shooting', 'charge', 'fight', 'action'].includes(ability.activationTiming.toLowerCase()));

  if (!timingMatches) {
    return {
      isActivatable: false,
      disabledReason: `Available in ${ability.activationTiming?.replace('_', ' ').toUpperCase()} phase`,
      rule
    };
  }

  if (rule === 'once_per_game' && usedInGame) {
    return {
      isActivatable: false,
      disabledReason: 'Already used this match (Once per Game)',
      rule
    };
  }

  if (rule === 'once_per_round' && usedInRound >= 1) {
    return {
      isActivatable: false,
      disabledReason: 'Already used this round (Once per Round)',
      rule
    };
  }

  if (rule === 'once_per_activation' && usedInRound >= 1) {
    return {
      isActivatable: false,
      disabledReason: 'Already activated this turn',
      rule
    };
  }

  return { isActivatable: true, rule };
}

