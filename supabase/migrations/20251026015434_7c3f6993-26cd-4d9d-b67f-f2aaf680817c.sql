-- Drop the duplicate trigger that's causing stack overflow
DROP TRIGGER IF EXISTS recalculate_ranks_on_change ON public.entries;

-- Fix security issues: Add SET search_path to security definer functions
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_ranks(leaderboard_uuid UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;