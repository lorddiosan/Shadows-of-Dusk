import { describe, it, expect, beforeEach } from 'vitest';
import { MatchmakingService } from '../../services/matchmakingService';
import { UserProfile } from '../../types/user';
import { ArmyRoster } from '../../types/army';
import { supabase, safeStorage } from '../../services/supabaseClient';

describe('MM-001 - MM-006: 1v1 Matchmaking Queue & Pairing Tests', () => {
  const player1: UserProfile = {
    id: 'usr_p1_001',
    displayName: 'Commander Dawn',
    username: 'DawnBringer',
    email: 'dawn@warpath.game',
    role: 'player',
    provider: 'supabase',
    crystalShards: 500,
    aetherCores: 50,
    equippedBoardSkin: 'classic_grid',
    equippedDiceSkin: 'default_dice',
    unlockedItems: [],
    level: 5,
    xp: 1200
  };

  const player2: UserProfile = {
    id: 'usr_p2_002',
    displayName: 'General Umbra',
    username: 'UmbraNight',
    email: 'umbra@warpath.game',
    role: 'player',
    provider: 'supabase',
    crystalShards: 350,
    aetherCores: 20,
    equippedBoardSkin: 'classic_grid',
    equippedDiceSkin: 'default_dice',
    unlockedItems: [],
    level: 7,
    xp: 2400
  };

  const sampleRoster1: ArmyRoster = {
    id: 'roster_001',
    name: 'Ember 1st Spearhead',
    factionId: 'ember_vanguard',
    factionName: 'Ember Vanguard',
    totalPoints: 1000,
    maxPoints: 1000,
    units: []
  };

  const sampleRoster2: ArmyRoster = {
    id: 'roster_002',
    name: 'Gloom Stalkers',
    factionId: 'gloom_syndicate',
    factionName: 'Gloom Syndicate',
    totalPoints: 980,
    maxPoints: 1000,
    units: []
  };

  beforeEach(() => {
    // Clear in-memory / local storage mock tables for clean matchmaking state
    safeStorage.removeItem('sod_mock_table_matchmaking_queue');
    safeStorage.removeItem('sod_mock_table_matches');
  });

  it('allows a player to join the matchmaking queue with status queued (MM-001, MM-002)', async () => {
    const res = await MatchmakingService.joinQueue(player1, sampleRoster1);
    expect(res.error).toBeNull();
    const ticket = res.ticket!;

    expect(ticket).toBeDefined();
    expect(ticket.playerId).toBe(player1.id);
    expect(ticket.playerName).toBe(player1.displayName);
    expect(ticket.status).toBe('queued');
    expect(ticket.id).toBeDefined();

    // Verify player is stored in queue
    const queueStatus = await MatchmakingService.getQueueStatus(ticket.id);
    expect(queueStatus).toBeDefined();
    expect(queueStatus?.status).toBe('queued');
  });

  it('allows a player to cancel and leave the queue (MM-004)', async () => {
    const res = await MatchmakingService.joinQueue(player1, sampleRoster1);
    const ticket = res.ticket!;
    expect(ticket.status).toBe('queued');

    const left = await MatchmakingService.leaveQueue(ticket.id);
    expect(left).toBe(true);

    const check = await MatchmakingService.getQueueStatus(ticket.id);
    expect(check).toBeNull();
  });

  it('pairs two queuing players into a 1v1 match automatically (MM-003, MM-005, DB-005)', async () => {
    // Player 1 joins queue first
    const res1 = await MatchmakingService.joinQueue(player1, sampleRoster1);
    const ticket1 = res1.ticket!;
    expect(ticket1.status).toBe('queued');

    // Player 2 joins queue
    const res2 = await MatchmakingService.joinQueue(player2, sampleRoster2);
    const ticket2 = res2.ticket!;
    
    // Player 2 should be immediately matched with Player 1!
    expect(ticket2.status).toBe('matched');
    expect(ticket2.matchId).toBeDefined();
    expect(ticket2.matchedWithName).toBe(player1.displayName);
    expect(ticket2.matchedWithFaction).toBe(sampleRoster1.factionName);

    // Check Player 1's ticket status now
    const updatedTicket1 = await MatchmakingService.getQueueStatus(ticket1.id);
    expect(updatedTicket1).toBeDefined();
    expect(updatedTicket1?.status).toBe('matched');
    expect(updatedTicket1?.matchId).toBe(ticket2.matchId);
    expect(updatedTicket1?.matchedWithName).toBe(player2.displayName);
    expect(updatedTicket1?.matchedWithFaction).toBe(sampleRoster2.factionName);

    // Verify match record in database
    const { data: matchRecords } = await supabase
      .from('matches')
      .select('*')
      .eq('id', ticket2.matchId);

    expect(matchRecords).toBeDefined();
    expect(matchRecords.length).toBeGreaterThan(0);
    expect(matchRecords[0].player1_id).toBe(player1.id);
    expect(matchRecords[0].player2_id).toBe(player2.id);
    expect(matchRecords[0].status).toBe('in_progress');
  });

  it('notifies subscribers in real-time when a match is found (MM-006, UI-007)', async () => {
    const res1 = await MatchmakingService.joinQueue(player1, sampleRoster1);
    const ticket1 = res1.ticket!;

    let matchNotified = false;
    let notifiedTicket: any = null;

    const unsubscribe = MatchmakingService.subscribeToTicket(ticket1.id, (updated) => {
      if (updated.status === 'matched') {
        matchNotified = true;
        notifiedTicket = updated;
      }
    });

    // Player 2 joins
    await MatchmakingService.joinQueue(player2, sampleRoster2);

    expect(matchNotified).toBe(true);
    expect(notifiedTicket).toBeDefined();
    expect(notifiedTicket.matchedWithName).toBe(player2.displayName);

    unsubscribe();
  });
});
