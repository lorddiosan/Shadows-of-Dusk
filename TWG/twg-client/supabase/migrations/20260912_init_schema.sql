-- ============================================================================
-- SHADOWS OF DUSK (WARPATH) - CORE DATABASE SCHEMA & RLS POLICIES
-- Target Provider: Supabase (PostgreSQL 15+)
-- Description: Accounts, Profiles, Role-Based Access Control, Content, & Matchmaking
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PUBLIC PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/bottts/svg?seed=DuskCommander',
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
    crystal_shards INT NOT NULL DEFAULT 1000,
    aether_cores INT NOT NULL DEFAULT 100,
    level INT NOT NULL DEFAULT 1,
    xp INT NOT NULL DEFAULT 0,
    equipped_board_skin TEXT DEFAULT 'board_crimson_foundry',
    equipped_dice_skin TEXT DEFAULT 'dice_brass_steam',
    unlocked_items JSONB DEFAULT '["board_crimson_foundry", "dice_brass_steam"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. TRIGGER TO AUTOMATICALLY CREATE A PROFILE UPON USER SIGN UP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    clean_username TEXT;
    clean_display TEXT;
BEGIN
    clean_username := COALESCE(
        NEW.raw_user_meta_data->>'username', 
        SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::text FROM 1 FOR 4)
    );
    clean_display := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (id, username, display_name, role)
    VALUES (
        NEW.id,
        clean_username,
        clean_display,
        CASE 
            WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
            WHEN NEW.email LIKE '%@admin.warpath.game' THEN 'admin'
            ELSE 'player'
        END
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. FACTIONS & UNIT TEMPLATES TABLES
CREATE TABLE IF NOT EXISTS public.factions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    title TEXT,
    quote TEXT,
    symbol TEXT NOT NULL DEFAULT '⚔️',
    logo_url TEXT,
    lore_summary TEXT,
    leader_name TEXT,
    colors JSONB NOT NULL DEFAULT '{"primary":"#e11d48","secondary":"#0f172a","accent":"#f59e0b","border":"#e11d48"}'::jsonb,
    strengths TEXT[] DEFAULT '{}',
    faction_ability JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.unit_templates (
    template_id TEXT PRIMARY KEY,
    faction_id TEXT NOT NULL REFERENCES public.factions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Battleline',
    type TEXT NOT NULL DEFAULT 'Infantry',
    points INT NOT NULL DEFAULT 75,
    avatar TEXT DEFAULT '🛡️',
    token_image_url TEXT,
    base_shape TEXT DEFAULT 'circle',
    description TEXT,
    stats JSONB NOT NULL,
    passives TEXT[] DEFAULT '{}',
    traits TEXT[] DEFAULT '{}',
    abilities JSONB DEFAULT '[]'::jsonb,
    can_deploy_outside_zone BOOLEAN DEFAULT FALSE,
    carry_capacity INT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_faction ON public.unit_templates(faction_id);

-- 5. MATCHMAKING QUEUE TABLE (1v1 First-Available)
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    faction_id TEXT NOT NULL,
    roster_id TEXT NOT NULL,
    roster_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'matched', 'cancelled')),
    matched_with UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    match_id UUID,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    matched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_status_time ON public.matchmaking_queue(status, queued_at);

-- 6. MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID NOT NULL REFERENCES public.profiles(id),
    player2_id UUID NOT NULL REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    map_id TEXT DEFAULT 'desert_outpost',
    round INT NOT NULL DEFAULT 1,
    phase TEXT NOT NULL DEFAULT 'Deployment',
    active_player TEXT NOT NULL DEFAULT 'player1',
    player1_score INT NOT NULL DEFAULT 0,
    player2_score INT NOT NULL DEFAULT 0,
    winner_id UUID REFERENCES public.profiles(id),
    game_state_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_matches_players ON public.matches(player1_id, player2_id);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Anyone can view, users can update own (except role)
CREATE POLICY "Profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile except role" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND (
            role = (SELECT role FROM public.profiles WHERE id = auth.uid())
            OR public.is_admin()
        )
    );

CREATE POLICY "Admins can update any profile" 
    ON public.profiles FOR ALL 
    USING (public.is_admin());

-- Factions & Units: Public read, ADMIN ONLY write (AUTH-010)
CREATE POLICY "Content is viewable by all players" 
    ON public.factions FOR SELECT 
    USING (true);

CREATE POLICY "Unit templates viewable by all players" 
    ON public.unit_templates FOR SELECT 
    USING (true);

CREATE POLICY "Admins can modify factions" 
    ON public.factions FOR ALL 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can modify unit templates" 
    ON public.unit_templates FOR ALL 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Matchmaking: Players can view, insert, update own queue entry
CREATE POLICY "Users can view queue tickets" 
    ON public.matchmaking_queue FOR SELECT 
    USING (auth.uid() = player_id OR status = 'queued');

CREATE POLICY "Users can enter matchmaking queue" 
    ON public.matchmaking_queue FOR INSERT 
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can leave queue" 
    ON public.matchmaking_queue FOR UPDATE 
    USING (auth.uid() = player_id);

CREATE POLICY "Users can delete own queue ticket" 
    ON public.matchmaking_queue FOR DELETE 
    USING (auth.uid() = player_id);

-- Matches: Participants can view and update
CREATE POLICY "Match participants can view matches" 
    ON public.matches FOR SELECT 
    USING (auth.uid() = player1_id OR auth.uid() = player2_id OR public.is_admin());

CREATE POLICY "Match participants can update match state" 
    ON public.matches FOR UPDATE 
    USING (auth.uid() = player1_id OR auth.uid() = player2_id OR public.is_admin());
