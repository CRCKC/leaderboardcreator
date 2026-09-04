import { Card } from "@/components/ui/card";
import { rankEntries } from "@/lib/ranking";

interface Entry {
  id: string;
  player_name: string;
  score: number;
}

interface LeaderboardCardProps {
  title: string;
  description?: string;
  entries: Entry[];
}

const LeaderboardCard = ({ title, description, entries }: LeaderboardCardProps) => {
  const rankedEntries = rankEntries(entries);

  return (
    <Card className="overflow-hidden border-border bg-card/50 backdrop-blur-sm">
      <div className="bg-gradient-primary p-6">
        <h2 className="text-2xl font-bold text-primary-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-primary-foreground/80 mt-1">{description}</p>
        )}
      </div>
      
      <div className="p-6">
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No entries yet</p>
        ) : (
          <div className="space-y-3">
            {rankedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-all"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground">
                  <span className="text-lg font-bold">#{entry.rank}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{entry.player_name}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{entry.score.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default LeaderboardCard;
