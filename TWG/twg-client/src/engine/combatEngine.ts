import { Unit, UnitType } from '../types/game';

// Section 5: Combat Resolution
export interface CombatResult {
  attackerName: string;
  defenderName: string;
  attackReceived: number;
  roll1d3: number;
  targetCurrentDef: number;
  damageCategory: 'double_def' | 'normal_damage' | 'glance' | 'absorbed';
  livesLost: number;
  defModifierChange: number;
  leaderSaved: boolean;
  logText: string;
  diceRolled: number[];
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
 * Section 5.3: Advantage & Disadvantage Stacking
 * 0 stacks = 1d3
 * 1 stack = 2d3 (Adv: take highest / Disadv: take lowest)
 * 2 stacks = 3d3 (Adv: take highest / Disadv: take lowest)
 * Advantage and Disadvantage cancel 1-for-1 before rolling.
 */
export function rollAttackD3(netAdvantage: number): { chosenRoll: number; rolls: number[] } {
  // Net Advantage > 0: Advantage, < 0: Disadvantage, 0: Normal
  const numDice = Math.min(3, 1 + Math.abs(netAdvantage));
  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * 3) + 1); // 1, 2, or 3
  }

  let chosenRoll: number;
  if (netAdvantage > 0) {
    chosenRoll = Math.max(...rolls);
  } else if (netAdvantage < 0) {
    chosenRoll = Math.min(...rolls);
  } else {
    chosenRoll = rolls[0];
  }

  return { chosenRoll, rolls };
}

/**
 * Section 5.4: Leader Survival Roll
 * When a Leader would lose an L, roll 1d6.
 * If the result is higher than the attack received, Leader survives instead.
 */
export function rollLeaderSurvival(attackReceived: number): { survived: boolean; roll: number } {
  const roll = Math.floor(Math.random() * 6) + 1;
  return { survived: roll > attackReceived, roll };
}

/**
 * Section 5.1 & 5.2: Damage vs Defence Resolution
 * Attack received = AM + 1d3 roll
 * Conditions:
 * - Attack >= 2 * Def: Target loses 1 L, and Def -1 for next turn
 * - Def <= Attack < 2 * Def: Target loses 1 L
 * - 0.5 * Def <= Attack < Def: No effect
 * - Attack < 0.5 * Def: No effect, and Def +1 for next turn
 * Def modifiers are capped at +-3 from base.
 */
export function resolveCombat(
  attacker: Unit,
  defender: Unit,
  isMelee: boolean,
  extraAdvantageStacks: number = 0
): CombatResult {
  // Calculate Advantage / Disadvantage cancellation
  let adv = attacker.advantageStacks + extraAdvantageStacks;
  let disadv = attacker.disadvantageStacks;

  if (isMelee && checkTypeAdvantage(attacker.type, defender.type)) {
    adv += 1;
  }

  const netAdvantage = Math.max(-2, Math.min(2, adv - disadv));
  const { chosenRoll, rolls } = rollAttackD3(netAdvantage);

  const attackReceived = attacker.stats.am + chosenRoll;
  const currentDef = Math.max(1, defender.stats.baseDef + defender.stats.defModifier);

  let damageCategory: 'double_def' | 'normal_damage' | 'glance' | 'absorbed';
  let livesLost = 0;
  let defModifierChange = 0;

  if (attackReceived >= 2 * currentDef) {
    damageCategory = 'double_def';
    livesLost = 1;
    defModifierChange = -1;
  } else if (attackReceived >= currentDef) {
    damageCategory = 'normal_damage';
    livesLost = 1;
    defModifierChange = 0;
  } else if (attackReceived >= 0.5 * currentDef) {
    damageCategory = 'glance';
    livesLost = 0;
    defModifierChange = 0;
  } else {
    damageCategory = 'absorbed';
    livesLost = 0;
    defModifierChange = 1;
  }

  // Check Leader survival roll if lives would be lost
  let leaderSaved = false;
  if (livesLost > 0 && defender.type === 'Character') {
    const survival = rollLeaderSurvival(attackReceived);
    if (survival.survived) {
      livesLost = 0;
      leaderSaved = true;
    }
  }

  // Construct readable battle log
  let logText = `${attacker.name} attacked ${defender.name}! Attack received = ${attacker.stats.am} + ${chosenRoll} [${rolls.join(',')}] = ${attackReceived} vs Def ${currentDef}. `;
  if (damageCategory === 'double_def') {
    logText += `CRITICAL BLOW! (Attack >= 2x Def). `;
  } else if (damageCategory === 'normal_damage') {
    logText += `Direct Hit! `;
  } else if (damageCategory === 'glance') {
    logText += `Deflected (0.5x Def <= Attack < Def). No damage. `;
  } else {
    logText += `Absorbed with ease! (Attack < 0.5x Def). Def +1 next turn. `;
  }

  if (leaderSaved) {
    logText += `LEADER SURVIVAL ROLL SUCCEEDED! ${defender.name} parried the mortal blow!`;
  } else if (livesLost > 0) {
    logText += `${defender.name} lost 1 Life (Remaining: ${Math.max(0, defender.stats.lives - livesLost)}).`;
  }

  return {
    attackerName: attacker.name,
    defenderName: defender.name,
    attackReceived,
    roll1d3: chosenRoll,
    targetCurrentDef: currentDef,
    damageCategory,
    livesLost,
    defModifierChange,
    leaderSaved,
    logText,
    diceRolled: rolls
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
