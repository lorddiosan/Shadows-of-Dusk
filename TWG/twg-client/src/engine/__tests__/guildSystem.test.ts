import { describe, it, expect, beforeEach } from 'vitest';
import { GuildService } from '../../services/guildService';
import { UserProfile } from '../../types/user';
import { safeStorage } from '../../services/supabaseClient';

describe('GLD-001 - GLD-005: Guild Management, Creation, and Alliance Operations', () => {
  const testUser: UserProfile = {
    id: 'usr_guild_tester_01',
    displayName: 'Warlord Kaelen',
    username: 'warlord_kaelen',
    email: 'kaelen@warpath.game',
    role: 'player',
    provider: 'guest',
    crystalShards: 1500,
    aetherCores: 200,
    level: 5,
    xp: 4000,
    unlockedItems: [],
    equippedBoardSkin: 'classic_grid',
    equippedDiceSkin: 'default_dice'
  };

  beforeEach(() => {
    safeStorage.removeItem('sod_guilds_v1');
  });

  it('retrieves default alliance guilds with upcoming events and members', () => {
    const guilds = GuildService.getGuilds();
    expect(guilds.length).toBeGreaterThanOrEqual(4);

    const ironVanguard = guilds.find(g => g.tag === 'IRON');
    expect(ironVanguard).toBeDefined();
    expect(ironVanguard?.name).toBe('The Iron Vanguard');
    expect(ironVanguard?.upcomingEvents.length).toBeGreaterThan(0);
    expect(ironVanguard?.members.length).toBeGreaterThan(0);
  });

  it('allows a commander to commission a new guild and sets them as leader', () => {
    const res = GuildService.createGuild(
      {
        name: 'Crimson Eclipse Covenant',
        tag: 'ECLP',
        crest: '🔮',
        motto: 'Shadows guide our blade.',
        description: 'Elite guild focused on Void Raids and tactical supremacy.',
        focus: 'raids',
        minRating: 1300
      },
      testUser
    );

    expect(res.error).toBeUndefined();
    expect(res.guild).toBeDefined();
    expect(res.guild.name).toBe('Crimson Eclipse Covenant');
    expect(res.guild.tag).toBe('ECLP');
    expect(res.guild.members[0].id).toBe(testUser.id);
    expect(res.guild.members[0].role).toBe('leader');
    expect(res.guild.upcomingEvents.length).toBeGreaterThan(0);
  });

  it('prevents duplicate guild tags during guild creation', () => {
    GuildService.createGuild(
      {
        name: 'First Blood Alliance',
        tag: 'BLOD',
        crest: '🩸',
        motto: 'First to fight.',
        description: 'Aggro squad.',
        focus: 'competitive',
        minRating: 1000
      },
      testUser
    );

    const duplicateRes = GuildService.createGuild(
      {
        name: 'Another Blood Alliance',
        tag: 'BLOD',
        crest: '🩸',
        motto: 'Copycat squad.',
        description: 'Duplicate tag.',
        focus: 'casual',
        minRating: 1000
      },
      testUser
    );

    expect(duplicateRes.error).toContain('already registered');
  });

  it('allows a commander to join an existing guild', () => {
    const guilds = GuildService.getGuilds();
    const targetGuild = guilds[0];
    const initialCount = targetGuild.members.length;

    const res = GuildService.joinGuild(targetGuild.id, testUser);
    expect(res.success).toBe(true);

    const updated = GuildService.getGuildById(targetGuild.id);
    expect(updated?.members.length).toBe(initialCount + 1);
    expect(updated?.members.some(m => m.id === testUser.id)).toBe(true);
  });

  it('allows a commander to depart a guild', () => {
    const guilds = GuildService.getGuilds();
    const targetGuild = guilds[0];

    // Join first
    GuildService.joinGuild(targetGuild.id, testUser);
    let check = GuildService.getGuildById(targetGuild.id);
    expect(check?.members.some(m => m.id === testUser.id)).toBe(true);

    // Leave
    const leaveRes = GuildService.leaveGuild(targetGuild.id, testUser.id);
    expect(leaveRes.success).toBe(true);

    check = GuildService.getGuildById(targetGuild.id);
    expect(check?.members.some(m => m.id === testUser.id)).toBe(false);
  });
});
