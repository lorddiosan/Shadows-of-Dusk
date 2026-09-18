import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Battlefield } from '../../components/game/Battlefield';
import { StorageService, PRESET_MAPS } from '../../services/storageService';

describe('Battlefield mount test', () => {
  it('renders Battlefield with PvP config without throwing', () => {
    const rosters = StorageService.getRosters();
    const p1Roster = rosters[0];
    const p2Roster = rosters[1];

    const html = renderToString(
      React.createElement(Battlefield, {
        customRoster: p1Roster,
        boardSkin: 'board_crimson_foundry',
        initialMapId: PRESET_MAPS[0].id,
        isPvP: true,
        matchId: 'test_match_123',
        playerRole: 'player1',
        opponentRoster: p2Roster,
        opponentCommander: {
          name: 'Challenger',
          faction: 'The Silver Vanguard'
        }
      })
    );
    expect(html).toBeDefined();
  });

  it('renders Battlefield for player2 without throwing', () => {
    const rosters = StorageService.getRosters();
    const p1Roster = rosters[0];
    const p2Roster = rosters[1];

    const html = renderToString(
      React.createElement(Battlefield, {
        customRoster: p2Roster,
        boardSkin: 'board_crimson_foundry',
        initialMapId: PRESET_MAPS[0].id,
        isPvP: true,
        matchId: 'test_match_123',
        playerRole: 'player2',
        opponentRoster: p1Roster,
        opponentCommander: {
          name: 'Host',
          faction: 'The Crimson Empire'
        }
      })
    );
    expect(html).toBeDefined();
  });
});
