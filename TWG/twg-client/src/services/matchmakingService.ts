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
  queuedAt: string;
}

export const MatchmakingService = {
  // Join 1v1 Matchmaking Queue (MM-002)
  async joinQueue(user: UserProfile, roster: ArmyRoster): Promise<{ ticket: QueueTicket | null; error: Error | null }> {
    try {
      // First clean up any stale or lingering tickets for this player
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
        queuedAt: new Date().toISOString()
      };

      // Insert to Supabase matchmaking_queue table
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

      // MM-003 & MM-004: Check if another opponent is already waiting in queue (First-Available Pairing)
      const { data: waitingTickets } = await (supabase
        .from('matchmaking_queue') as any)
        .select('*')
        .eq('status', 'queued');

      const opponent = (waitingTickets || []).find((t: any) => t.player_id !== user.id && t.id !== ticketId);

      if (opponent) {
        // Match found! Form match record
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

        // Update opponent ticket
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

        // Update this player's ticket
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
      }

      return { ticket: newTicket, error: null };
    } catch (err: any) {
      return { ticket: null, error: err };
    }
  },

  // Get current ticket status
  async getQueueStatus(ticketId: string): Promise<QueueTicket | null> {
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
        queuedAt: data.queued_at
      };
    } catch {
      return null;
    }
  },

  // Leave Matchmaking Queue (MM-005)
  async leaveQueue(idOrPlayerId: string): Promise<boolean> {
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

    // Supabase Realtime channel subscription
    const channel = supabase.channel(`queue_${ticketId}`);
    channel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matchmaking_queue', filter: `id=eq.${ticketId}` }, (payload: any) => {
        if (payload.new?.status === 'matched') {
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
            queuedAt: payload.new.queued_at
          });
        }
      })
      .subscribe();

    // Secondary active interval polling check to ensure compatibility with local mock and network drops
    const interval = setInterval(async () => {
      if (isCancelled) return;
      try {
        const { data } = await (supabase
          .from('matchmaking_queue') as any)
          .select('*')
          .eq('id', ticketId)
          .single();

        if (data && data.status === 'matched') {
          onMatched({
            id: ticketId,
            playerId: data.player_id,
            playerName: data.roster_data?.name || 'Commander',
            playerAvatar: '',
            factionId: data.faction_id,
            rosterId: data.roster_id,
            rosterData: data.roster_data,
            status: 'matched',
            matchedWith: data.matched_with,
            matchId: data.match_id,
            queuedAt: data.queued_at
          });
          clearInterval(interval);
        }
      } catch {
        // ignore
      }
    }, 1000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      channel.unsubscribe();
    };
  }
};
