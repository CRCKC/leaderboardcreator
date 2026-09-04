import { Trophy, Medal } from "lucide-react";
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-amber-300" strokeWidth={2.5} />;
    if (rank === 2) return <Medal className="h-6 w-6 text-slate-200" strokeWidth={2.5} />;
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-300" strokeWidth={2.5} />;
    return null;
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return "bg-amber-400/15 ring-1 ring-inset ring-amber-300/60";
    if (rank === 2) return "bg-slate-300/15 ring-1 ring-inset ring-slate-200/60";
    if (rank === 3) return "bg-orange-400/15 ring-1 ring-inset ring-orange-300/60";
    return "bg-muted text-muted-foreground";
  };

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
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getRankBadgeClass(entry.rank)}`}>
                  {getRankIcon(entry.rank) || <span className="text-lg font-bold">#{entry.rank}</span>}
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
