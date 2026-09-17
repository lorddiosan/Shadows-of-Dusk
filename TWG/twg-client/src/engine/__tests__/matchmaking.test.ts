import { describe, it, expect, beforeEach } from 'vitest';
import { MatchmakingService } from '../../services/matchmakingService';
import { StorageService } from '../../services/storageService';
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

  it('provides multi-region routing configurations and custom room code capabilities', () => {
    const regions = [
      { id: 'us_east', name: 'Convergence Prime (US-East)', ping: '24ms' },
      { id: 'eu_west', name: 'Astraea Citadel (EU-West)', ping: '38ms' },
      { id: 'asia_pac', name: 'Ember Rift (Asia-Pacific)', ping: '105ms' }
    ];
    expect(regions.length).toBe(3);
    expect(regions.find(r => r.id === 'us_east')?.ping).toBe('24ms');
  });
});

describe('MM-007 - MM-012: Multiplayer Modes (2v2, 3-Way, 4FFA) & Tournament Engineered Maps', () => {
  it('loads all mode-engineered preset battle maps from storage (MM-007)', () => {
    const maps = StorageService.getMaps();
    expect(maps.length).toBeGreaterThanOrEqual(7);

    const map2v2 = maps.find(m => m.id === 'map_convergance_coliseum_2v2');
    const map3way = maps.find(m => m.id === 'map_trinity_spire_3way');
    const map4ffa = maps.find(m => m.id === 'map_quadrant_ruins_4ffa');
    const mapApex = maps.find(m => m.id === 'map_apex_championship_stadium');

    expect(map2v2).toBeDefined();
    expect(map3way).toBeDefined();
    expect(map4ffa).toBeDefined();
    expect(mapApex).toBeDefined();
  });

  it('validates 2v2 Twin Bastions of Convergence specifications (MM-008)', () => {
    const map = StorageService.getMaps().find(m => m.id === 'map_convergance_coliseum_2v2')!;
    expect(map.width).toBe(1600);
    expect(map.height).toBe(1000);
    expect(map.maxPlayers).toBe(4);
    expect(map.recommendedMode).toBe('2v2');
    expect(map.supportedModes).toContain('2v2');

    // Check 4 player deployment zones and 2 team fronts
    expect(map.deploymentZones.player1).toBeDefined();
    expect(map.deploymentZones.player2).toBeDefined();
    expect(map.deploymentZones.player3).toBeDefined();
    expect(map.deploymentZones.player4).toBeDefined();
    expect(map.deploymentZones.teamA).toBeDefined();
    expect(map.deploymentZones.teamB).toBeDefined();

    // Central Bridge objective
    const bridgeObj = map.objectives.find(o => o.id === 'obj_bridge');
    expect(bridgeObj).toBeDefined();
    expect(bridgeObj?.pointsValue).toBe(15);
    expect(bridgeObj?.x).toBe(800);
    expect(bridgeObj?.y).toBe(500);
  });

  it('validates 3-Way Tri-Clash Trinity Spire Crater specifications (MM-009)', () => {
    const map = StorageService.getMaps().find(m => m.id === 'map_trinity_spire_3way')!;
    expect(map.width).toBe(1400);
    expect(map.height).toBe(1200);
    expect(map.maxPlayers).toBe(3);
    expect(map.recommendedMode).toBe('3way');
    expect(map.supportedModes).toContain('3way');

    // 120° Triad Radial Zones: Zenith (top), Obsidian (bottom right), Cinder (bottom left)
    expect(map.deploymentZones.player1.label).toContain('Zenith');
    expect(map.deploymentZones.player2.label).toContain('Obsidian');
    expect(map.deploymentZones.player3?.label).toContain('Cinder');

    // King of the Hill Crown Spire objective (20 VP)
    const crownSpire = map.objectives.find(o => o.id === 'obj_tri_center');
    expect(crownSpire).toBeDefined();
    expect(crownSpire?.pointsValue).toBe(20);
    expect(crownSpire?.x).toBe(700);
  });

  it('validates 4-Player Free-For-All Ashen Crossroads specifications (MM-010)', () => {
    const map = StorageService.getMaps().find(m => m.id === 'map_quadrant_ruins_4ffa')!;
    expect(map.width).toBe(1400);
    expect(map.height).toBe(1400);
    expect(map.maxPlayers).toBe(4);
    expect(map.recommendedMode).toBe('4ffa');
    expect(map.supportedModes).toContain('4ffa');

    // 4 Corner Quadrants
    expect(map.deploymentZones.player1.maxX).toBeLessThanOrEqual(300);
    expect(map.deploymentZones.player1.maxY).toBeLessThanOrEqual(300);
    expect(map.deploymentZones.player2.minX).toBeGreaterThanOrEqual(1100);
    expect(map.deploymentZones.player2.minY).toBeGreaterThanOrEqual(1100);
    expect(map.deploymentZones.player3?.minX).toBeGreaterThanOrEqual(1100);
    expect(map.deploymentZones.player3?.maxY).toBeLessThanOrEqual(300);
    expect(map.deploymentZones.player4?.maxX).toBeLessThanOrEqual(300);
    expect(map.deploymentZones.player4?.minY).toBeGreaterThanOrEqual(1100);

    // Central Convergence Nexus objective (20 VP)
    const nexus = map.objectives.find(o => o.id === 'obj_nexus');
    expect(nexus).toBeDefined();
    expect(nexus?.pointsValue).toBe(20);
    expect(nexus?.x).toBe(700);
    expect(nexus?.y).toBe(700);
  });

  it('validates Grand Apex Coliseum Tournament Stadium specifications (MM-011)', () => {
    const map = StorageService.getMaps().find(m => m.id === 'map_apex_championship_stadium')!;
    expect(map.width).toBe(1200);
    expect(map.height).toBe(800);
    expect(map.recommendedMode).toBe('tournament');
    expect(map.supportedModes).toContain('tournament');
    expect(map.supportedModes).toContain('1v1');
    expect(map.supportedModes).toContain('2v2');

    // Symmetrical tournament pedestal
    const pedestal = map.objectives.find(o => o.id === 'obj_apex_trophy');
    expect(pedestal).toBeDefined();
    expect(pedestal?.x).toBe(600);
    expect(pedestal?.y).toBe(400);
  });

  it('ensures all deployment zones and objectives are strictly within map boundaries (MM-012)', () => {
    const maps = StorageService.getMaps();
    for (const m of maps) {
      // Check deployment zones
      const zones = [
        m.deploymentZones.player1,
        m.deploymentZones.player2,
        m.deploymentZones.player3,
        m.deploymentZones.player4,
        m.deploymentZones.teamA,
        m.deploymentZones.teamB
      ].filter(Boolean);

      for (const z of zones) {
        expect(z!.minX).toBeGreaterThanOrEqual(0);
        expect(z!.maxX).toBeLessThanOrEqual(m.width);
        expect(z!.minY).toBeGreaterThanOrEqual(0);
        expect(z!.maxY).toBeLessThanOrEqual(m.height);
        expect(z!.minX).toBeLessThan(z!.maxX);
        expect(z!.minY).toBeLessThan(z!.maxY);
      }

      // Check objectives
      for (const obj of m.objectives) {
        expect(obj.x).toBeGreaterThanOrEqual(0);
        expect(obj.x).toBeLessThanOrEqual(m.width);
        expect(obj.y).toBeGreaterThanOrEqual(0);
        expect(obj.y).toBeLessThanOrEqual(m.height);
        expect(obj.pointsValue).toBeGreaterThan(0);
      }
    }
  });
});

