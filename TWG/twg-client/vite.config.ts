import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

interface DevTicket {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  factionId: string;
  rosterId: string;
  rosterData: any;
  mode: string;
  customRoomCode?: string;
  status: 'queued' | 'matched' | 'cancelled';
  matchedWith?: string;
  matchedWithName?: string;
  matchedWithFaction?: string;
  matchId?: string;
  opponentRoster?: any;
  playerRole?: 'player1' | 'player2';
  mapId?: string;
  coinWinner?: 'player1' | 'player2';
  queuedAt: string;
}

interface DevMatchState {
  tickets: DevTicket[];
  matches: Array<{
    id: string;
    mode: string;
    mapId: string;
    player1Id: string;
    player2Id: string;
    coinWinner?: 'player1' | 'player2';
    createdAt: string;
    actions: any[];
  }>;
}

function matchmakingDevServerPlugin(): Plugin {
  const STATE_FILE = path.resolve(os.tmpdir(), 'twg_matchmaking_sync.json');

  const loadState = (): DevMatchState => {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {}
    return { tickets: [], matches: [] };
  };

  const saveState = (state: DevMatchState) => {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Matchmaking Broker] Failed to save state:', err);
    }
  };

  return {
    name: 'twg-dev-matchmaking-broker',
    configureServer(server) {
      server.middlewares.use('/api/matchmaking', async (req, res) => {
        // Enable CORS for cross-port / cross-tab access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        res.setHeader('Content-Type', 'application/json');

        const rawUrl = req.url || '';
        const [pathOnly, queryString] = rawUrl.split('?');
        const searchParams = new URLSearchParams(queryString || '');

        const readBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        // 1. Join Matchmaking Queue (POST /join)
        if (req.method === 'POST' && (pathOnly === '/join' || pathOnly.endsWith('/join'))) {
          const body = await readBody();
          const { user, roster, mode = '1v1', targetMapId, customRoomCode } = body;

          if (!user || !roster) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing user or roster profile' }));
            return;
          }

          const state = loadState();
          const now = new Date().toISOString();
          const nowMs = Date.now();

          // Clean out stale tickets older than 3 minutes or existing tickets for this user
          state.tickets = state.tickets.filter(t => {
            const ageMs = nowMs - new Date(t.queuedAt).getTime();
            return t.playerId !== user.id && ageMs < 180000;
          });

          const ticketId = 'q_' + Math.random().toString(36).substring(2, 9);
          const newTicket: DevTicket = {
            id: ticketId,
            playerId: user.id,
            playerName: user.displayName || 'Commander',
            playerAvatar: user.avatarUrl || '',
            factionId: roster.factionId,
            rosterId: roster.id,
            rosterData: roster,
            mode,
            customRoomCode: customRoomCode ? customRoomCode.trim().toUpperCase() : undefined,
            status: 'queued',
            mapId: targetMapId,
            queuedAt: now
          };

          // Check for waiting opponent
          let opponent: DevTicket | undefined;

          if (newTicket.customRoomCode) {
            // Match specifically by custom room code
            opponent = state.tickets.find(t => 
              t.status === 'queued' && 
              t.playerId !== user.id && 
              t.customRoomCode === newTicket.customRoomCode
            );
          } else {
            // Match by compatible mode or first available
            opponent = state.tickets.find(t => 
              t.status === 'queued' && 
              t.playerId !== user.id && 
              (!t.customRoomCode) &&
              (t.mode === mode || mode === '1v1')
            );
          }

          if (opponent) {
            const matchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const chosenMap = targetMapId || opponent.mapId || 'map_apex_championship_stadium';
            const coinWinner: 'player1' | 'player2' = Math.random() >= 0.5 ? 'player1' : 'player2';

            // Opponent is Player 1, joining user is Player 2
            opponent.status = 'matched';
            opponent.matchedWith = user.id;
            opponent.matchedWithName = user.displayName;
            opponent.matchedWithFaction = roster.factionName || roster.factionId;
            opponent.matchId = matchId;
            opponent.opponentRoster = roster;
            opponent.playerRole = 'player1';
            opponent.mapId = chosenMap;
            opponent.coinWinner = coinWinner;

            newTicket.status = 'matched';
            newTicket.matchedWith = opponent.playerId;
            newTicket.matchedWithName = opponent.playerName;
            newTicket.matchedWithFaction = opponent.rosterData?.factionName || opponent.factionId;
            newTicket.matchId = matchId;
            newTicket.opponentRoster = opponent.rosterData;
            newTicket.playerRole = 'player2';
            newTicket.mapId = chosenMap;
            newTicket.coinWinner = coinWinner;

            state.matches.push({
              id: matchId,
              mode: mode,
              mapId: chosenMap,
              player1Id: opponent.playerId,
              player2Id: user.id,
              coinWinner,
              createdAt: now,
              actions: []
            });
          }

          state.tickets.push(newTicket);
          saveState(state);

          res.statusCode = 200;
          res.end(JSON.stringify({ ticket: newTicket, error: null }));
          return;
        }

        // 2. Poll Ticket Status (GET /status?ticketId=...)
        if (req.method === 'GET' && (pathOnly === '/status' || pathOnly.endsWith('/status'))) {
          const ticketId = searchParams.get('ticketId');
          if (!ticketId) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing ticketId' }));
            return;
          }

          const state = loadState();
          const ticket = state.tickets.find(t => t.id === ticketId);

          res.statusCode = 200;
          res.end(JSON.stringify({ ticket: ticket || null }));
          return;
        }

        // 3. Leave Queue (POST /leave)
        if (req.method === 'POST' && (pathOnly === '/leave' || pathOnly.endsWith('/leave'))) {
          const body = await readBody();
          const { playerId, ticketId } = body;

          const state = loadState();
          state.tickets = state.tickets.filter(t => {
            if (ticketId && t.id === ticketId) return false;
            if (playerId && t.playerId === playerId) return false;
            return true;
          });
          saveState(state);

          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // 4. Live Match Actions (POST /action, GET /actions?matchId=...)
        if (req.method === 'POST' && (pathOnly === '/action' || pathOnly.endsWith('/action'))) {
          const body = await readBody();
          const { matchId, action } = body;
          if (!matchId) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing matchId' }));
            return;
          }
          const state = loadState();
          let match = state.matches.find(m => m.id === matchId);
          if (!match) {
            match = {
              id: matchId,
              mode: '1v1',
              mapId: 'map_apex_championship_stadium',
              player1Id: 'player1',
              player2Id: 'player2',
              createdAt: new Date().toISOString(),
              actions: []
            };
            state.matches.push(match);
          }
          const seq = match.actions.length + 1;
          const actionItem = {
            ...action,
            id: action?.id || `act_${Date.now()}_${seq}_${Math.random().toString(36).substring(2, 7)}`,
            seq,
            timestamp: Date.now()
          };
          match.actions.push(actionItem);
          saveState(state);
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, actionCount: match.actions.length, action: actionItem }));
          return;
        }

        if (req.method === 'GET' && (pathOnly === '/actions' || pathOnly.endsWith('/actions'))) {
          const matchId = searchParams.get('matchId');
          const sinceSeq = parseInt(searchParams.get('sinceSeq') || '0', 10);
          const since = parseInt(searchParams.get('since') || '0', 10);
          const state = loadState();
          const match = state.matches.find(m => m.id === matchId);
          const allActions = match?.actions || [];
          const actions = allActions.filter(a => {
            if (sinceSeq > 0) {
              return (a.seq || 0) > sinceSeq;
            }
            return a.timestamp > since;
          });
          res.statusCode = 200;
          res.end(JSON.stringify({ actions }));
          return;
        }

        // Default response for unhandled endpoints
        res.statusCode = 200;
        res.end(JSON.stringify({ status: 'ok', server: 'Convergence Dev Matchmaking Broker' }));
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/.matchmaking_sync.json', '**/twg_matchmaking_sync.json', '**/*.log']
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    matchmakingDevServerPlugin()
  ],
})
