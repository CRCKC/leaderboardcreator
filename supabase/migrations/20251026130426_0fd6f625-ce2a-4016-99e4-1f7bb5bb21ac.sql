-- Drop the existing trigger first
DROP TRIGGER IF EXISTS recalculate_ranks_trigger ON public.entries;

-- Recreate the trigger to only fire on INSERT or when score/player_name changes
CREATE TRIGGER recalculate_ranks_trigger
AFTER INSERT OR UPDATE OF score, player_name
ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_ranks();