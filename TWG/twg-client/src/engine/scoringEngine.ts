import { POI, Unit } from '../types/game';

// Section 10: Map & Points of Interest (POI)
export interface POIScoreBreakdown {
  poiId: string;
  poiName: string;
  player1CP: number;
  player2CP: number;
  player1ScoreGained: number;
  player2ScoreGained: number;
  unitsContestingP1: string[];
  unitsContestingP2: string[];
}

/**
 * Checks if unit is within the capture radius of a POI.
 * In tabletop wargaming, a squad contests an objective if any alive model in the squad
 * is within the capture zone (default 1.5 grid squares / 75px radius, or poi.radius).
 */
export function isUnitContestingPOI(unit: Unit, poi: POI, gridSize: number = 50): boolean {
  if (!unit.position || unit.stats.lives <= 0) return false;
  // If poi.radius > 10, it is already in pixels (e.g. 60px, 70px, 75px). If <= 10, it's in grid cells (e.g. 1.5 sq).
  const effectiveRadius = (typeof poi.radius === 'number' && poi.radius > 10)
    ? poi.radius
    : (poi.radius || 1.5) * gridSize;

  // Check individual model tokens if available
  if (unit.tokens && unit.tokens.length > 0) {
    return unit.tokens.some(t => {
      if (t.currentLives <= 0) return false;
      const d = Math.hypot(t.x - poi.x, t.y - poi.y);
      const tokenR = t.radius || (t.size ? t.size / 2 : 20);
      return (d - tokenR) <= effectiveRadius;
    });
  }

  const dist = Math.hypot(unit.position.x - poi.x, unit.position.y - poi.y);
  return dist <= effectiveRadius + 20;
}

/**
 * Section 10.1: Scoring resolved at the end of each round
 * Sum the CP of all units each player has within the radius.
 * Score = CP difference * multiplier (1 for Basic, 2 for Special).
 * Design note: CP is NOT multiplied by L (confirmed in Rulebook 10.1).
 */
export function calculatePOIScores(units: Unit[], pois: POI[]): {
  p1TotalPoiScore: number;
  p2TotalPoiScore: number;
  breakdown: POIScoreBreakdown[];
} {
  let p1TotalPoiScore = 0;
  let p2TotalPoiScore = 0;
  const breakdown: POIScoreBreakdown[] = [];

  for (const poi of pois) {
    let p1CP = 0;
    let p2CP = 0;
    const unitsContestingP1: string[] = [];
    const unitsContestingP2: string[] = [];

    for (const unit of units) {
      if (isUnitContestingPOI(unit, poi)) {
        if (unit.owner === 'player1') {
          p1CP += unit.stats.cp;
          unitsContestingP1.push(unit.name);
        } else {
          p2CP += unit.stats.cp;
          unitsContestingP2.push(unit.name);
        }
      }
    }

    let p1Gained = 0;
    let p2Gained = 0;
    const diff = Math.abs(p1CP - p2CP);

    // Multiplier: 1x for Basic POIs, 2x for Special / Core POIs.
    // Clamps bloated multipliers (e.g. 10x) so round scores remain balanced and authentic.
    const mult = poi.multiplier > 2 ? (poi.type === 'Special' ? 2 : 1) : Math.max(1, poi.multiplier || 1);

    if (p1CP > p2CP) {
      p1Gained = diff * mult;
      p1TotalPoiScore += p1Gained;
    } else if (p2CP > p1CP) {
      p2Gained = diff * mult;
      p2TotalPoiScore += p2Gained;
    }

    breakdown.push({
      poiId: poi.id,
      poiName: poi.name,
      player1CP: p1CP,
      player2CP: p2CP,
      player1ScoreGained: p1Gained,
      player2ScoreGained: p2Gained,
      unitsContestingP1,
      unitsContestingP2
    });
  }

  return { p1TotalPoiScore, p2TotalPoiScore, breakdown };
}

/**
 * Section 8 & DESIGN-010: Win Conditions & Match Resolution
 * 1. Elimination: All of a player's units are destroyed (immediate victory).
 * 2. Dominant Knockout: Starting round 6 onward, if one player leads by >= 2.0x
 *    the opponent's score with at least a 15 VP margin, match ends immediately.
 * 3. Mutual Vote to End: Starting round 6, on odd rounds (7, 9), players may vote to conclude early.
 * 4. Hard Cap (Round 10 Resolution — DESIGN-010):
 *    - Primary: Highest total Victory Points (VP).
 *    - Tiebreaker 1: Highest count of Points of Interest (POIs) contested/held.
 *    - Tiebreaker 2: Highest total remaining squad lives across surviving units.
 *    - Tiebreaker 3: Tactical Draw / Stalemate.
 */
export function checkWinConditions(
  round: number,
  player1Score: number,
  player2Score: number,
  player1Units: Unit[],
  player2Units: Unit[],
  pois: POI[] = [],
  player1Vote: boolean = false,
  player2Vote: boolean = false
): { isOver: boolean; winner: 'player1' | 'player2' | 'draw' | null; reason: string } {
  const p1Alive = player1Units.some(u => (u.stats?.lives || 0) > 0);
  const p2Alive = player2Units.some(u => (u.stats?.lives || 0) > 0);

  // 1. Elimination
  if (!p1Alive && !p2Alive) {
    return { isOver: true, winner: 'draw', reason: 'Mutual Elimination: All forces destroyed in battle!' };
  }
  if (!p1Alive) {
    return { isOver: true, winner: 'player2', reason: 'Elimination: Player 1 forces completely wiped out!' };
  }
  if (!p2Alive) {
    return { isOver: true, winner: 'player1', reason: 'Elimination: Player 2 forces completely wiped out!' };
  }

  // 2. Dominant Knockout (Round >= 6)
  if (round >= 6) {
    if (player1Score >= 2.0 * Math.max(1, player2Score) && (player1Score - player2Score) >= 15) {
      return { 
        isOver: true, 
        winner: 'player1', 
        reason: `Dominant Knockout! Round ${round}: Player 1 (${player1Score} VP) leads by 2x with 15+ VP lead over Player 2 (${player2Score} VP).` 
      };
    }
    if (player2Score >= 2.0 * Math.max(1, player1Score) && (player2Score - player1Score) >= 15) {
      return { 
        isOver: true, 
        winner: 'player2', 
        reason: `Dominant Knockout! Round ${round}: Player 2 (${player2Score} VP) leads by 2x with 15+ VP lead over Player 1 (${player1Score} VP).` 
      };
    }
  }

  // 3. Mutual Vote to End (odd rounds >= 6)
  if (round >= 6 && round % 2 === 1 && player1Vote && player2Vote) {
    const winner = player1Score > player2Score ? 'player1' : player2Score > player1Score ? 'player2' : 'draw';
    return { 
      isOver: true, 
      winner, 
      reason: `Mutual Agreement: Both players voted to conclude at Round ${round}. Final Score: ${player1Score} - ${player2Score}` 
    };
  }

  // 4. Hard Cap at Round 10 (BUG-025 & DESIGN-010 Resolution Rule)
  if (round >= 10) {
    // Primary: Victory Points
    if (player1Score > player2Score) {
      return { 
        isOver: true, 
        winner: 'player1', 
        reason: `Round 10 Cap Reached: Player 1 secures victory on Victory Points (${player1Score} to ${player2Score} VP).` 
      };
    }
    if (player2Score > player1Score) {
      return { 
        isOver: true, 
        winner: 'player2', 
        reason: `Round 10 Cap Reached: Player 2 secures victory on Victory Points (${player2Score} to ${player1Score} VP).` 
      };
    }

    // Section 15 & DESIGN-010: Do not hardcode tiebreak rules until decided
    return { 
      isOver: true, 
      winner: 'draw', 
      reason: `Round 10 Cap Reached: Both commanders tied at ${player1Score} VP — Tactical Draw (Tiebreak rule pending DESIGN-010).` 
    };
  }

  return { isOver: false, winner: null, reason: '' };
}
