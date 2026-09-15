import { GameEvent, Unit, SpecialTile } from '../types/game';

export interface EventResolutionResult {
  triggeredEvent: GameEvent | null;
  logs: string[];
  specialTiles?: SpecialTile[];
}

/**
 * Dynamically shift special terrain tile locations on the board.
 * Special tiles like Flooded Mire, Sunken Crypt Trench, and Rift Fracture
 * relocate when triggered by event cards.
 */
export function relocateSpecialTiles(
  specialTiles: SpecialTile[],
  filter?: (tile: SpecialTile) => boolean
): { updatedTiles: SpecialTile[]; relocatedNames: string[] } {
  const relocatedNames: string[] = [];
  const updatedTiles = specialTiles.map(tile => {
    if (!filter || filter(tile)) {
      // Pick random coordinates within reasonable battlefield playable bounds (1200x800 map)
      const newX = Math.round(250 + Math.random() * 700);
      const newY = Math.round(200 + Math.random() * 400);
      relocatedNames.push(`${tile.name} -> (${newX}, ${newY})`);
      return { ...tile, x: newX, y: newY };
    }
    return tile;
  });
  return { updatedTiles, relocatedNames };
}

/**
 * Section 11: Events Engine
 * Random field-wide effects that can trigger each round.
 * Rule: An event cannot trigger while another instance of itself is already active,
 * and has a cooldown before it can recur.
 * Trigger chances:
 * Acid Rain: 2/100 * (round * 1.5 - 1)
 * Flooding: 1/100 * (round * 2 - 1)
 * Shifting Mires: 1.5/100 * (round * 2 - 1)
 * Rift Migration: 1/100 * (round * 2 - 1)
 * Mana Surge: 0.5/100 * (round * 3 - 1)
 * Great Shattering: 1/100 * (round * 1.5 - 1)
 */
export function checkAndTriggerEvents(
  round: number,
  events: GameEvent[],
  units: Unit[],
  specialTiles?: SpecialTile[]
): EventResolutionResult {
  const logs: string[] = [];
  let triggeredEvent: GameEvent | null = null;
  let updatedSpecialTiles = specialTiles ? [...specialTiles] : undefined;

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
    } else if (event.id === 'shifting_mires') {
      chance = (1.5 / 100) * (round * 2 - 1);
    } else if (event.id === 'rift_migration') {
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
      } else if (event.id === 'shifting_mires') {
        if (updatedSpecialTiles) {
          const shiftRes = relocateSpecialTiles(updatedSpecialTiles, t => t.name.includes('Mire') || t.name.includes('Trench') || t.type === 'Water');
          updatedSpecialTiles = shiftRes.updatedTiles;
          logs.push(`🌊 Shifting Mires: Wetland trenches and flooded mires surged and shifted! (${shiftRes.relocatedNames.join(', ')})`);
        }
      } else if (event.id === 'rift_migration') {
        if (updatedSpecialTiles) {
          const shiftRes = relocateSpecialTiles(updatedSpecialTiles, t => t.type === 'InfernalRift' || t.name.includes('Rift'));
          updatedSpecialTiles = shiftRes.updatedTiles;
          logs.push(`⚡ Dimensional Rupture: Infernal Rift has migrated! (${shiftRes.relocatedNames.join(', ')})`);
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

  return { triggeredEvent, logs, specialTiles: updatedSpecialTiles };
}
