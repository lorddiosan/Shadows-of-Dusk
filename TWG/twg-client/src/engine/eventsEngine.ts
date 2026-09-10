import { GameEvent, Unit } from '../types/game';

export interface EventResolutionResult {
  triggeredEvent: GameEvent | null;
  logs: string[];
}

/**
 * Section 11: Events Engine
 * Random field-wide effects that can trigger each round.
 * Rule: An event cannot trigger while another instance of itself is already active,
 * and has a cooldown before it can recur.
 * Trigger chances:
 * Acid Rain: 2/100 * (round * 1.5 - 1)
 * Flooding: 1/100 * (round * 2 - 1)
 * Mana Surge: 0.5/100 * (round * 3 - 1)
 * Great Shattering: 1/100 * (round * 1.5 - 1)
 */
export function checkAndTriggerEvents(
  round: number,
  events: GameEvent[],
  units: Unit[]
): EventResolutionResult {
  const logs: string[] = [];
  let triggeredEvent: GameEvent | null = null;

  // Process existing active events decrement & cooldowns
  for (const event of events) {
    if (event.activeRemaining > 0) {
      event.activeRemaining -= 1;
      if (event.activeRemaining === 0) {
        logs.push(`Weather & Rift Calms: ${event.name} has dissipated.`);
        event.currentCooldown = event.cooldownRounds;
      }
    } else if (event.currentCooldown > 0) {
      event.currentCooldown -= 1;
    }
  }

  // Evaluate candidate events if none is currently active
  for (const event of events) {
    if (event.activeRemaining > 0 || event.currentCooldown > 0) {
      continue;
    }

    let chance = 0;
    if (event.id === 'acid_rain') {
      chance = (2 / 100) * (round * 1.5 - 1);
    } else if (event.id === 'flooding') {
      chance = (1 / 100) * (round * 2 - 1);
    } else if (event.id === 'mana_surge') {
      chance = (0.5 / 100) * (round * 3 - 1);
    } else if (event.id === 'great_shattering') {
      chance = (1 / 100) * (round * 1.5 - 1);
    }

    chance = Math.max(0, Math.min(0.9, chance)); // clamp up to 90%
    const roll = Math.random();

    if (roll < chance) {
      event.activeRemaining = event.durationRounds;
      triggeredEvent = event;
      logs.push(`⚠️ ENVIRONMENTAL DISASTER TRIGGERED! [${event.name}] has struck the convergence! (Chance was ${(chance * 100).toFixed(1)}%)`);

      // Apply immediate or starting round effect
      if (event.id === 'acid_rain') {
        // "All units with Def < 4 lose 1 L. Resisted if CP + Def > 6."
        for (const u of units) {
          if (u.stats.lives > 0) {
            const effectiveDef = u.stats.baseDef + u.stats.defModifier;
            if (effectiveDef < 4) {
              if (u.stats.cp + effectiveDef > 6) {
                logs.push(`${u.name} resisted Acid Rain! (CP ${u.stats.cp} + Def ${effectiveDef} > 6)`);
              } else {
                u.stats.lives = Math.max(0, u.stats.lives - 1);
                logs.push(`${u.name} melted under Acid Rain! -1 Life (Current: ${u.stats.lives})`);
              }
            }
          }
        }
      } else if (event.id === 'flooding') {
        // "All non-Character units lose 1 Def for 5 rounds."
        for (const u of units) {
          if (u.type !== 'Character' && u.stats.lives > 0) {
            u.stats.defModifier = Math.max(-3, u.stats.defModifier - 1);
            logs.push(`${u.name} waterlogged! -1 Def.`);
          }
        }
      } else if (event.id === 'mana_surge') {
        // "All Characters lose 1 L. Resisted if CP + 1d3 > 5; on resist, gain +1 AM for 3 rounds instead."
        for (const u of units) {
          if (u.type === 'Character' && u.stats.lives > 0) {
            const roll1d3 = Math.floor(Math.random() * 3) + 1;
            if (u.stats.cp + roll1d3 > 5) {
              u.stats.am += 1;
              logs.push(`✨ ${u.name} channeled the Mana Surge! (CP ${u.stats.cp} + ${roll1d3} > 5). Gained +1 AM!`);
            } else {
              u.stats.lives = Math.max(0, u.stats.lives - 1);
              logs.push(`⚡ ${u.name} overloaded by Mana Surge! Lost 1 Life (Current: ${u.stats.lives})`);
            }
          }
        }
      } else if (event.id === 'great_shattering') {
        // "All units' Mv reduced by 2 for 4 rounds."
        for (const u of units) {
          if (u.stats.lives > 0) {
            u.stats.mv = Math.max(1, u.stats.mv - 2);
          }
        }
        logs.push(`Tectonic plates tore apart! All units' Movement reduced by 2.`);
      }

      break; // trigger at most 1 new event per round
    }
  }

  return { triggeredEvent, logs };
}
