-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create leaderboards table
CREATE TABLE public.leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- Leaderboards policies - readable by all, writable by admins only
CREATE POLICY "Anyone can view leaderboards"
ON public.leaderboards
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Admins can insert leaderboards"
ON public.leaderboards
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update leaderboards"
ON public.leaderboards
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete leaderboards"
ON public.leaderboards
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create entries table
CREATE TABLE public.entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id UUID REFERENCES public.leaderboards(id) ON DELETE CASCADE NOT NULL,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- Entries policies - readable by all, writable by admins only
CREATE POLICY "Anyone can view entries"
ON public.entries
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Admins can insert entries"
ON public.entries
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update entries"
ON public.entries
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete entries"
ON public.entries
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for better query performance
CREATE INDEX idx_entries_leaderboard_score ON public.entries(leaderboard_id, score DESC);

-- Function to auto-update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_leaderboards_updated_at
    BEFORE UPDATE ON public.leaderboards
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_entries_updated_at
    BEFORE UPDATE ON public.entries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to recalculate ranks for a leaderboard
CREATE OR REPLACE FUNCTION public.recalculate_ranks(leaderboard_uuid UUID)
RETURNS VOID AS $$
BEGIN
    WITH ranked_entries AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC) as new_rank
        FROM public.entries
        WHERE leaderboard_id = leaderboard_uuid
    )
    UPDATE public.entries e
    SET rank = r.new_rank
    FROM ranked_entries r
    WHERE e.id = r.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to recalculate ranks after insert/update/delete
CREATE OR REPLACE FUNCTION public.trigger_recalculate_ranks()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalculate_ranks(OLD.leaderboard_id);
        RETURN OLD;
    ELSE
        PERFORM public.recalculate_ranks(NEW.leaderboard_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_ranks_on_change
    AFTER INSERT OR UPDATE OR DELETE ON public.entries
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_recalculate_ranks();