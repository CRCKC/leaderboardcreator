-- Enable realtime for entries table
ALTER PUBLICATION supabase_realtime ADD TABLE public.entries;

-- Create trigger for recalculate_ranks if it doesn't exist
DROP TRIGGER IF EXISTS trigger_recalculate_ranks_on_entries ON public.entries;

CREATE TRIGGER trigger_recalculate_ranks_on_entries
AFTER INSERT OR UPDATE OR DELETE ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_ranks();