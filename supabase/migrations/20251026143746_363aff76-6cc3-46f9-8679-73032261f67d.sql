-- Fix infinite recursion causing stack depth errors when inserting entries
-- 1) Harden trigger function with SECURITY DEFINER and stable search_path
CREATE OR REPLACE FUNCTION public.trigger_recalculate_ranks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalculate_ranks(OLD.leaderboard_id);
        RETURN OLD;
    ELSE
        PERFORM public.recalculate_ranks(NEW.leaderboard_id);
        RETURN NEW;
    END IF;
END;
$$;

-- 2) Reduce writes in recalculate_ranks to only rows with changed rank
CREATE OR REPLACE FUNCTION public.recalculate_ranks(leaderboard_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    WITH ranked_entries AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC) AS new_rank
        FROM public.entries
        WHERE leaderboard_id = leaderboard_uuid
    )
    UPDATE public.entries e
    SET rank = r.new_rank
    FROM ranked_entries r
    WHERE e.id = r.id
      AND e.rank IS DISTINCT FROM r.new_rank;
END;
$$;

-- 3) Drop the broad trigger that causes recursive re-execution on any UPDATE
DROP TRIGGER IF EXISTS trigger_recalculate_ranks_on_entries ON public.entries;

-- 4) Recreate a narrow trigger that only fires when relevant columns change
DROP TRIGGER IF EXISTS recalculate_ranks_trigger ON public.entries;
CREATE TRIGGER recalculate_ranks_trigger
AFTER INSERT OR UPDATE OF score, player_name
ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_ranks();