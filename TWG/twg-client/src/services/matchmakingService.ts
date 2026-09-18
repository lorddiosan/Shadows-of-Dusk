import { supabase } from './supabaseClient';
import { UserProfile } from '../types/user';
import { ArmyRoster } from '../types/army';

export interface QueueTicket {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  factionId: string;
  rosterId: string;
  rosterData: ArmyRoster;
  status: 'queued' | 'matched' | 'cancelled';
  matchedWith?: string;
  matchedWithName?: string;
  matchedWithFaction?: string;
  matchId?: string;
  opponentRoster?: ArmyRoster;
  playerRole?: 'player1' | 'player2';
  coinWinner?: 'player1' | 'player2';
  mapId?: string;
  queuedAt: string;
}

export const MatchmakingService = {
  // Join 1v1 or Custom Room Matchmaking Queue (MM-002)
  async joinQueue(
    user: UserProfile, 
    roster: ArmyRoster, 
    mode: string = '1v1', 
    targetMapId?: string, 
    customRoomCode?: string
  ): Promise<{ ticket: QueueTicket | null; error: Error | null }> {
    // 1. First attempt: Shared Dev Matchmaking Broker endpoint (connects localhost:5173 and localhost:5174)
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await fetch('/api/matchmaking/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user, roster, mode, targetMapId, customRoomCode })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ticket) {
            return { ticket: json.ticket, error: null };
          }
        }
      }
    } catch {
      // Fall through to Supabase fallback
    }

    // 2. Secondary fallback: Supabase matchmaking_queue table / Local Mock
    try {
      await this.leaveQueue(user.id);

      const ticketId = 'q_' + Math.random().toString(36).substring(2, 9);
      const newTicket: QueueTicket = {
        id: ticketId,
        playerId: user.id,
        playerName: user.displayName,
        playerAvatar: user.avatarUrl,
        factionId: roster.factionId,
        rosterId: roster.id,
        rosterData: roster,
        status: 'queued',
        mapId: targetMapId,
        queuedAt: new Date().toISOString()
      };

      await (supabase.from('matchmaking_queue') as any).insert({
        id: ticketId,
        player_id: user.id,
        player_name: user.displayName,
        faction_id: roster.factionId,
        faction_name: roster.factionName || roster.factionId,
        roster_id: roster.id,
        roster_data: roster,
        status: 'queued',
        queued_at: newTicket.queuedAt
      });

      // Check if another opponent is already waiting in queue
      const { data: waitingTickets } = await (supabase
        .from('matchmaking_queue') as any)
        .select('*')
        .eq('status', 'queued');

      const opponent = (waitingTickets || []).find((t: any) => t.player_id !== user.id && t.id !== ticketId);

      if (opponent) {
        const matchId = 'match_' + Math.random().toString(36).substring(2, 10);
        
        await (supabase.from('matches') as any).insert({
          id: matchId,
          player1_id: opponent.player_id,
          player2_id: user.id,
          status: 'in_progress',
          round: 1,
          phase: 'Deployment',
          active_player: 'player1'
        });

        await (supabase
          .from('matchmaking_queue') as any)
          .update({
            status: 'matched',
            matched_with: user.id,
            matched_with_name: user.displayName,
            matched_with_faction: roster.factionName || roster.factionId,
            match_id: matchId
          })
          .eq('id', opponent.id);

        await (supabase
          .from('matchmaking_queue') as any)
          .update({
            status: 'matched',
            matched_with: opponent.player_id,
            matched_with_name: opponent.player_name || opponent.roster_data?.name || 'Challenger Commander',
            matched_with_faction: opponent.faction_name || opponent.roster_data?.factionName || opponent.faction_id,
            match_id: matchId
          })
          .eq('id', ticketId);

        newTicket.status = 'matched';
        newTicket.matchedWith = opponent.player_id;
        newTicket.matchedWithName = opponent.player_name || opponent.roster_data?.name || 'Challenger Commander';
        newTicket.matchedWithFaction = opponent.faction_name || opponent.roster_data?.factionName || opponent.faction_id;
        newTicket.matchId = matchId;
        newTicket.opponentRoster = opponent.roster_data;
        newTicket.playerRole = 'player2';
      }

      return { ticket: newTicket, error: null };
    } catch (err: any) {
      return { ticket: null, error: err };
    }
  },

  // Host a custom private lobby with a room code (e.g. VALE-XXXX)
  async hostCustomRoom(user: UserProfile, roster: ArmyRoster, roomCode: string, mapId?: string) {
    return this.joinQueue(user, roster, 'custom_room', mapId, roomCode);
  },

  // Join a custom private lobby with a room code
  async joinCustomRoom(user: UserProfile, roster: ArmyRoster, roomCode: string) {
    return this.joinQueue(user, roster, 'custom_room', undefined, roomCode);
  },

  // Get current ticket status
  async getQueueStatus(ticketId: string): Promise<QueueTicket | null> {
    // 1. Try dev broker first
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await fetch(`/api/matchmaking/status?ticketId=${encodeURIComponent(ticketId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ticket) return json.ticket;
        }
      }
    } catch {
      // Fall through
    }

    // 2. Try Supabase fallback
    try {
      const { data } = await (supabase
        .from('matchmaking_queue') as any)
        .select('*')
        .eq('id', ticketId)
        .single();

      if (!data) return null;

      return {
        id: data.id,
        playerId: data.player_id,
        playerName: data.player_name || data.roster_data?.name || 'Commander',
        playerAvatar: '',
        factionId: data.faction_id,
        rosterId: data.roster_id,
        rosterData: data.roster_data,
        status: data.status,
        matchedWith: data.matched_with,
        matchedWithName: data.matched_with_name,
        matchedWithFaction: data.matched_with_faction,
        matchId: data.match_id,
        opponentRoster: data.opponent_roster,
        playerRole: data.player_role,
        mapId: data.map_id,
        queuedAt: data.queued_at
      };
    } catch {
      return null;
    }
  },

  // Leave Matchmaking Queue (MM-005)
  async leaveQueue(idOrPlayerId: string): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        await fetch('/api/matchmaking/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: idOrPlayerId, ticketId: idOrPlayerId })
        }).catch(() => {});
      }
    } catch {}

    try {
      await (supabase
        .from('matchmaking_queue') as any)
        .delete()
        .eq('player_id', idOrPlayerId);
      await (supabase
        .from('matchmaking_queue') as any)
        .delete()
        .eq('id', idOrPlayerId);
      return true;
    } catch {
      return false;
    }
  },

  // Poll or listen for matching updates (MM-004 / MM-006)
  subscribeToTicket(ticketId: string, onMatched: (ticket: QueueTicket) => void): () => void {
    let isCancelled = false;

    // Check status via dev broker / Supabase
    const checkStatus = async () => {
      if (isCancelled) return;
      try {
        const ticket = await this.getQueueStatus(ticketId);
        if (ticket && ticket.status === 'matched') {
          onMatched(ticket);
          isCancelled = true;
        }
      } catch {}
    };

    // Fast active polling (500ms) to ensure instant pairing across ports 5173 & 5174
    const interval = setInterval(checkStatus, 500);

    // Also listen to Supabase realtime channel if available
    let channel: any = null;
    try {
      channel = supabase.channel(`queue_${ticketId}`);
      channel
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matchmaking_queue', filter: `id=eq.${ticketId}` }, (payload: any) => {
          if (payload.new?.status === 'matched' && !isCancelled) {
            isCancelled = true;
            onMatched({
              id: ticketId,
              playerId: payload.new.player_id,
              playerName: payload.new.player_name || payload.new.roster_data?.name || 'Commander',
              playerAvatar: '',
              factionId: payload.new.faction_id,
              rosterId: payload.new.roster_id,
              rosterData: payload.new.roster_data,
              status: 'matched',
              matchedWith: payload.new.matched_with,
              matchedWithName: payload.new.matched_with_name,
              matchedWithFaction: payload.new.matched_with_faction,
              matchId: payload.new.match_id,
              opponentRoster: payload.new.opponent_roster,
              playerRole: payload.new.player_role,
              queuedAt: payload.new.queued_at
            });
          }
        })
        .subscribe();
    } catch {}

    return () => {
      isCancelled = true;
      clearInterval(interval);
      if (channel) {
        try { channel.unsubscribe(); } catch {}
      }
    };
  },

  // Realtime battle synchronization between players
  async sendBattleAction(matchId: string, action: any): Promise<void> {
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        await fetch('/api/matchmaking/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, action })
        });
      }
    } catch {}
  },

  async getBattleActions(matchId: string, since: number = 0): Promise<any[]> {
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await fetch(`/api/matchmaking/actions?matchId=${encodeURIComponent(matchId)}&since=${since}`);
        if (res.ok) {
          const json = await res.json();
          return json.actions || [];
        }
      }
    } catch {}
    return [];
  }
};
