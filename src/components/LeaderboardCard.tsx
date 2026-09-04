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
    if (rank === 1) return <Trophy className="h-6 w-6 text-accent-foreground" strokeWidth={3} />;
    if (rank === 2) return <Medal className="h-6 w-6 text-slate-700" strokeWidth={3} />;
    if (rank === 3) return <Medal className="h-6 w-6 text-white" strokeWidth={3} />;
    return null;
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return "bg-gradient-gold text-accent-foreground font-bold";
    if (rank === 2) return "bg-gradient-silver text-foreground font-semibold";
    if (rank === 3) return "bg-gradient-bronze text-foreground font-semibold";
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
