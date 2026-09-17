export type GuildFocus = 'competitive' | 'casual' | 'raids' | 'doctrine';
export type GuildRole = 'leader' | 'officer' | 'member';

export interface GuildMember {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl: string;
  role: GuildRole;
  rating: number;
  contributionPoints: number;
  joinedAt: string;
  title?: string;
}

export interface GuildActivity {
  id: string;
  text: string;
  type: 'join' | 'level_up' | 'event' | 'trophy' | 'announcement';
  timestamp: string;
  icon?: string;
}

export interface GuildEvent {
  id: string;
  title: string;
  type: 'siege' | 'war' | 'raid' | 'tournament';
  scheduledDate: string;
  status: 'upcoming' | 'active' | 'completed';
  description: string;
  rewards: {
    shards: number;
    cores: number;
    trophyBadge?: string;
  };
  minParticipants: number;
}

export interface Guild {
  id: string;
  name: string;
  tag: string; // e.g. [CRIM], [VALE]
  crest: string; // Emoji or crest symbol
  description: string;
  motto: string;
  bannerTheme: string;
  focus: GuildFocus;
  level: number;
  xp: number;
  maxMembers: number;
  members: GuildMember[];
  minRating: number;
  isRecruiting: boolean;
  announcement?: string;
  createdAt: string;
  upcomingEvents: GuildEvent[];
  activityFeed: GuildActivity[];
}
