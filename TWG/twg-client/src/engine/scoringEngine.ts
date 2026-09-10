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
 * Checks if unit is within 3-square Chebyshev/Euclidean radius of POI.
 * Rulebook: "any unit within a 3-square radius of the POI counts as contesting it"
 */
export function isUnitContestingPOI(unit: Unit, poi: POI, gridSize: number = 50): boolean {
  if (!unit.position || unit.stats.lives <= 0) return false;
  // If coordinates are in pixels (> 30) vs normalized grid cells
  const isPixelCoord = unit.position.x > 30 || unit.position.y > 30 || poi.x > 30 || poi.y > 30;
  const dist = Math.hypot(unit.position.x - poi.x, unit.position.y - poi.y);
  const r = typeof poi.radius === 'number' ? poi.radius : 1.5;
  const effectiveRadius = isPixelCoord ? r * gridSize : r;
  return dist <= effectiveRadius;
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

    if (p1CP > p2CP) {
      p1Gained = diff * poi.multiplier;
      p1TotalPoiScore += p1Gained;
    } else if (p2CP > p1CP) {
      p2Gained = diff * poi.multiplier;
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
 * Section 8: Win Conditions
 * 1. Elimination: All of a player's units are destroyed.
 * 2. Dominant Knockout: Starting round 15 onward, if one player's score is >= 1.5x the other's,
 *    that player may force the match to end immediately without agreement.
 * 3. Vote to End: Starting round 15, and every odd round after (15, 17, 19, 21, 23),
 *    both players may vote to end immediately (higher score wins).
 * 4. Hard Cap: Round 25 is the hard cap (always ends).
 */
export function checkWinConditions(
  round: number,
  player1Score: number,
  player2Score: number,
  player1Units: Unit[],
  player2Units: Unit[],
  player1Vote: boolean,
  player2Vote: boolean
): { isOver: boolean; winner: 'player1' | 'player2' | 'draw' | null; reason: string } {
  const p1Alive = player1Units.some(u => u.stats.lives > 0);
  const p2Alive = player2Units.some(u => u.stats.lives > 0);

  // 1. Elimination
  if (!p1Alive && !p2Alive) {
    return { isOver: true, winner: 'draw', reason: 'Mutual Elimination: All forces destroyed!' };
  }
  if (!p1Alive) {
    return { isOver: true, winner: 'player2', reason: 'Elimination: Player 1 forces completely wiped out!' };
  }
  if (!p2Alive) {
    return { isOver: true, winner: 'player1', reason: 'Elimination: Player 2 forces completely wiped out!' };
  }

  // 2. Dominant Knockout (Round >= 15)
  if (round >= 15) {
    if (player1Score >= 1.5 * Math.max(1, player2Score)) {
      return { isOver: true, winner: 'player1', reason: `Dominant Knockout! Round ${round}: Player 1 score (${player1Score}) is >= 1.5x opponent (${player2Score}).` };
    }
    if (player2Score >= 1.5 * Math.max(1, player1Score)) {
      return { isOver: true, winner: 'player2', reason: `Dominant Knockout! Round ${round}: Player 2 score (${player2Score}) is >= 1.5x opponent (${player1Score}).` };
    }
  }

  // 3. Mutual Vote to End (odd rounds >= 15)
  if (round >= 15 && round % 2 === 1 && player1Vote && player2Vote) {
    const winner = player1Score > player2Score ? 'player1' : player2Score > player1Score ? 'player2' : 'draw';
    return { isOver: true, winner, reason: `Mutual Agreement: Both players voted to conclude at Round ${round}. Final Score: ${player1Score} - ${player2Score}` };
  }

  // 4. Hard cap round 25
  if (round >= 25) {
    const winner = player1Score > player2Score ? 'player1' : player2Score > player1Score ? 'player2' : 'draw';
    return { isOver: true, winner, reason: `Match concluded at Round 25 Hard Cap. Final Score: ${player1Score} - ${player2Score}` };
  }

  return { isOver: false, winner: null, reason: '' };
}
