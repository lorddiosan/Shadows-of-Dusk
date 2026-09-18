import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { App } from '../../App';
import { renderToString } from 'react-dom/server';

describe('App tab switching and route persistence test', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (global as any).window = {
      location: { hash: '' },
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    (global as any).localStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => { mockStorage[k] = v; },
      removeItem: (k: string) => { delete mockStorage[k]; },
      clear: () => { mockStorage = {}; }
    };
  });

  afterEach(() => {
    delete (global as any).window;
    delete (global as any).localStorage;
  });

  it('App renders correctly on home and displays navigation', () => {
    (global as any).window.location.hash = '';
    const html = renderToString(React.createElement(App));
    expect(html).toContain('WARPATH');
    expect(html).toContain('Home');
    expect(html).toContain('Matchmaking');
    expect(html).toContain('MATCHMAKING');
  });

  it('App initializes on matchmaking page when hash is #matchmaking', () => {
    (global as any).window.location.hash = '#matchmaking';
    const html = renderToString(React.createElement(App));
    expect(html).toContain('Matchmaking &amp; Duel Zone');
    expect(html).toContain('WARPATH MULTIPLAYER COMMAND');
  });

  it('App initializes on matchmaking page when localStorage is twg_active_tab=matchmaking', () => {
    (global as any).window.location.hash = '';
    (global as any).localStorage.setItem('twg_active_tab', 'matchmaking');
    const html = renderToString(React.createElement(App));
    expect(html).toContain('Matchmaking &amp; Duel Zone');
  });
});
