import { Guild, GuildMember } from '../types/guild';
import { UserProfile } from '../types/user';
import { safeStorage } from './supabaseClient';

const GUILDS_STORAGE_KEY = 'sod_guilds_v1';

const DEFAULT_GUILDS: Guild[] = [
  {
    id: 'guild_iron_vanguard',
    name: 'The Iron Vanguard',
    tag: 'IRON',
    crest: '⚙️',
    motto: 'Unbroken steel, unyielding resolve.',
    description: 'Premier competitive legion dedicated to disciplined formation tactics and siege operations. Preparing for Season 2 Guild Wars.',
    bannerTheme: 'from-orange-950 via-stone-900 to-zinc-950',
    focus: 'competitive',
    level: 5,
    xp: 6800,
    maxMembers: 30,
    minRating: 1400,
    isRecruiting: true,
    announcement: 'Weekly formation sparring drills every Saturday at 19:00 UTC. Be ready in the continuous canvas.',
    createdAt: '2026-01-10T12:00:00Z',
    members: [
      {
        id: 'usr_iron_lead',
        displayName: 'Forge-Baron Kroll',
        username: 'forge_kroll',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=ForgeKroll',
        role: 'leader',
        rating: 1945,
        contributionPoints: 4800,
        joinedAt: '2026-01-10T12:00:00Z',
        title: 'Supreme Forge-Master'
      },
      {
        id: 'usr_iron_off1',
        displayName: 'Siege-Captain Varek',
        username: 'varek_iron',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VarekIron',
        role: 'officer',
        rating: 1680,
        contributionPoints: 3200,
        joinedAt: '2026-01-12T14:00:00Z',
        title: 'Centurion of Bulwarks'
      },
      {
        id: 'usr_iron_mem1',
        displayName: 'Vanguard Thorne',
        username: 'thorne_steel',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThorneSteel',
        role: 'member',
        rating: 1520,
        contributionPoints: 1950,
        joinedAt: '2026-01-15T09:30:00Z',
        title: 'Heavy Lancer'
      }
    ],
    upcomingEvents: [
      {
        id: 'evt_siege_01',
        title: 'Siege of the Ashen Citadel',
        type: 'siege',
        scheduledDate: '2026-10-01T18:00:00Z',
        status: 'upcoming',
        description: 'Multi-guild territory raid against automaton fortresses with massive territorial shard bounties.',
        rewards: { shards: 1500, cores: 250, trophyBadge: '🏰' },
        minParticipants: 5
      },
      {
        id: 'evt_war_01',
        title: 'Convergence Guild Clash (Season 2 Preview)',
        type: 'war',
        scheduledDate: '2026-10-14T20:00:00Z',
        status: 'upcoming',
        description: 'Scheduled 5v5 guild war against rival alliance champions with global ladder ranking.',
        rewards: { shards: 2500, cores: 500, trophyBadge: '⚔️' },
        minParticipants: 5
      }
    ],
    activityFeed: [
      { id: 'act_1', text: 'Forge-Baron Kroll scheduled Siege of the Ashen Citadel', type: 'event', timestamp: '2 hours ago', icon: '📅' },
      { id: 'act_2', text: 'The Iron Vanguard reached Guild Level 5!', type: 'level_up', timestamp: '1 day ago', icon: '⭐' },
      { id: 'act_3', text: 'Vanguard Thorne contributed 500 Guild XP', type: 'trophy', timestamp: '2 days ago', icon: '🏆' }
    ]
  },
  {
    id: 'guild_twilight_eclipse',
    name: 'Order of the Twilight Eclipse',
    tag: 'NOCT',
    crest: '🔮',
    motto: 'From the shadows, enlightenment ascends.',
    description: 'Mystic alliance focused on arcane doctrines, stealth maneuvers, and upcoming Void Boss Raids.',
    bannerTheme: 'from-purple-950 via-indigo-950 to-zinc-950',
    focus: 'raids',
    level: 4,
    xp: 4900,
    maxMembers: 30,
    minRating: 1300,
    isRecruiting: true,
    announcement: 'Void rift anomalies detected in sector 4. Prepare shadow cultists and ranged skirmishers.',
    createdAt: '2026-01-20T10:00:00Z',
    members: [
      {
        id: 'usr_noct_lead',
        displayName: 'Void-Caller Malakor',
        username: 'malakor_void',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MalakorVoid',
        role: 'leader',
        rating: 2040,
        contributionPoints: 5200,
        joinedAt: '2026-01-20T10:00:00Z',
        title: 'Grand Hierophant'
      },
      {
        id: 'usr_noct_off1',
        displayName: 'Mistress of Whispers',
        username: 'whisper_noct',
        avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=WhisperNoct',
        role: 'officer',
        rating: 1910,
        contributionPoints: 3900,
        joinedAt: '2026-01-22T16:00:00Z',
        title: 'Shadow Weaver'
      }
    ],
    upcomingEvents: [
      {
        id: 'evt_raid_01',
        title: 'Abyssal Void Dragon Raid',
        type: 'raid',
        scheduledDate: '2026-10-05T19:00:00Z',
        status: 'upcoming',
        description: 'Cooperative guild boss raid facing an elder rift monstrosity.',
        rewards: { shards: 2000, cores: 300, trophyBadge: '🐉' },
        minParticipants: 4
      }
    ],
    activityFeed: [
      { id: 'act_n1', text: 'Mistress of Whispers joined the Order', type: 'join', timestamp: '3 days ago', icon: '👤' },
      { id: 'act_n2', text: 'Order unlocked the Void Banner relic', type: 'trophy', timestamp: '5 days ago', icon: '✨' }
    ]
  },
  {
    id: 'guild_crimson_warmasters',
    name: 'Crimson Warmasters',
    tag: 'WAR',
    crest: '🩸',
    motto: 'Victory is forged in discipline and sacrifice.',
    description: 'Elite competitive corps representing the Crimson Empire. Aggressive offensive tactics and relentless battlefield domination.',
    bannerTheme: 'from-red-950 via-rose-900 to-amber-950',
    focus: 'competitive',
    level: 7,
    xp: 9400,
    maxMembers: 35,
    minRating: 1500,
    isRecruiting: true,
    announcement: 'Roster validation check required for all members before seasonal ladder lock.',
    createdAt: '2026-01-05T08:00:00Z',
    members: [
      {
        id: 'usr_war_lead',
        displayName: 'Grand Warmaster Vane',
        username: 'kaelen_vane',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=CrimsonWarmachine',
        role: 'leader',
        rating: 2180,
        contributionPoints: 8500,
        joinedAt: '2026-01-05T08:00:00Z',
        title: 'Supreme Legatus'
      }
    ],
    upcomingEvents: [
      {
        id: 'evt_tourn_01',
        title: 'Warmaster Invitational Tournament',
        type: 'tournament',
        scheduledDate: '2026-10-20T17:00:00Z',
        status: 'upcoming',
        description: 'Single-elimination guild duel championship with title rewards.',
        rewards: { shards: 5000, cores: 1000, trophyBadge: '👑' },
        minParticipants: 8
      }
    ],
    activityFeed: [
      { id: 'act_w1', text: 'Grand Warmaster Vane reached 2,180 ELO', type: 'trophy', timestamp: '1 day ago', icon: '🏆' }
    ]
  },
  {
    id: 'guild_astraea_sentinels',
    name: 'Astraea Sunward Sentinels',
    tag: 'DAWN',
    crest: '🛡️',
    motto: 'The light shall never falter.',
    description: 'Noble champions dedicated to defense, tactical formations, and righteous battlefield valor.',
    bannerTheme: 'from-amber-950 via-yellow-900 to-amber-800',
    focus: 'doctrine',
    level: 6,
    xp: 7500,
    maxMembers: 30,
    minRating: 1200,
    isRecruiting: true,
    announcement: 'Training novice paladins every Thursday. Welcome to all defenders of the realm.',
    createdAt: '2026-01-15T11:00:00Z',
    members: [
      {
        id: 'usr_dawn_lead',
        displayName: 'High Justiciar Althea',
        username: 'althea_dawn',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AstraeaPaladin',
        role: 'leader',
        rating: 2095,
        contributionPoints: 6100,
        joinedAt: '2026-01-15T11:00:00Z',
        title: 'Shield of the Sun'
      }
    ],
    upcomingEvents: [
      {
        id: 'evt_def_01',
        title: 'Fortress Sentinel Defense',
        type: 'siege',
        scheduledDate: '2026-10-08T18:00:00Z',
        status: 'upcoming',
        description: 'Endurance challenge defending holy shrines against endless waves.',
        rewards: { shards: 1800, cores: 200, trophyBadge: '☀️' },
        minParticipants: 4
      }
    ],
    activityFeed: [
      { id: 'act_d1', text: 'Guild reached 7,500 Guild XP', type: 'level_up', timestamp: '2 days ago', icon: '⭐' }
    ]
  }
];

export const GuildService = {
  getGuilds(): Guild[] {
    const raw = safeStorage.getItem(GUILDS_STORAGE_KEY);
    if (!raw) {
      safeStorage.setItem(GUILDS_STORAGE_KEY, JSON.stringify(DEFAULT_GUILDS));
      return JSON.parse(JSON.stringify(DEFAULT_GUILDS));
    }
    try {
      return JSON.parse(raw);
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_GUILDS));
    }
  },

  getGuildById(id: string): Guild | null {
    const guilds = this.getGuilds();
    return guilds.find(g => g.id === id) || null;
  },

  createGuild(
    data: {
      name: string;
      tag: string;
      crest: string;
      motto: string;
      description: string;
      focus: 'competitive' | 'casual' | 'raids' | 'doctrine';
      minRating: number;
    },
    founder: UserProfile
  ): { guild: Guild; error?: string } {
    const guilds = this.getGuilds();

    // Validate unique tag
    const cleanTag = data.tag.trim().toUpperCase();
    if (guilds.some(g => g.tag.toUpperCase() === cleanTag)) {
      return { guild: null as any, error: `Guild tag [${cleanTag}] is already registered` };
    }

    const newGuild: Guild = {
      id: 'guild_' + Math.random().toString(36).substring(2, 9),
      name: data.name.trim(),
      tag: cleanTag,
      crest: data.crest || '🛡️',
      motto: data.motto.trim() || 'Forged in convergence.',
      description: data.description.trim(),
      bannerTheme: 'from-red-950 via-zinc-900 to-amber-950',
      focus: data.focus || 'competitive',
      level: 1,
      xp: 0,
      maxMembers: 30,
      minRating: data.minRating || 0,
      isRecruiting: true,
      announcement: `Welcome to ${data.name}! Rally your forces for upcoming guild events.`,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: founder.id,
          displayName: founder.displayName,
          username: founder.username,
          avatarUrl: founder.avatarUrl,
          role: 'leader',
          rating: 1480,
          contributionPoints: 500,
          joinedAt: new Date().toISOString(),
          title: founder.title || 'Guild Founder'
        }
      ],
      upcomingEvents: [
        {
          id: 'evt_inaugural_' + Math.random().toString(36).substring(2, 7),
          title: `${data.name} Inaugural Skirmish`,
          type: 'war',
          scheduledDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: 'upcoming',
          description: 'First cooperative guild exercise to establish guild battle doctrine and earn guild rank.',
          rewards: { shards: 1000, cores: 150, trophyBadge: data.crest || '🏆' },
          minParticipants: 2
        }
      ],
      activityFeed: [
        {
          id: 'act_found_' + Date.now(),
          text: `${founder.displayName} commissioned ${data.name} [${cleanTag}]!`,
          type: 'announcement',
          timestamp: 'Just now',
          icon: '👑'
        }
      ]
    };

    guilds.unshift(newGuild);
    safeStorage.setItem(GUILDS_STORAGE_KEY, JSON.stringify(guilds));
    return { guild: newGuild };
  },

  joinGuild(guildId: string, user: UserProfile): { success: boolean; error?: string; guild?: Guild } {
    const guilds = this.getGuilds();
    const guild = guilds.find(g => g.id === guildId);

    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    if (guild.members.some(m => m.id === user.id)) {
      return { success: true, guild };
    }

    if (guild.members.length >= guild.maxMembers) {
      return { success: false, error: 'Guild is currently at maximum capacity' };
    }

    const newMember: GuildMember = {
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: 'member',
      rating: 1480,
      contributionPoints: 100,
      joinedAt: new Date().toISOString(),
      title: user.title || 'Guild Vanguard'
    };

    guild.members.push(newMember);
    guild.activityFeed.unshift({
      id: 'act_join_' + Date.now(),
      text: `${user.displayName} joined the guild`,
      type: 'join',
      timestamp: 'Just now',
      icon: '👤'
    });

    safeStorage.setItem(GUILDS_STORAGE_KEY, JSON.stringify(guilds));
    return { success: true, guild };
  },

  leaveGuild(guildId: string, userId: string): { success: boolean; error?: string } {
    const guilds = this.getGuilds();
    const guild = guilds.find(g => g.id === guildId);

    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }

    guild.members = guild.members.filter(m => m.id !== userId);
    guild.activityFeed.unshift({
      id: 'act_leave_' + Date.now(),
      text: `A commander departed the guild`,
      type: 'join',
      timestamp: 'Just now',
      icon: '🚪'
    });

    safeStorage.setItem(GUILDS_STORAGE_KEY, JSON.stringify(guilds));
    return { success: true };
  }
};
