import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MatchmakingPage } from '../../components/matchmaking/MatchmakingPage';
import { StorageService } from '../../services/storageService';
import { AuthService } from '../../services/authService';

describe('MatchmakingPage component render', () => {
  it('renders MatchmakingPage without crashing', () => {
    const user = AuthService.getCurrentUser();
    const rosters = StorageService.getRosters();
    const activeRoster = rosters[0];

    const html = renderToString(
      React.createElement(MatchmakingPage, {
        user,
        rosters,
        activeRoster,
        onSelectRoster: () => {},
        onDeployToBattle: () => {},
        onNavigate: () => {}
      })
    );
    expect(html).toBeDefined();
  });

  it('renders when activeRoster is null or undefined', () => {
    const user = AuthService.getCurrentUser();
    const rosters = StorageService.getRosters();

    const html1 = renderToString(
      React.createElement(MatchmakingPage, {
        user,
        rosters,
        activeRoster: null as any,
        onSelectRoster: () => {},
        onDeployToBattle: () => {},
        onNavigate: () => {}
      })
    );
    expect(html1).toBeDefined();

    const html2 = renderToString(
      React.createElement(MatchmakingPage, {
        user,
        rosters: [],
        activeRoster: undefined as any,
        onSelectRoster: () => {},
        onDeployToBattle: () => {},
        onNavigate: () => {}
      })
    );
    expect(html2).toBeDefined();
  });
});
